begin;

-- Category management is an administrator-only dashboard workflow. Public and
-- authenticated clients retain the existing read policy.
drop policy if exists "Admins manage categories" on public.categories;
create policy "Admins manage categories"
on public.categories
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant insert, update, delete on public.categories to authenticated;

-- Reviews remain customer-authored. Administrators may change only the
-- moderation state; the column grant prevents other review fields being
-- rewritten even when the row policy matches.
drop policy if exists "Admins moderate reviews" on public.reviews;
create policy "Admins moderate reviews"
on public.reviews
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

grant update (moderation_status) on public.reviews to authenticated;

-- Keep owner reply management unchanged and add a separate, explicit admin
-- deletion path for moderation. Existing table grants already include delete.
drop policy if exists "Admins delete review replies" on public.review_replies;
create policy "Admins delete review replies"
on public.review_replies
for delete
to authenticated
using (public.is_admin());

commit;
