-- Dashboard production-readiness invariants.
-- Apply after schema.sql, community_monetization.sql, dashboard_backend.sql,
-- and 20260812_security_hardening.sql.

begin;

-- Authenticated dashboards need these non-secret placement fields. RLS still
-- determines which rows can be changed, and owners cannot edit them.
grant select (sponsored_rank, sponsored_until) on public.providers to authenticated;

-- Keep the provider summary columns consistent with the canonical reviews.
create or replace function public.refresh_provider_rating(target_provider uuid)
returns void
language sql
security definer
set search_path = pg_catalog, public
as $$
  update public.providers p
  set avg_rating = coalesce(s.average_rating, 0),
      review_count = coalesce(s.total_reviews, 0),
      updated_at = now()
  from (
    select target_provider as provider_id,
           round(avg(r.rating)::numeric, 1) as average_rating,
           count(r.id)::integer as total_reviews
    from public.reviews r
    where r.provider_id = target_provider
  ) s
  where p.id = s.provider_id
$$;

create or replace function public.sync_provider_rating_from_review()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_provider_rating(old.provider_id);
    return old;
  end if;
  perform public.refresh_provider_rating(new.provider_id);
  if tg_op = 'UPDATE' and old.provider_id is distinct from new.provider_id then
    perform public.refresh_provider_rating(old.provider_id);
  end if;
  return new;
end
$$;

drop trigger if exists sync_provider_rating_trigger on public.reviews;
create trigger sync_provider_rating_trigger
after insert or update of rating, provider_id or delete on public.reviews
for each row execute function public.sync_provider_rating_from_review();

-- Reconcile existing provider summaries once when this migration is applied.
update public.providers p
set avg_rating = coalesce(s.average_rating, 0),
    review_count = coalesce(s.total_reviews, 0),
    updated_at = now()
from (
  select p2.id as provider_id,
         round(avg(r.rating)::numeric, 1) as average_rating,
         count(r.id)::integer as total_reviews
  from public.providers p2
  left join public.reviews r on r.provider_id = p2.id
  group by p2.id
) s
where p.id = s.provider_id;

-- Do not add a unique constraint because historical duplicate rows may exist.
-- This trigger blocks new duplicates while allowing administrators to repair old data.
create or replace function public.prevent_duplicate_provider_owner()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.owner_id is not null and not public.is_admin() and exists (
    select 1 from public.providers p
    where p.owner_id = new.owner_id and p.id is distinct from new.id
  ) then
    raise exception 'This account already has a business workspace' using errcode = '23505';
  end if;
  return new;
end
$$;

drop trigger if exists prevent_duplicate_provider_owner_trigger on public.providers;
create trigger prevent_duplicate_provider_owner_trigger
before insert or update of owner_id on public.providers
for each row execute function public.prevent_duplicate_provider_owner();

-- Suspension revokes app visibility immediately. Stripe cancellation/refund remains
-- an explicit administrative billing action and is never inferred by a DB trigger.
create or replace function public.revoke_suspended_provider_visibility()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.verification_status = 'suspended'
     and old.verification_status is distinct from new.verification_status then
    new.sponsored_rank := 0;
    new.sponsored_until := null;
    update public.provider_entitlements
    set offers_active = false,
        search_tier = 0,
        updated_at = now()
    where provider_id = new.id;
  end if;
  return new;
end
$$;

drop trigger if exists revoke_suspended_provider_visibility_trigger on public.providers;
create trigger revoke_suspended_provider_visibility_trigger
before update of verification_status on public.providers
for each row execute function public.revoke_suspended_provider_visibility();

commit;
