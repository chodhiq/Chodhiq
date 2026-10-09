begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('community-images','community-images',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "Authors upload community images" on storage.objects for insert to authenticated
with check(bucket_id='community-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "Authors remove community images" on storage.objects for delete to authenticated
using(bucket_id='community-images' and (storage.foldername(name))[1]=(select auth.uid())::text);
-- The post query runs with the reader's RLS permissions, including blocks and private membership.
create policy "Readers access visible community images" on storage.objects for select to anon, authenticated
using(bucket_id='community-images' and (
  (storage.foldername(name))[1]=(select auth.uid())::text
  or exists(select 1 from public.community_posts p where p.image_url='community-image:' || storage.objects.name and (p.status='published' or public.is_admin()))
));

create or replace function public.notify_new_community_post()
returns trigger language plpgsql security definer set search_path=pg_catalog,public as $$
declare space public.community_spaces%rowtype;
begin
  if new.status <> 'published' then return new; end if;
  if tg_op='UPDATE' then
    if old.status='published' then return new; end if;
  end if;
  select * into space from public.community_spaces where id=new.community_id and status='active';
  if not found then return new; end if;
  insert into public.notifications(user_id,title,body,type,entity_type,entity_id)
  select p.id,'New post in ' || space.name,'A new community post is available.',
    'community_post','community_post',new.id::text
  from public.profiles p
  where p.id<>new.author_id
    and not public.community_users_blocked(p.id,new.author_id)
    and (space.slug='general' and space.visibility='public'
      or exists(select 1 from public.community_memberships m where m.space_id=space.id and m.user_id=p.id))
    and not exists(select 1 from public.notifications n where n.user_id=p.id and n.entity_type='community_post' and n.entity_id=new.id::text);
  return new;
end $$;
revoke all on function public.notify_new_community_post() from public,anon,authenticated;
create trigger notify_new_community_post_trigger after insert or update of status on public.community_posts
for each row execute function public.notify_new_community_post();
commit;
