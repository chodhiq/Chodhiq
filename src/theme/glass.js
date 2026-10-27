// Cross-platform frosted material colors. Keep opaque enough for readable text.
export function glassColors(isDark) {
  return {
    backgroundColor: isDark ? 'rgba(13,17,15,0.92)' : 'rgba(255,255,255,0.86)',
    borderColor: isDark ? 'rgba(224,255,236,0.12)' : 'rgba(255,255,255,0.9)',
  };
}
