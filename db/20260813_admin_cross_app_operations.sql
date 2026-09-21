begin;

alter table public.reviews add column if not exists moderation_status text not null default 'published';
alter table public.reviews drop constraint if exists reviews_moderation_status_allowed;
alter table public.reviews add constraint reviews_moderation_status_allowed check (moderation_status in ('published','removed')) not valid;

drop policy if exists "Anyone can read reviews" on public.reviews;
drop policy if exists "Public reads published reviews" on public.reviews;
drop policy if exists "Authenticated reads permitted reviews" on public.reviews;
create policy "Public reads published reviews" on public.reviews for select to anon using (moderation_status='published');
create policy "Authenticated reads permitted reviews" on public.reviews for select to authenticated
using (moderation_status='published' or user_id=auth.uid() or public.is_admin() or public.owns_provider(provider_id));
drop policy if exists "Admins moderate reviews" on public.reviews;
create policy "Admins moderate reviews" on public.reviews for update to authenticated
using (public.is_admin()) with check (public.is_admin());
grant update (moderation_status) on public.reviews to authenticated;

create or replace function public.refresh_provider_rating(target_provider uuid)
returns void language sql security definer set search_path=pg_catalog,public as $$
  update public.providers p set avg_rating=coalesce(s.average_rating,0),review_count=coalesce(s.total_reviews,0),updated_at=now()
  from (select target_provider provider_id,round(avg(r.rating)::numeric,1) average_rating,count(r.id)::integer total_reviews
        from public.reviews r where r.provider_id=target_provider and r.moderation_status='published') s
  where p.id=s.provider_id
$$;
drop trigger if exists sync_provider_rating_trigger on public.reviews;
create trigger sync_provider_rating_trigger after insert or update of rating,provider_id,moderation_status or delete on public.reviews
for each row execute function public.sync_provider_rating_from_review();

drop policy if exists "Admins manage quote requests" on public.quote_requests;
drop policy if exists "Admins update quote requests" on public.quote_requests;
create policy "Admins manage quote requests" on public.quote_requests for select to authenticated using (public.is_admin());
create policy "Admins update quote requests" on public.quote_requests for update to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.quote_requests to authenticated;
grant update (status) on public.quote_requests to authenticated;

drop policy if exists "Admins read notification delivery" on public.notifications;
create policy "Admins read notification delivery" on public.notifications for select to authenticated using (public.is_admin());
grant select on public.notifications to authenticated;

create index if not exists reviews_moderation_created_idx on public.reviews(moderation_status,created_at desc);
create index if not exists quote_requests_status_created_idx on public.quote_requests(status,created_at desc);
create index if not exists notifications_created_idx on public.notifications(created_at desc);

commit;
