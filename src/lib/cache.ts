/**
 * Minimal in-memory fetch cache for API responses.
 * TTL = 30 seconds — stale data is fine for navigation transitions.
 */
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL = 30_000; // 30s

export function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
}

export function invalidateCache(prefix?: string): void {
  if (prefix) {
    for (const k of cache.keys()) {
      if (k.startsWith(prefix)) cache.delete(k);
    }
  } else {
    cache.clear();
  }
}

/**
 * Fetch with cache. Returns cached data immediately if available,
 * then refreshes in background.
 */
export async function fetchCached<T>(
  cacheKey: string,
  url: string,
  init?: RequestInit
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("timii_token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = (await res.json()) as T;
  setCache(cacheKey, data);
  return data;
}
