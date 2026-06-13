// Persist the in-progress series-style training set across page refreshes.
// These are image blobs (dozens, ~1MB each) — too large/numerous for localStorage —
// so we use IndexedDB. Everything is scoped by seriesId. The matrix (house style +
// scene rows) is stored as a single "meta" record per series.

export interface TrainItem {
  id: string;
  seriesId: string;
  blob: Blob;
  rowId?: string;
  rowLabel?: string;
  prompt?: string;
  keep: boolean;            // false = rejected, excluded from training
  source: 'gen' | 'manual';
  createdIndex: number;     // stable ordering
}

export interface TrainMeta { houseStyle?: string; rows?: unknown }

const DB = 'wordwerx-trainset';
const ITEMS = 'items';
const META = 'meta';

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains(ITEMS)) db.createObjectStore(ITEMS, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'k' });
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

function run<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(db => new Promise<T>((res, rej) => {
    const req = fn(db.transaction(store, mode).objectStore(store));
    req.onsuccess = () => res(req.result as T);
    req.onerror = () => rej(req.error);
  }));
}

export async function putItem(it: TrainItem): Promise<void> { await run(ITEMS, 'readwrite', s => s.put(it)); }
export async function deleteItem(id: string): Promise<void> { await run(ITEMS, 'readwrite', s => s.delete(id)); }

export async function allItems(seriesId: string): Promise<TrainItem[]> {
  const all = await run<TrainItem[]>(ITEMS, 'readonly', s => s.getAll());
  return (all || []).filter(i => i.seriesId === seriesId).sort((a, b) => a.createdIndex - b.createdIndex);
}

export async function putMeta(seriesId: string, data: TrainMeta): Promise<void> {
  await run(META, 'readwrite', s => s.put({ k: seriesId, ...data }));
}
export async function getMeta(seriesId: string): Promise<TrainMeta | undefined> {
  return run<TrainMeta | undefined>(META, 'readonly', s => s.get(seriesId));
}
