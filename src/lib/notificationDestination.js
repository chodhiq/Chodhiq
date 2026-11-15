export function notificationDestination(data, userId) {
  if (!userId || (data?.userId && data.userId !== userId)) return null;
  const entityType = data?.entityType || data?.entity_type;
  const entityId = data?.entityId || data?.entity_id;
  if (
    entityType === 'community_post' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(entityId || '')
  )
    return {
      route: 'MainTabs',
      params: {
        screen: 'CommunityTab',
        params: {
          postId: entityId,
          ...(['community_comment', 'community_reply'].includes(data?.type)
            ? { openComments: true }
            : {}),
        },
      },
    };
  return { route: 'Notifications' };
}
