create or replace function public.admin_has_permission(permission_name text)
returns boolean
language sql
stable
security definer
set search_path to 'pg_catalog', 'auth'
as $function$
  with current_admin as (
    select
      u.raw_app_meta_data ->> 'role' as role,
      u.raw_app_meta_data ->> 'admin_level' as admin_level
    from auth.users u
    where u.id = (select auth.uid())
  )
  select coalesce((
    select role = 'admin' and admin_level is not null and (
      admin_level = 'super_admin'
      or (admin_level = 'moderator' and permission_name in (
        'applications.review', 'providers.suspend', 'users.suspend',
        'reviews.moderate', 'categories.manage', 'community.moderate',
        'community.privileges', 'reports.resolve', 'notifications.send',
        'audit.view'
      ))
      or (admin_level = 'support' and permission_name in (
        'applications.review', 'reports.resolve', 'notifications.send',
        'audit.view'
      ))
      or (admin_level = 'finance' and permission_name in (
        'payments.view', 'analytics.view', 'audit.view'
      ))
      or (admin_level = 'analyst' and permission_name in (
        'analytics.view', 'audit.view'
      ))
    )
    from current_admin
  ), false)
$function$;