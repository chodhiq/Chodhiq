export function mergeCommunityPage(previous, incoming, replace = false) {
  const merged = new Map((replace ? [] : previous).map((post) => [String(post.id), post]));
  incoming.forEach((post) => merged.set(String(post.id), post));
  return [...merged.values()].sort(
    (a, b) =>
      Date.parse(b.created_at) - Date.parse(a.created_at) ||
      String(b.id).localeCompare(String(a.id)),
  );
}
