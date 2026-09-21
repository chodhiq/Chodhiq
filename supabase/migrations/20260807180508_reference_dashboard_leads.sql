-- Provider lead inbox permissions used by the reference dashboard.
-- Does not touch PostGIS extension-owned objects.

create policy "Provider owners read their leads"
on public.quote_requests
for select to authenticated
using (
  exists (
    select 1 from public.providers p
    where p.id = quote_requests.provider_id
      and (p.owner_id = (select auth.uid()) or public.is_admin())
  )
);

create policy "Provider owners update lead status"
on public.quote_requests
for update to authenticated
using (
  exists (
    select 1 from public.providers p
    where p.id = quote_requests.provider_id
      and (p.owner_id = (select auth.uid()) or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.providers p
    where p.id = quote_requests.provider_id
      and (p.owner_id = (select auth.uid()) or public.is_admin())
  )
);

grant select, update on public.quote_requests to authenticated;
;
