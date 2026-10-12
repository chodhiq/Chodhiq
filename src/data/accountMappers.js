// @ts-check
/** @param {string | null | undefined} value */
export const formatReviewDate = (value) => {
  if (!value) return '';
  if (value === 'Today') return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

/** @param {any} row @param {any[]} providers */
export const formatQuote = (row, providers) => ({
  id: row.id,
  providerId: row.provider_id,
  providerName:
    providers.find((provider) => String(provider.id) === String(row.provider_id))?.name ||
    'Provider',
  message: row.message,
  status:
    row.status === 'opened'
      ? 'Opened in WhatsApp'
      : row.status === 'sent'
        ? 'Status unconfirmed'
        : row.status
          ? row.status[0].toUpperCase() + row.status.slice(1)
          : 'Status unconfirmed',
  createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Today',
  responseMessage: row.response_message || '',
  respondedAt: row.responded_at ? new Date(row.responded_at).toLocaleDateString() : null,
});

/** @param {any} row */
export const formatNotification = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  read: Boolean(row.read_at),
  time: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
  ...(row.type ? { type: row.type } : {}),
  ...(row.entity_type ? { entityType: row.entity_type } : {}),
  ...(row.entity_type === 'community_post' && row.entity_id
    ? { communityPostId: row.entity_id }
    : {}),
});

export const mapQuote = formatQuote;
export const mapNotification = formatNotification;

/** @param {any} row @param {any} user @param {string | null} [localAvatar] */
export function mapProfile(row = {}, user = {}, localAvatar = null) {
  return {
    name: row.full_name || row.name || user.user_metadata?.full_name || 'ChodhiQ member',
    email: user.email || '',
    phone: row.phone || '',
    location: row.city || row.location || 'Birmingham',
    avatarUri: localAvatar || row.avatar_url || row.avatarUri || null,
    memberSince: new Date(row.created_at || user.created_at || Date.now()).getFullYear().toString(),
  };
}
