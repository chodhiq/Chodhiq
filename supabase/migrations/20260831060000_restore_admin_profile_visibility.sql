-- Ensure administrators can inspect member profiles while ordinary users remain self-scoped.
drop policy if exists "Admins read profiles" on public.profiles;
create policy "Admins read profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());
