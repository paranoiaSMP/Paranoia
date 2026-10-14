const TTL_MS = 60_000;

type Entry = { at: number; value: Promise<unknown> };
const g = globalThis as unknown as { __cache?: { version: number; map: Map<string, Entry> } };
const store = (g.__cache ??= { version: 0, map: new Map() });

export function memo<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = store.map.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>;
  const value = loader();
  store.map.set(key, { at: Date.now(), value });
  value.catch(() => {
    if (store.map.get(key)?.value === value) store.map.delete(key);
  });
  return value;
}

export function invalidateCache() {
  store.version++;
  store.map.clear();
}

export const cacheVersion = () => store.version;
