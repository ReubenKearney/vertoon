// Frontend wrapper for the companion server's offline-first asset/state store.
// The app holds compact /api/assets/<id> urls — never base64 — and hydrates
// persisted state + links on load so a refresh restores generated art.

export interface StoreLinks {
  characterLora: Record<string, { loraName: string; triggerWord?: string }>;
  characterPortrait: Record<string, string>;
  visdevVariant: Record<string, string>;
  visdevCanonical: Record<string, { v: string; assetId: string }>;
  panelImage: Record<string, string>;
  layerImage: Record<string, string>;
  locationAngles: Record<string, string[]>;
}
export interface StoreState {
  library: any[];
  appearance: Record<string, string>;
  visdevExtra: Record<string, any>;
  panels: any[];
  characters: any[];
  bible: Record<string, any>;
  seasons: any[];
  arcs: any[];
}

async function jsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any).error || `${res.status} ${res.statusText}`);
  return body;
}

/** Persist an image (data URL / base64 / s3 url) to the local store. Returns { id, url }. */
export async function saveAsset(image: string, origin?: unknown): Promise<{ id: string; url: string }> {
  return jsonOrThrow(await fetch('/api/assets', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image, origin }),
  })) as Promise<{ id: string; url: string }>;
}

/** Resolve an asset id (or already-resolved url) to an <img src>. */
export function assetUrl(idOrUrl?: string | null): string | undefined {
  if (!idOrUrl) return undefined;
  return idOrUrl.startsWith('/api/') || idOrUrl.startsWith('http') || idOrUrl.startsWith('data:')
    ? idOrUrl : `/api/assets/${idOrUrl}`;
}

/** Load a stored asset (by id or url) as a base64 data URL — for passing a
 *  saved image back to the worker as a reference (expression edit / perspective). */
export async function loadAssetDataUrl(idOrUrl: string): Promise<string> {
  const url = assetUrl(idOrUrl)!;
  if (url.startsWith('data:')) return url;
  const blob = await (await fetch(url)).blob();
  return await new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** Extract the asset id from an id or /api/assets/<id> url. */
export function assetIdOf(idOrUrl?: string): string | undefined {
  if (!idOrUrl) return undefined;
  const m = idOrUrl.match(/\/api\/assets\/([^/?#]+)/);
  return m ? m[1] : (idOrUrl.includes('/') ? undefined : idOrUrl);
}

// The series catalogue (list of series) is global, not per-series. Returns null
// until first seeded so the app knows to persist its built-in SERIES on first run.
export async function getCatalogue(): Promise<any[] | null> {
  const body = await jsonOrThrow(await fetch('/api/series')) as { series: any[] | null };
  return body.series ?? null;
}

export async function putCatalogue(series: any[]): Promise<void> {
  await jsonOrThrow(await fetch('/api/series', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ series }),
  }));
}

// State + links are namespaced per series; pass the active series id through to
// the companion server so a new series starts blank and doesn't share Echo's.
export async function getState(seriesId: string): Promise<{ links: StoreLinks; state: StoreState }> {
  return jsonOrThrow(await fetch(`/api/state?series=${encodeURIComponent(seriesId)}`)) as Promise<{ links: StoreLinks; state: StoreState }>;
}

export async function patchState(seriesId: string, patch: { links?: Partial<StoreLinks>; state?: Partial<StoreState> }): Promise<void> {
  await jsonOrThrow(await fetch(`/api/state?series=${encodeURIComponent(seriesId)}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  }));
}

export async function setLink(seriesId: string, category: keyof StoreLinks, key: string, value: unknown): Promise<void> {
  await jsonOrThrow(await fetch(`/api/links/${category}?series=${encodeURIComponent(seriesId)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key, value }),
  }));
}

export interface Health { ok: boolean; endpoint: boolean; s3: boolean; store: boolean; assetCount: number }
export async function getHealth(): Promise<Health> {
  return jsonOrThrow(await fetch('/api/health')) as Promise<Health>;
}
