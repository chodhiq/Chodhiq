begin;
-- Durable receipts make reconnect retries safe even when a committed response
-- was lost. Receipts survive post deletion so a late retry cannot resurrect it.
create table public.community_post_sync_receipts (
 user_id uuid not null references auth.users(id) on delete cascade,
 operation_id text not null check (char_length(operation_id) between 1 and 200),
 post_id uuid not null,
 payload jsonb not null,
 created_at timestamptz not null default now(),
 primary key(user_id,operation_id)
);
alter table public.community_post_sync_receipts enable row level security;
revoke all on public.community_post_sync_receipts from public,anon,authenticated;
grant select,insert on public.community_post_sync_receipts to authenticated;
create policy "Users read their own community sync receipts" on public.community_post_sync_receipts
for select to authenticated using(user_id=(select auth.uid()));
create policy "Users record their own community publications" on public.community_post_sync_receipts
for insert to authenticated with check(user_id=(select auth.uid()) and exists (
 select 1 from public.community_posts p where p.id=post_id and p.author_id=(select auth.uid())
));
create or replace function public.publish_queued_community_post(operation_id text,payload jsonb)
returns uuid language plpgsql security invoker
set search_path=pg_catalog,public,auth
as $$
declare actor uuid:=auth.uid(); receipt public.community_post_sync_receipts%rowtype; published_id uuid;
begin
 if actor is null or nullif(payload->>'author_id','')::uuid is distinct from actor then
   raise exception using errcode='42501',message='Queued posts must belong to the signed-in author';
 end if;
 if operation_id is null or char_length(operation_id) not between 1 and 200 or jsonb_typeof(payload) is distinct from 'object' then
   raise exception using errcode='22023',message='Invalid queued community post';
 end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||operation_id,0));
 select r.* into receipt from public.community_post_sync_receipts r
 where r.user_id=actor and r.operation_id=publish_queued_community_post.operation_id;
 if found then
   if receipt.payload is distinct from payload then
     raise exception using errcode='22023',message='Queued operation payload changed';
   end if;
   return receipt.post_id;
 end if;
 insert into public.community_posts(author_id,provider_id,post_type,body,image_url,offer_expires_at,region_key,location_city,community_id)
 values(actor,nullif(payload->>'provider_id','')::uuid,coalesce(payload->>'post_type','discussion'),payload->>'body',
 payload->>'image_url',nullif(payload->>'offer_expires_at','')::timestamptz,payload->>'region_key',payload->>'location_city',nullif(payload->>'community_id','')::uuid)
 returning id into published_id;
 insert into public.community_post_sync_receipts(user_id,operation_id,post_id,payload)
 values(actor,operation_id,published_id,payload);
 return published_id;
end;
$$;
revoke all on function public.publish_queued_community_post(text,jsonb) from public,anon;
grant execute on function public.publish_queued_community_post(text,jsonb) to authenticated;
commit;
