begin;

-- Provider workspaces are provisioned or assigned by administrators during
-- prelaunch. Authentication alone must never grant the ability to create a
-- provider identity and enter the provider dashboard.
drop policy if exists "Owners create provider" on public.providers;
drop policy if exists "Admins create providers" on public.providers;
create policy "Admins create providers"
on public.providers
for insert
to authenticated
with check (public.is_admin());

commit;
