type Entry<T> = {
  data?: T;
  updatedAt: number;
  pending?: Promise<T>;
};

const entries = new Map<string, Entry<unknown>>();

export function readCachedQuery<T>(key: string): T | undefined {
  return entries.get(key)?.data as T | undefined;
}

export async function cachedQuery<T>(
  key: string,
  load: () => Promise<T>,
  options: { force?: boolean; staleTime?: number; retries?: number } = {},
): Promise<T> {
  const existing = entries.get(key) as Entry<T> | undefined;
  const staleTime = options.staleTime ?? 30_000;
  if (!options.force && existing?.data !== undefined && Date.now() - existing.updatedAt < staleTime)
    return existing.data;
  if (existing?.pending) return existing.pending;

  const pending = (async () => {
    let lastError: unknown;
    const retries = options.retries ?? 2;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const data = await load();
        entries.set(key, { data, updatedAt: Date.now() });
        return data;
      } catch (error) {
        lastError = error;
        if (attempt < retries) await new Promise((resolve) => setTimeout(resolve, 200 * 2 ** attempt));
      }
    }
    if (existing?.data !== undefined) return existing.data;
    throw lastError;
  })();

  entries.set(key, { data: existing?.data, updatedAt: existing?.updatedAt ?? 0, pending });
  try {
    return await pending;
  } finally {
    const latest = entries.get(key) as Entry<T> | undefined;
    if (latest?.pending === pending)
      entries.set(key, { data: latest.data ?? existing?.data, updatedAt: latest.updatedAt });
  }
}

export function clearQueryCache() {
  entries.clear();
}
