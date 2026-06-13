// Build-time lore loader. Reads lore/<series>/**/*.md, validates each file's
// frontmatter against the schema, enforces a unique id namespace per series,
// and checks that every cross-reference (lore relationships + the ids the
// narrative/visual planes attach to) resolves to a real entity.
//
// This is the single point where the lore stops being "files" and becomes a
// typed, trustworthy bundle. It runs under tsx/node at build time; the slice's
// `gen` script calls loadAllLore() and writes lore.generated.ts.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { EntitySchema, type LoreEntity } from './_schema';

const LORE_ROOT = fileURLToPath(new URL('.', import.meta.url));

export interface SeriesLore {
  series: string;
  byId: Map<string, LoreEntity>;
  all: LoreEntity[];
}

export class LoreError extends Error {}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue; // skip _schema.ts, _index.ts, etc.
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.md') && name !== 'CONSOLIDATED.md') out.push(p);
  }
  return out;
}

// Series ids are the immediate child directories of lore/.
function seriesDirs(): string[] {
  return readdirSync(LORE_ROOT).filter((name) => {
    if (name.startsWith('_') || name.startsWith('.')) return false;
    try {
      return statSync(join(LORE_ROOT, name)).isDirectory();
    } catch {
      return false;
    }
  });
}

function loadSeries(series: string): SeriesLore {
  const dir = join(LORE_ROOT, series);
  const byId = new Map<string, LoreEntity>();
  const all: LoreEntity[] = [];

  for (const file of walk(dir)) {
    const rel = relative(LORE_ROOT, file).split(sep).join('/');
    const raw = readFileSync(file, 'utf8');
    const parsed = matter(raw);

    const result = EntitySchema.safeParse(parsed.data);
    if (!result.success) {
      const issues = result.error.issues
        .map((i) => `    ${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('\n');
      throw new LoreError(`Invalid lore frontmatter in ${rel}:\n${issues}`);
    }
    const data = result.data;

    if (byId.has(data.id)) {
      const other = byId.get(data.id)!.file;
      throw new LoreError(
        `Duplicate id "${data.id}" in series "${series}": ${rel} and ${other}`,
      );
    }

    const entity: LoreEntity = { data, body: parsed.content.trim(), series, file: rel };
    byId.set(data.id, entity);
    all.push(entity);
  }

  // Cross-reference integrity: every relationship target must be a real entity.
  for (const e of all) {
    for (const r of e.data.relationships) {
      if (!byId.has(r.to)) {
        throw new LoreError(
          `Dangling relationship in ${e.file}: "${e.data.id}" → "${r.to}" (no such entity in series "${series}")`,
        );
      }
    }
  }

  return { series, byId, all };
}

export function loadAllLore(): Map<string, SeriesLore> {
  const out = new Map<string, SeriesLore>();
  for (const series of seriesDirs()) out.set(series, loadSeries(series));
  return out;
}

// Validate that ids referenced by the narrative/visual planes exist in lore.
// `refs` is a flat list of {plane, id} the caller scrapes from BIBLE/VISDEV/etc.
// Returns the unresolved references rather than throwing, so the workbench can
// show them as warnings (a plate for a character with no bible, etc.).
export function findUnresolvedRefs(
  lore: SeriesLore,
  refs: Array<{ plane: string; id: string }>,
): Array<{ plane: string; id: string }> {
  return refs.filter((r) => !lore.byId.has(r.id));
}
