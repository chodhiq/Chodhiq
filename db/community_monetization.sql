-- Community feed and provider promotion entitlements.
-- Payment webhooks/admin tooling should be the only writers to provider_entitlements.

create table if not exists public.provider_entitlements (
  provider_id uuid primary key references public.providers(id) on delete cascade,
  offers_active boolean not null default false,
  offer_period_start date,
  offer_posts_used smallint not null default 0 check (offer_posts_used between 0 and 3),
  search_tier smallint not null default 0 check (search_tier in (0, 5, 10)),
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.providers add column if not exists sponsored_rank smallint not null default 0
  check (sponsored_rank in (0, 5, 10));
alter table public.providers add column if not exists sponsored_until timestamptz;

create or replace function public.sync_provider_sponsorship()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.providers set
    sponsored_rank = case when new.expires_at > now() then new.search_tier else 0 end,
    sponsored_until = new.expires_at,
    updated_at = now()
  where id = new.provider_id;
  return new;
end;
$$;

drop trigger if exists sync_provider_sponsorship_trigger on public.provider_entitlements;
create trigger sync_provider_sponsorship_trigger
after insert or update of search_tier, expires_at on public.provider_entitlements
for each row execute function public.sync_provider_sponsorship();

create table if not exists public.community_posts (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid not null references auth.users(id) on delete cascade,
  provider_id uuid references public.providers(id) on delete set null,
  post_type text not null default 'discussion'
    check (post_type in ('discussion', 'experience', 'recommendation', 'complaint', 'promotion')),
  body text not null check (char_length(body) between 2 and 2000),
  image_url text,
  offer_expires_at timestamptz,
  status text not null default 'published' check (status in ('published', 'under_review', 'removed')),
  created_at timestamptz not null default now(),
  check (post_type = 'promotion' or image_url is null)
);

create table if not exists public.community_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create or replace function public.enforce_community_promotion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  entitlement public.provider_entitlements%rowtype;
  provider_owner uuid;
begin
  if new.post_type <> 'promotion' then
    new.image_url := null;
    return new;
  end if;

  if new.provider_id is null or new.image_url is null then
    raise exception 'Promotional posts require a provider and poster image';
  end if;

  select owner_id into provider_owner from public.providers where id = new.provider_id;
  if provider_owner is distinct from new.author_id then
    raise exception 'Only the business owner can publish this promotion';
  end if;

  select * into entitlement from public.provider_entitlements
    where provider_id = new.provider_id for update;
  if not found or not entitlement.offers_active or entitlement.expires_at is null or entitlement.expires_at <= now() then
    raise exception 'The £10 Community Offers plan is not active';
  end if;

  if entitlement.offer_period_start is null
     or entitlement.offer_period_start < date_trunc('month', current_date)::date then
    update public.provider_entitlements set
      offer_period_start = date_trunc('month', current_date)::date,
      offer_posts_used = 1,
      updated_at = now()
    where provider_id = new.provider_id;
  elsif entitlement.offer_posts_used >= 3 then
    raise exception 'Monthly allowance of 3 promotional posters has been used';
  else
    update public.provider_entitlements set
      offer_posts_used = offer_posts_used + 1,
      updated_at = now()
    where provider_id = new.provider_id;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_community_promotion_trigger on public.community_posts;
create trigger enforce_community_promotion_trigger
before insert on public.community_posts
for each row execute function public.enforce_community_promotion();

alter table public.provider_entitlements enable row level security;
alter table public.community_posts enable row level security;
alter table public.community_comments enable row level security;

create policy "Public reads active community posts" on public.community_posts
  for select using (status = 'published');
create policy "Users publish their own community posts" on public.community_posts
  for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Users manage their own community posts" on public.community_posts
  for update to authenticated using ((select auth.uid()) = author_id)
  with check ((select auth.uid()) = author_id);
create policy "Users delete their own community posts" on public.community_posts
  for delete to authenticated using ((select auth.uid()) = author_id);

create policy "Public reads community comments" on public.community_comments
  for select using (true);
create policy "Users publish their own comments" on public.community_comments
  for insert to authenticated with check ((select auth.uid()) = author_id);
create policy "Users delete their own comments" on public.community_comments
  for delete to authenticated using ((select auth.uid()) = author_id);

create policy "Owners read their promotion entitlement" on public.provider_entitlements
  for select to authenticated using (
    exists (select 1 from public.providers p where p.id = provider_id and p.owner_id = (select auth.uid()))
  );

create index if not exists community_posts_created_idx on public.community_posts(created_at desc);
create index if not exists community_posts_provider_idx on public.community_posts(provider_id);
create index if not exists community_comments_post_idx on public.community_comments(post_id, created_at);
create index if not exists providers_sponsored_rank_idx on public.providers(sponsored_rank, sponsored_until);

grant select on public.community_posts, public.community_comments to anon, authenticated;
grant insert, update, delete on public.community_posts to authenticated;
grant insert, delete on public.community_comments to authenticated;
grant select on public.provider_entitlements to authenticated;
