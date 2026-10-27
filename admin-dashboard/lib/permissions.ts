export type AdminLevel = 'super_admin' | 'moderator' | 'support' | 'finance' | 'analyst';
export type Permission = 'applications.review' | 'providers.suspend' | 'users.suspend' | 'reviews.moderate' | 'categories.manage' | 'community.moderate' | 'community.privileges' | 'reports.resolve' | 'notifications.send' | 'campaigns.manage' | 'payments.view' | 'analytics.view' | 'admins.manage' | 'audit.view';
export const PERMISSION_MATRIX: Record<AdminLevel, readonly Permission[] | '*'> = {
  super_admin: '*',
  moderator: ['applications.review', 'providers.suspend', 'users.suspend', 'reviews.moderate', 'categories.manage', 'community.moderate', 'community.privileges', 'reports.resolve', 'notifications.send', 'audit.view'],
  support: ['applications.review', 'reports.resolve', 'notifications.send', 'audit.view'],
  finance: ['payments.view', 'analytics.view', 'audit.view'],
  analyst: ['analytics.view', 'audit.view'],
};
export function can(level: AdminLevel | undefined, permission: Permission) {
  if (!level) return false;
  const allowed = PERMISSION_MATRIX[level];
  return allowed === '*' || allowed.includes(permission);
}
