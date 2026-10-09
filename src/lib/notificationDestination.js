export function notificationDestination(data, userId) {
  if (!userId || (data?.userId && data.userId !== userId)) return null;
  if (
    data?.entityType === 'community_post' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.entityId || '')
  )
    return { route: 'Community', params: { postId: data.entityId } };
  return { route: 'Notifications' };
}
