// Offline-first asset store. The companion server runs on localhost, so this
// on-disk store is what makes editing/preview/publish work without internet:
// generated image bytes are saved here and served at /api/assets/:id, and the
// app's state deltas + links persist in db.json so a refresh re-hydrates.
import { mkdirSync, existsSync } from 'node:fs';
import { readFile, writeFile, rename, unlink, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_DIR = process.env.STORE_DIR
  ? (process.env.STORE_DIR.match(/^([A-Za-z]:|\/)/) ? process.env.STORE_DIR : join(__dirname, '..', process.env.STORE_DIR))
  : join(__dirname, 'store');
const ASSETS_DIR = join(STORE_DIR, 'assets');
const DB_PATH = join(STORE_DIR, 'db.json');

mkdirSync(ASSETS_DIR, { recursive: true });

export interface AssetMeta { id: string; file: string; mime: string; origin?: unknown; createdAt: number }
export interface Links {
  characterLora: Record<string, { loraName: string; triggerWord?: string }>;
  characterPortrait: Record<string, string>;     // charId -> assetId
  visdevVariant: Record<string, string>;         // "subj:v" -> assetId
  visdevCanonical: Record<string, { v: string; assetId: string }>;
  panelImage: Record<string, string>;            // panelId -> assetId
  layerImage: Record<string, string>;            // "panelId:layerIdx" -> assetId
  locationAngles: Record<string, string[]>;      // subj -> assetId[]
}
export interface SeriesState {
  library: any[];
  appearance: Record<string, string>;
  visdevExtra: Record<string, any>;
  // Editable authoring content persisted per series so a new series — and its
  // cast/panels/bible edits — survive a reload (seeded blank for non-seed series).
  panels: any[];
  characters: any[];
  bible: Record<string, any>;
}
export interface SeriesEntry { links: Links; state: SeriesState }
export interface Db {
  // Assets are content-addressed blobs shared across series (links point into them).
  assets: Record<string, AssetMeta>;
  // The series catalogue (list of series metadata). null until first persisted;
  // the frontend seeds it from its built-in SERIES on first run.
  catalogue: any[] | null;
  // Everything else is namespaced by series id so a new series starts blank.
  series: Record<string, SeriesEntry>;
}

function emptySeries(): SeriesEntry {
  return {
    links: { characterLora: {}, characterPortrait: {}, visdevVariant: {}, visdevCanonical: {}, panelImage: {}, layerImage: {}, locationAngles: {} },
    state: { library: [], appearance: {}, visdevExtra: {}, panels: [], characters: [], bible: {} },
  };
}

const EMPTY: Db = { assets: {}, catalogue: null, series: {} };

let cache: Db | null = null;
let writing: Promise<void> = Promise.resolve();

// Normalize a raw db blob into the current per-series shape, migrating the old
// flat { assets, links, state } layout (single global series) into series.echo.
function normalizeDb(raw: any): Db {
  const db: Db = { assets: raw?.assets || {}, catalogue: raw?.catalogue ?? null, series: {} };
  if (raw && (raw.links || raw.state) && !raw.series) {
    // Legacy flat shape — everything belonged to the seed series.
    db.series.echo = mergeSeries(raw.links, raw.state);
  } else {
    for (const id of Object.keys(raw?.series || {})) {
      db.series[id] = mergeSeries(raw.series[id]?.links, raw.series[id]?.state);
    }
  }
  return db;
}

// Fill in any missing link categories / state fields on a series entry.
function mergeSeries(links: any, state: any): SeriesEntry {
  const base = emptySeries();
  return {
    links: { ...base.links, ...(links || {}) },
    state: { ...base.state, ...(state || {}) },
  };
}

// Get a series partition, creating an empty one on first access.
function seriesOf(db: Db, seriesId: string): SeriesEntry {
  return (db.series[seriesId] ||= emptySeries());
}

async function readDb(): Promise<Db> {
  if (cache) return cache;
  try {
    cache = normalizeDb(JSON.parse(await readFile(DB_PATH, 'utf8')));
  } catch { cache = structuredClone(EMPTY); }
  return cache!;
}

// Serialized atomic write (temp file + rename) — single-writer for one-user localhost.
function writeDb(db: Db): Promise<void> {
  cache = db;
  writing = writing.then(async () => {
    const tmp = DB_PATH + '.' + randomUUID() + '.tmp';
    await writeFile(tmp, JSON.stringify(db, null, 2));
    await rename(tmp, DB_PATH);
  }).catch(e => { console.error('[store] writeDb', e); });
  return writing;
}

const MIME_EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** Persist an image (data URL, raw base64, or http(s)/s3 url fetched through). */
export async function saveAsset(image: string, origin?: unknown): Promise<{ id: string; url: string }> {
  let mime = 'image/png';
  let buf: Buffer;
  if (/^https?:\/\//.test(image)) {
    const res = await fetch(image);
    if (!res.ok) throw new Error(`fetch asset ${res.status}`);
    mime = res.headers.get('content-type') || mime;
    buf = Buffer.from(await res.arrayBuffer());
  } else {
    const m = image.match(/^data:([^;]+);base64,(.*)$/s);
    if (m) { mime = m[1]; buf = Buffer.from(m[2], 'base64'); }
    else buf = Buffer.from(image, 'base64');
  }
  const id = randomUUID();
  const ext = MIME_EXT[mime] || 'png';
  const file = `${id}.${ext}`;
  await writeFile(join(ASSETS_DIR, file), buf);
  const db = await readDb();
  db.assets[id] = { id, file, mime, origin, createdAt: Date.now() };
  await writeDb(db);
  return { id, url: `/api/assets/${id}` };
}

export async function getAsset(id: string): Promise<{ path: string; mime: string } | null> {
  const db = await readDb();
  const a = db.assets[id];
  if (!a) return null;
  return { path: join(ASSETS_DIR, a.file), mime: a.mime };
}

export async function deleteAsset(id: string): Promise<void> {
  const db = await readDb();
  const a = db.assets[id];
  if (!a) return;
  await unlink(join(ASSETS_DIR, a.file)).catch(() => {});
  delete db.assets[id];
  await writeDb(db);
}

// The series catalogue is a single global list (not namespaced) — the set of
// series the workbench knows about. Returns null until the frontend seeds it.
export async function getCatalogue(): Promise<any[] | null> {
  return (await readDb()).catalogue;
}

export async function setCatalogue(catalogue: any[]): Promise<void> {
  const db = await readDb();
  db.catalogue = catalogue;
  await writeDb(db);
}

export async function getState(seriesId: string): Promise<{ links: Links; state: SeriesState }> {
  const db = await readDb();
  const s = seriesOf(db, seriesId);
  return { links: s.links, state: s.state };
}

/** Shallow-merge a {links?, state?} patch (one level into each category) for one series. */
export async function patchState(seriesId: string, patch: { links?: Partial<Links>; state?: Partial<SeriesState> }): Promise<void> {
  const db = await readDb();
  const s = seriesOf(db, seriesId);
  if (patch.state) for (const k of Object.keys(patch.state)) (s.state as any)[k] = (patch.state as any)[k];
  if (patch.links) for (const k of Object.keys(patch.links)) (s.links as any)[k] = { ...(s.links as any)[k], ...(patch.links as any)[k] };
  await writeDb(db);
}

const LINK_KEYS = ['characterLora', 'characterPortrait', 'visdevVariant', 'visdevCanonical', 'panelImage', 'layerImage', 'locationAngles'] as const;
export type LinkKey = typeof LINK_KEYS[number];
export function isLinkKey(k: string): k is LinkKey { return (LINK_KEYS as readonly string[]).includes(k); }

/** Set one entry in a series' link map, e.g. setLink('echo','characterLora','echo',{loraName,triggerWord}). */
export async function setLink(seriesId: string, category: LinkKey, key: string, value: unknown): Promise<void> {
  const db = await readDb();
  (seriesOf(db, seriesId).links as any)[category][key] = value;
  await writeDb(db);
}

export async function assetCount(): Promise<number> {
  try { return (await readdir(ASSETS_DIR)).length; } catch { return 0; }
}

export { STORE_DIR };
