begin;

alter table public.provider_reports
  drop constraint if exists provider_reports_status_allowed;
alter table public.provider_reports
  add constraint provider_reports_status_allowed
  check (status in ('open','reviewing','actioned','dismissed')) not valid;

drop policy if exists "Admins manage provider reports" on public.provider_reports;
create policy "Admins manage provider reports" on public.provider_reports
for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage community reports" on public.community_post_reports;
create policy "Admins manage community reports" on public.community_post_reports
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant select, update on public.provider_reports, public.community_post_reports to authenticated;
grant update (status) on public.community_posts to authenticated;

drop policy if exists "Public reads providers" on public.providers;
drop policy if exists "Public reads active providers" on public.providers;
drop policy if exists "Authenticated reads permitted providers" on public.providers;
create policy "Public reads active providers" on public.providers for select to anon
using (verification_status <> 'suspended');
create policy "Authenticated reads permitted providers" on public.providers for select to authenticated
using (verification_status <> 'suspended' or owner_id=auth.uid() or public.is_admin());

create index if not exists provider_reports_status_created_idx
  on public.provider_reports(status, created_at desc);
create index if not exists community_post_reports_status_created_idx
  on public.community_post_reports(status, created_at desc);

commit;
