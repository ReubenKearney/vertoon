// Server-side lore store: the write half of the lore repository. The markdown
// files under lore/<series>/**/*.md are the source of truth; this module turns
// validated entity objects back into those files (matching the hand-authored
// frontmatter style), and after every write re-runs regenerate() so the bundle
// and CONSOLIDATED docs stay in lock-step. Every mutation is transactional: if
// the post-write validation/link-check fails, the file change is rolled back so
// the repo never lands in an inconsistent state.
//
// Consumed by server/index.ts behind /api/lore. The browser never imports this
// (it has no filesystem); it talks to the API via src/services/lore.ts.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EntitySchema } from './_schema';
import { loadSeries } from './_index';
import { regenerate } from './_emit';

const LORE_ROOT = fileURLToPath(new URL('.', import.meta.url));

// type -> folder. Mirrors the layout in lore/README.md. Unknown types fall back
// to the type name itself so new schema types work without touching this map.
const TYPE_DIR: Record<string, string> = {
  character: 'characters', city: 'cities', org: 'orgs', location: 'locations',
  tech: 'tech', food: 'food', story: 'story', glossary: 'glossary',
};
function typeDir(type: string) { return TYPE_DIR[type] || type; }
function entityPath(series: string, type: string, id: string) {
  return join(LORE_ROOT, series, typeDir(type), `${id}.md`);
}

// An error carrying an HTTP status so the server maps it to 400/404/409 rather
// than a blanket 500.
export class LoreHttpError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

// --- Frontmatter serialization (house style) ---------------------------------
// Bare scalar when it's unambiguous YAML, else double-quoted. Mirrors the look
// of the hand-authored files (bare names/roles, quoted open-questions, etc.).
const BARE = /^[\p{L}\p{N}][\p{L}\p{N} \-–—·'’.,/&()!?+%;=]*$/u;
function scalar(v: unknown): string {
  if (typeof v === 'number') return String(v);
  const s = String(v);
  if (s.length && BARE.test(s) && !/\s$/.test(s) && !/^(true|false|null|yes|no|on|off|~)$/i.test(s)) return s;
  return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
}
function flowArr(a: any[]) { return '[' + a.map(scalar).join(', ') + ']'; }

function frontmatter(d: any): string {
  const L: string[] = [];
  const kv = (k: string, v: unknown) => L.push(`${k}: ${scalar(v)}`);
  kv('id', d.id); kv('type', d.type); kv('name', d.name);
  if (d.type === 'character' && d.role) kv('role', d.role);
  L.push(`aka: ${flowArr(d.aka || [])}`);
  kv('status', d.status);
  if (d.version != null) kv('version', d.version);
  if (d.type === 'city') {
    for (const k of ['location', 'power', 'threat'] as const) if (d[k]) kv(k, d[k]);
    if (d.population != null) kv('population', d.population);
    if (d.banner && (d.banner.primary || d.banner.secondary)) {
      L.push('banner:');
      if (d.banner.primary) L.push(`  primary: ${scalar(d.banner.primary)}`);
      if (d.banner.secondary) L.push(`  secondary: ${scalar(d.banner.secondary)}`);
    }
  }
  if (d.relationships?.length) {
    L.push('relationships:');
    for (const r of d.relationships) L.push(`  - { to: ${scalar(r.to)}, as: ${scalar(r.as)} }`);
  } else {
    L.push('relationships: []');
  }
  if (d.type === 'character') {
    if (d.portrayal?.length) {
      L.push('portrayal:');
      for (const p of d.portrayal) L.push(`  - ${scalar(p)}`);
    } else {
      L.push('portrayal: []');
    }
  }
  if (d.open_questions?.length) {
    L.push('open_questions:');
    for (const q of d.open_questions) L.push(`  - ${scalar(q)}`);
  } else {
    L.push('open_questions: []');
  }
  return L.join('\n');
}

function buildFile(data: any, body: string): string {
  return `---\n${frontmatter(data)}\n---\n\n${(body || '').trim()}\n`;
}

// --- Read --------------------------------------------------------------------
export function listLore(series: string): any[] {
  let sl;
  try { sl = loadSeries(series); }
  catch (e: any) { throw new LoreHttpError(400, e.message); }
  return sl.all.map((e) => ({ ...e.data, body: e.body, file: e.file }));
}

// --- Create / update ---------------------------------------------------------
// originalId undefined => create; defined => update of that entity (which may
// rename its id or change its type, moving the file).
export function upsertLore(series: string, rawData: any, body = '', originalId?: string): any[] {
  const parsed = EntitySchema.safeParse(rawData);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
    throw new LoreHttpError(400, `Invalid lore: ${issues}`);
  }
  const data = parsed.data;
  const isCreate = !originalId;

  let sl;
  try { sl = loadSeries(series); }
  catch (e: any) { throw new LoreHttpError(400, e.message); }

  if (isCreate && sl.byId.has(data.id)) {
    throw new LoreHttpError(409, `An entity with id "${data.id}" already exists in "${series}".`);
  }
  if (!isCreate) {
    if (!sl.byId.has(originalId!)) throw new LoreHttpError(404, `No entity "${originalId}" in "${series}".`);
    if (data.id !== originalId && sl.byId.has(data.id)) {
      throw new LoreHttpError(409, `Cannot rename to "${data.id}" — that id is already taken in "${series}".`);
    }
  }

  const newPath = entityPath(series, data.type, data.id);
  const oldRel = isCreate ? undefined : sl.byId.get(originalId!)!.file;
  const oldPath = oldRel ? join(LORE_ROOT, oldRel) : undefined;

  // Snapshots for rollback.
  const newPrev = existsSync(newPath) ? readFileSync(newPath, 'utf8') : null;
  mkdirSync(dirname(newPath), { recursive: true });
  writeFileSync(newPath, buildFile(data, body));

  let removedOld: { path: string; content: string } | null = null;
  if (oldPath && resolve(oldPath) !== resolve(newPath)) {
    removedOld = { path: oldPath, content: readFileSync(oldPath, 'utf8') };
    rmSync(oldPath);
  }

  try {
    regenerate(); // re-validates everything incl. cross-references
  } catch (e: any) {
    if (newPrev != null) writeFileSync(newPath, newPrev); else rmSync(newPath, { force: true });
    if (removedOld) writeFileSync(removedOld.path, removedOld.content);
    throw new LoreHttpError(400, e.message);
  }
  return listLore(series);
}

// --- Delete ------------------------------------------------------------------
export function removeLore(series: string, id: string): any[] {
  let sl;
  try { sl = loadSeries(series); }
  catch (e: any) { throw new LoreHttpError(400, e.message); }
  const e = sl.byId.get(id);
  if (!e) throw new LoreHttpError(404, `No entity "${id}" in "${series}".`);

  const abs = join(LORE_ROOT, e.file);
  const content = readFileSync(abs, 'utf8');
  rmSync(abs);
  try {
    regenerate();
  } catch (err: any) {
    writeFileSync(abs, content); // a surviving entity still references this id
    throw new LoreHttpError(409, `Cannot delete "${id}": ${err.message}`);
  }
  return listLore(series);
}
