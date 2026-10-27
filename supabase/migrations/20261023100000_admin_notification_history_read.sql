begin;

drop policy if exists "Admins read notification history" on public.notifications;
create policy "Admins read notification history"
  on public.notifications
  for select
  to authenticated
  using (public.admin_has_permission('notifications.send'));

commit;
