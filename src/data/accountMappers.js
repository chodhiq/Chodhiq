// @ts-check
export const formatQuote = (row, providers) => ({
  id: row.id,
  providerId: row.provider_id,
  providerName:
    providers.find((provider) => String(provider.id) === String(row.provider_id))?.name ||
    'Provider',
  message: row.message,
  status: row.status ? row.status[0].toUpperCase() + row.status.slice(1) : 'Sent',
  createdAt: row.created_at ? new Date(row.created_at).toLocaleDateString() : 'Today',
  responseMessage: row.response_message || '',
  respondedAt: row.responded_at ? new Date(row.responded_at).toLocaleDateString() : null,
});

export const formatNotification = (row) => ({
  id: row.id,
  title: row.title,
  body: row.body,
  read: Boolean(row.read_at),
  time: row.created_at ? new Date(row.created_at).toLocaleDateString() : '',
});

export const mapQuote = formatQuote;
export const mapNotification = formatNotification;

export function mapProfile(row = {}, user = {}, localAvatar = null) {
  return {
    name: row.full_name || user.user_metadata?.full_name || 'ChodhiQ member',
    email: user.email || '',
    phone: row.phone || '',
    location: row.city || 'Birmingham',
    avatarUri: localAvatar || row.avatar_url || null,
    memberSince: new Date(row.created_at || user.created_at || Date.now()).getFullYear().toString(),
  };
}
