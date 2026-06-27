interface CacheEntry<T> {
  value: T
  expiresAt: number
}

const store = new Map<string, CacheEntry<unknown>>()

export async function getCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = store.get(key) as CacheEntry<T> | undefined
  if (entry && Date.now() < entry.expiresAt) return entry.value
  const value = await fetcher()
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
  return value
}
