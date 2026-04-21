type CacheEntry<T> = {
  data: T;
  expiry: number;
  lastAccessed: number;
};

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();

const DEFAULT_MAX_ENTRIES = 300;

function now() {
  return Date.now();
}

function isExpired(expiry: number) {
  return now() > expiry;
}

function pruneExpiredEntries() {
  for (const [key, entry] of memoryCache.entries()) {
    if (isExpired(entry.expiry)) {
      memoryCache.delete(key);
    }
  }
}

function pruneOverflow(maxEntries = DEFAULT_MAX_ENTRIES) {
  if (memoryCache.size <= maxEntries) {
    return;
  }

  const entries = [...memoryCache.entries()].sort(
    (a, b) => a[1].lastAccessed - b[1].lastAccessed
  );

  const removeCount = memoryCache.size - maxEntries;

  for (let i = 0; i < removeCount; i += 1) {
    memoryCache.delete(entries[i][0]);
  }
}

export function getCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);

  if (!entry) {
    return null;
  }

  if (isExpired(entry.expiry)) {
    memoryCache.delete(key);
    return null;
  }

  entry.lastAccessed = now();
  return entry.data as T;
}

export function setCache<T>(key: string, data: T, ttlSeconds = 60): void {
  pruneExpiredEntries();

  memoryCache.set(key, {
    data,
    expiry: now() + ttlSeconds * 1000,
    lastAccessed: now(),
  });

  pruneOverflow();
}

export function deleteCache(key: string): void {
  memoryCache.delete(key);
  inFlight.delete(key);
}

export function deleteCacheByPrefix(prefix: string): void {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }

  for (const key of inFlight.keys()) {
    if (key.startsWith(prefix)) {
      inFlight.delete(key);
    }
  }
}

export async function getOrSetCache<T>(
  key: string,
  loader: () => Promise<T>,
  ttlSeconds = 60
): Promise<T> {
  const cached = getCache<T>(key);

  if (cached !== null) {
    return cached;
  }

  const running = inFlight.get(key) as Promise<T> | undefined;

  if (running) {
    return running;
  }

  const promise = loader()
    .then((result) => {
      setCache(key, result, ttlSeconds);
      return result;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);

  return promise;
}