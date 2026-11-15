-- Reassert customer ownership boundaries for application-facing records.
-- This migration only changes schema metadata and policies; it does not move data.

-- Ensure the remotely managed button configuration table exists with read-only access
-- to the button kill-switch row. Configuration writes remain server/operator-only.
create table if not exists public.app_config (
  config_key text primary key,
  config_value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.app_config enable row level security;
revoke all on public.app_config from public, anon, authenticated;
grant select on public.app_config to anon, authenticated;
drop policy if exists "Public can read app config" on public.app_config;
-- Allow public clients to read only the non-secret button kill-switch config row.
create policy "Public can read app config"
  on public.app_config for select to anon, authenticated
  using (config_key = 'button_kill_switches');

-- Replace application-facing policies on these tables so legacy permissive policies
-- cannot widen the owner checks below. Service-role Edge Functions bypass RLS.
do $$
declare
  target_table text;
  existing_policy record;
begin
  foreach target_table in array array[
    'profiles', 'reviews', 'bookings', 'quote_requests', 'saved_items', 'notifications',
    'community_posts', 'community_comments', 'community_post_likes',
    'community_saved_posts', 'community_post_reports', 'community_user_blocks'
  ] loop
    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target_table
    loop
      execute format('drop policy %I on public.%I', existing_policy.policyname, target_table);
    end loop;
  end loop;
end $$;

alter table public.profiles enable row level security;
-- A user may create only a profile whose primary key is their authenticated user id.
create policy "Customer inserts own profile"
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));
-- A user may update only their own profile and cannot change its owner id.
create policy "Customer updates own profile"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
-- Preserve self-service profile reads for authenticated app users.
create policy "Customer reads own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

alter table public.reviews enable row level security;
-- Reviews remain publicly readable while the customer write policies below bind writes to user_id.
create policy "Anyone reads reviews"
  on public.reviews for select to anon, authenticated using (true);
-- A customer may create a review only under their own user id.
create policy "Customer inserts own reviews"
  on public.reviews for insert to authenticated
  with check (user_id = (select auth.uid()));
-- A customer may update only their own review and cannot transfer its ownership.
create policy "Customer updates own reviews"
  on public.reviews for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- A customer may delete only their own review.
create policy "Customer deletes own reviews"
  on public.reviews for delete to authenticated
  using (user_id = (select auth.uid()));

alter table public.bookings enable row level security;
-- A customer may read only bookings identified by their own user_id.
create policy "Customer reads own bookings"
  on public.bookings for select to authenticated using (user_id = (select auth.uid()));
-- A customer may create only bookings identified by their own user_id.
create policy "Customer inserts own bookings"
  on public.bookings for insert to authenticated
  with check (user_id = (select auth.uid()));
-- A customer may update only their own booking and cannot transfer ownership.
create policy "Customer updates own bookings"
  on public.bookings for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- A customer may delete only their own booking.
create policy "Customer deletes own bookings"
  on public.bookings for delete to authenticated using (user_id = (select auth.uid()));

alter table public.quote_requests enable row level security;
-- Quote requests are visible only to the customer who owns them.
create policy "Customer reads own quote requests"
  on public.quote_requests for select to authenticated using (user_id = (select auth.uid()));
-- A customer may create only quote requests under their own user id.
create policy "Customer inserts own quote requests"
  on public.quote_requests for insert to authenticated
  with check (user_id = (select auth.uid()));
-- A customer may update only their own quote requests and cannot transfer ownership.
create policy "Customer updates own quote requests"
  on public.quote_requests for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- A customer may delete only their own quote requests.
create policy "Customer deletes own quote requests"
  on public.quote_requests for delete to authenticated using (user_id = (select auth.uid()));

alter table public.saved_items enable row level security;
-- Saved businesses are visible only to their owning customer.
create policy "Customer reads own saved items"
  on public.saved_items for select to authenticated using (user_id = (select auth.uid()));
-- A customer may save a business only under their own user id.
create policy "Customer inserts own saved items"
  on public.saved_items for insert to authenticated
  with check (user_id = (select auth.uid()));
-- A customer may update only their own saved item and cannot transfer ownership.
create policy "Customer updates own saved items"
  on public.saved_items for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- A customer may remove only their own saved item.
create policy "Customer deletes own saved items"
  on public.saved_items for delete to authenticated using (user_id = (select auth.uid()));

alter table public.notifications enable row level security;
-- A customer may read only notifications addressed to their user id.
create policy "Customer reads own notifications"
  on public.notifications for select to authenticated using (user_id = (select auth.uid()));
-- Notification inserts are restricted to the addressed user (trusted server functions bypass RLS).
create policy "Customer inserts own notifications"
  on public.notifications for insert to authenticated
  with check (user_id = (select auth.uid()));
-- A customer may update only notifications addressed to them and cannot change ownership.
create policy "Customer updates own notifications"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- A customer may delete only notifications addressed to them.
create policy "Customer deletes own notifications"
  on public.notifications for delete to authenticated using (user_id = (select auth.uid()));

alter table public.community_posts enable row level security;
-- Community posts are readable by guests and signed-in users.
create policy "Everyone reads community posts"
  on public.community_posts for select to anon, authenticated using (true);
-- Signed-in users may publish only as themselves.
create policy "Authors insert own community posts"
  on public.community_posts for insert to authenticated
  with check (author_id = (select auth.uid()));
-- Only the author may update a post, and its author_id cannot be reassigned.
create policy "Authors update own community posts"
  on public.community_posts for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
-- Only the author may delete a post.
create policy "Authors delete own community posts"
  on public.community_posts for delete to authenticated
  using (author_id = (select auth.uid()));

alter table public.community_comments enable row level security;
-- A signed-in user may read only comments they authored.
create policy "Actors read own community comments"
  on public.community_comments for select to authenticated
  using (author_id = (select auth.uid()));
-- A signed-in user may create a comment only as themselves.
create policy "Actors insert own community comments"
  on public.community_comments for insert to authenticated
  with check (author_id = (select auth.uid()));
-- A signed-in user may update only their own comment without changing its author.
create policy "Actors update own community comments"
  on public.community_comments for update to authenticated
  using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));
-- A signed-in user may delete only their own comment.
create policy "Actors delete own community comments"
  on public.community_comments for delete to authenticated
  using (author_id = (select auth.uid()));

alter table public.community_post_likes enable row level security;
-- A user may read only their own like records.
create policy "Actors read own community likes"
  on public.community_post_likes for select to authenticated
  using (user_id = (select auth.uid()));
-- A user may create only a like attributed to themselves.
create policy "Actors insert own community likes"
  on public.community_post_likes for insert to authenticated
  with check (user_id = (select auth.uid()));
-- A user may remove only their own like.
create policy "Actors delete own community likes"
  on public.community_post_likes for delete to authenticated
  using (user_id = (select auth.uid()));

alter table public.community_saved_posts enable row level security;
-- A user may read only their own saved community posts.
create policy "Actors read own saved community posts"
  on public.community_saved_posts for select to authenticated
  using (user_id = (select auth.uid()));
-- A user may save a community post only as themselves.
create policy "Actors insert own saved community posts"
  on public.community_saved_posts for insert to authenticated
  with check (user_id = (select auth.uid()));
-- A user may update only their own saved community-post row.
create policy "Actors update own saved community posts"
  on public.community_saved_posts for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- A user may remove only their own saved community post.
create policy "Actors delete own saved community posts"
  on public.community_saved_posts for delete to authenticated
  using (user_id = (select auth.uid()));

alter table public.community_post_reports enable row level security;
-- A reporter may read only reports they submitted.
create policy "Actors read own community reports"
  on public.community_post_reports for select to authenticated
  using (reporter_id = (select auth.uid()));
-- A reporter may create a report only under their own identity.
create policy "Actors insert own community reports"
  on public.community_post_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
-- A reporter may update only their own report without changing its reporter.
create policy "Actors update own community reports"
  on public.community_post_reports for update to authenticated
  using (reporter_id = (select auth.uid()))
  with check (reporter_id = (select auth.uid()));
-- A reporter may delete only their own report.
create policy "Actors delete own community reports"
  on public.community_post_reports for delete to authenticated
  using (reporter_id = (select auth.uid()));

alter table public.community_user_blocks enable row level security;
-- A blocker may read only block records they created.
create policy "Actors read own community blocks"
  on public.community_user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
-- A blocker may create a block only as themselves.
create policy "Actors insert own community blocks"
  on public.community_user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
-- A blocker may remove only a block they created.
create policy "Actors delete own community blocks"
  on public.community_user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

-- Keep verification documents in a private bucket and scope every object operation
-- to the authenticated uploader's first storage path segment (user UUID).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-documents', 'verification-documents', false, 10485760,
        array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do update set public = false;

drop policy if exists "Owners upload verification files" on storage.objects;
drop policy if exists "Owners and admins read verification files" on storage.objects;
drop policy if exists "Uploader inserts verification documents" on storage.objects;
drop policy if exists "Uploader reads verification documents" on storage.objects;
drop policy if exists "Uploader updates verification documents" on storage.objects;
drop policy if exists "Uploader deletes verification documents" on storage.objects;
-- Allow uploads only into a user-UUID folder belonging to the authenticated uploader.
create policy "Uploader inserts verification documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Allow reads only to the authenticated uploader identified by the object path.
create policy "Uploader reads verification documents"
  on storage.objects for select to authenticated
  using (bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Allow updates only to the authenticated uploader identified by the object path.
create policy "Uploader updates verification documents"
  on storage.objects for update to authenticated
  using (bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
-- Allow deletion only to the authenticated uploader identified by the object path.
create policy "Uploader deletes verification documents"
  on storage.objects for delete to authenticated
  using (bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text);
