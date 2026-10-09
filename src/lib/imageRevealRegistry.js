export function imageIdentity(source) {
  if (typeof source === 'number') return `asset:${source}`;
  if (Array.isArray(source)) return source.map(imageIdentity).join('|');
  return source?.uri || '';
}

// Only editorial/hero images use this registry, never long-feed thumbnails.
export function createImageRevealRegistry(limit = 512) {
  const seen = new Set();
  return {
    has: (key) => !key || seen.has(key),
    mark(key) {
      if (!key || seen.has(key)) return;
      seen.add(key);
      if (seen.size > limit) seen.delete(seen.values().next().value);
    },
  };
}
