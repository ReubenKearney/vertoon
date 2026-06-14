// Frontend wrapper for the companion server's lore CRUD (/api/lore). The lore
// markdown files are the source of truth; these calls read and mutate them
// live. The static src/lore.generated.ts bundle remains the offline fallback —
// the LoreView falls back to it when the server is unreachable (read-only).

export interface LoreEntity {
  id: string;
  type: string;
  name: string;
  aka?: string[];
  status?: string;
  version?: string | number;
  relationships?: { to: string; as: string }[];
  open_questions?: string[];
  role?: string;
  portrayal?: string[];
  location?: string;
  power?: string;
  threat?: string;
  population?: number;
  banner?: { primary?: string; secondary?: string };
  body?: string;
  file?: string;
}

async function jsonOrThrow(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as any).error || `${res.status} ${res.statusText}`);
  return body;
}

const q = (series: string) => `?series=${encodeURIComponent(series)}`;

/** Live entities for a series (validated server-side from the markdown files). */
export async function listLore(series: string): Promise<LoreEntity[]> {
  const body = await jsonOrThrow(await fetch(`/api/lore${q(series)}`)) as { entities: LoreEntity[] };
  return body.entities || [];
}

/** Create a new entity. Returns the full fresh entity list. */
export async function createLore(series: string, data: LoreEntity, body: string): Promise<LoreEntity[]> {
  const r = await jsonOrThrow(await fetch(`/api/lore${q(series)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, body }),
  })) as { entities: LoreEntity[] };
  return r.entities;
}

/** Update an existing entity (originalId may differ from data.id on a rename). */
export async function updateLore(series: string, originalId: string, data: LoreEntity, body: string): Promise<LoreEntity[]> {
  const r = await jsonOrThrow(await fetch(`/api/lore/${encodeURIComponent(originalId)}${q(series)}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data, body }),
  })) as { entities: LoreEntity[] };
  return r.entities;
}

/** Delete an entity. Rejected (409) by the server if another entity references it. */
export async function deleteLore(series: string, id: string): Promise<LoreEntity[]> {
  const r = await jsonOrThrow(await fetch(`/api/lore/${encodeURIComponent(id)}${q(series)}`, {
    method: 'DELETE',
  })) as { entities: LoreEntity[] };
  return r.entities;
}
