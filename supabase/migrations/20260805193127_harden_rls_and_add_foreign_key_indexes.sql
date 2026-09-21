
alter function public.search_providers(text, text, text) set search_path = public, pg_temp;
create index if not exists providers_owner_idx on public.providers(owner_id);
create index if not exists provider_hours_provider_idx on public.provider_hours(provider_id);
create index if not exists services_provider_idx on public.services(provider_id);
create index if not exists reviews_user_idx on public.reviews(user_id);
create index if not exists saved_items_provider_idx on public.saved_items(provider_id);
create index if not exists quote_requests_user_idx on public.quote_requests(user_id);
create index if not exists quote_requests_provider_idx on public.quote_requests(provider_id);
create index if not exists bookings_user_idx on public.bookings(user_id);
create index if not exists bookings_provider_idx on public.bookings(provider_id);
create index if not exists bookings_service_idx on public.bookings(service_id);
create index if not exists recent_searches_user_idx on public.recent_searches(user_id);

drop policy "Users manage their own saved items" on public.saved_items;
create policy "Users manage their own saved items" on public.saved_items for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy "Users write their own reviews" on public.reviews;
create policy "Users write their own reviews" on public.reviews for insert
  with check ((select auth.uid()) = user_id);
drop policy "Users manage their own quote requests" on public.quote_requests;
create policy "Users manage their own quote requests" on public.quote_requests for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy "Users manage their own bookings" on public.bookings;
create policy "Users manage their own bookings" on public.bookings for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy "Users read their own profile" on public.profiles;
create policy "Users read their own profile" on public.profiles for select using ((select auth.uid()) = id);
drop policy "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles for update
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
drop policy "Users manage their own recent searches" on public.recent_searches;
create policy "Users manage their own recent searches" on public.recent_searches for all
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
;
