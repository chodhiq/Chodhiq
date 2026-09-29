-- Review ownership is explicit: authors may correct or remove their own review.
-- Provider replies and moderation columns remain protected by existing policies.
drop policy if exists "Users update their own reviews" on public.reviews;
create policy "Users update their own reviews" on public.reviews
  for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own reviews" on public.reviews;
create policy "Users delete their own reviews" on public.reviews
  for delete
  using ((select auth.uid()) = user_id);

grant update (rating, comment) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;
