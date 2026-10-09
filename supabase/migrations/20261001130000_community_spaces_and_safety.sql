begin;

create table if not exists public.community_spaces (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  name text not null check (char_length(trim(name)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  rules text not null default '' check (char_length(rules) <= 10000),
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.community_memberships (
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'owner')),
  joined_at timestamptz not null default now(),
  primary key (space_id, user_id)
);

alter table public.community_spaces enable row level security;
alter table public.community_memberships enable row level security;
revoke all on public.community_spaces, public.community_memberships from public, anon, authenticated;
grant select on public.community_spaces to anon, authenticated;
grant select, insert, update, delete on public.community_memberships to authenticated;
grant insert, update, delete on public.community_spaces to authenticated;

drop policy if exists "Read active public community spaces" on public.community_spaces;
create policy "Read active public community spaces" on public.community_spaces
  for select to anon, authenticated
  using (status = 'active' and visibility = 'public');
drop policy if exists "Members read their private community spaces" on public.community_spaces;
create policy "Members read their private community spaces" on public.community_spaces
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.community_memberships m
      where m.space_id = community_spaces.id and m.user_id = (select auth.uid())
    )
  );
drop policy if exists "Admins manage community spaces" on public.community_spaces;
create policy "Admins manage community spaces" on public.community_spaces
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Members read their own community memberships" on public.community_memberships;
create policy "Members read their own community memberships" on public.community_memberships
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "Users join public active communities" on public.community_memberships;
create policy "Users join public active communities" on public.community_memberships
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'member'
    and exists (
      select 1 from public.community_spaces s
      where s.id = space_id and s.visibility = 'public' and s.status = 'active'
    )
  );
drop policy if exists "Users leave their communities" on public.community_memberships;
create policy "Users leave their communities" on public.community_memberships
  for delete to authenticated using (user_id = (select auth.uid()));
drop policy if exists "Admins manage community memberships" on public.community_memberships;
create policy "Admins manage community memberships" on public.community_memberships
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.community_spaces(slug, name, description, rules)
values (
  'general',
  'General',
  'The shared ChodhiQ community for questions, recommendations, and everyday conversation.',
  'Be respectful. Do not post private information, scams, harassment, or harmful content.'
)
on conflict (slug) do nothing;

alter table public.community_posts
  add column if not exists community_id uuid references public.community_spaces(id) on delete restrict;

update public.community_posts p
set community_id = s.id
from public.community_spaces s
where s.slug = 'general' and p.community_id is null;

insert into public.community_memberships(space_id, user_id, role)
select distinct p.community_id, p.author_id, 'member'
from public.community_posts p
where p.community_id is not null
on conflict (space_id, user_id) do nothing;

alter table public.community_posts alter column community_id set not null;
create index if not exists community_posts_space_created_idx
  on public.community_posts(community_id, created_at desc) where status = 'published';
create index if not exists community_memberships_user_idx
  on public.community_memberships(user_id, joined_at desc);

drop policy if exists "Public posts belong to active public communities" on public.community_posts;
create policy "Public posts belong to active public communities" on public.community_posts
  as restrictive for select to anon
  using (exists (
    select 1 from public.community_spaces s
    where s.id = community_id and s.status = 'active' and s.visibility = 'public'
  ));
drop policy if exists "Member posts belong to readable active communities" on public.community_posts;
create policy "Member posts belong to readable active communities" on public.community_posts
  as restrictive for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.community_spaces s
      where s.id = community_id and s.status = 'active'
        and (s.visibility = 'public' or exists (
          select 1 from public.community_memberships m
          where m.space_id = s.id and m.user_id = (select auth.uid())
        ))
    )
  );
drop policy if exists "Members publish in active communities" on public.community_posts;
create policy "Members publish in active communities" on public.community_posts
  as restrictive for insert to authenticated
  with check (
    exists (
      select 1 from public.community_spaces s
      where s.id = community_id and s.slug = 'general'
        and s.visibility = 'public' and s.status = 'active'
    )
    or exists (
      select 1 from public.community_memberships m
      join public.community_spaces s on s.id = m.space_id
      where m.space_id = community_id and m.user_id = (select auth.uid())
        and s.status = 'active'
    )
  );
drop policy if exists "Members edit in active communities" on public.community_posts;
create policy "Members edit in active communities" on public.community_posts
  as restrictive for update to authenticated
  using (
    exists (
      select 1 from public.community_memberships m
      join public.community_spaces s on s.id = m.space_id
      where m.space_id = community_id and m.user_id = (select auth.uid())
        and s.status = 'active'
    )
  )
  with check (
    exists (
      select 1 from public.community_memberships m
      join public.community_spaces s on s.id = m.space_id
      where m.space_id = community_id and m.user_id = (select auth.uid())
        and s.status = 'active'
    )
  );

alter table public.community_comments
  add column if not exists parent_comment_id uuid references public.community_comments(id) on delete cascade,
  add column if not exists status text not null default 'published'
    check (status in ('published', 'removed'));
create index if not exists community_comments_parent_created_idx
  on public.community_comments(post_id, parent_comment_id, created_at);

drop policy if exists "Public published comments on public posts" on public.community_comments;
create policy "Public published comments on public posts" on public.community_comments
  as restrictive for select to anon
  using (
    status = 'published'
    and exists (
      select 1 from public.community_posts p
      where p.id = post_id and p.status = 'published'
    )
  );
drop policy if exists "Members read published comments on readable posts" on public.community_comments;
create policy "Members read published comments on readable posts" on public.community_comments
  as restrictive for select to authenticated
  using (
    public.is_admin()
    or (
      status = 'published'
      and exists (
        select 1 from public.community_posts p
        where p.id = post_id and p.status = 'published'
      )
    )
  );
drop policy if exists "Members comment in active communities" on public.community_comments;
create policy "Members comment in active communities" on public.community_comments
  as restrictive for insert to authenticated
  with check (
    exists (
      select 1 from public.community_posts p
      join public.community_spaces s on s.id = p.community_id
      where p.id = post_id and p.status = 'published' and s.status = 'active'
        and (
          (s.slug = 'general' and s.visibility = 'public')
          or exists (
            select 1 from public.community_memberships m
            where m.space_id = s.id and m.user_id = (select auth.uid())
          )
        )
    )
  );

alter table public.community_post_reports
  add column if not exists comment_id uuid references public.community_comments(id) on delete cascade,
  add column if not exists updated_at timestamptz not null default now();
alter table public.community_post_reports
  drop constraint if exists community_post_reports_post_id_reporter_id_key;
create unique index if not exists community_post_reports_post_reporter_uidx
  on public.community_post_reports(post_id, reporter_id) where comment_id is null;
create unique index if not exists community_post_reports_comment_reporter_uidx
  on public.community_post_reports(comment_id, reporter_id) where comment_id is not null;
create index if not exists community_post_reports_comment_idx
  on public.community_post_reports(comment_id) where comment_id is not null;

create table if not exists public.community_user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.community_user_blocks enable row level security;
revoke all on public.community_user_blocks from public, anon, authenticated;
grant select, insert, delete on public.community_user_blocks to authenticated;
drop policy if exists "Users read their own community blocks" on public.community_user_blocks;
create policy "Users read their own community blocks" on public.community_user_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));
drop policy if exists "Users block other community members" on public.community_user_blocks;
create policy "Users block other community members" on public.community_user_blocks
  for insert to authenticated with check (blocker_id = (select auth.uid()));
drop policy if exists "Users unblock community members" on public.community_user_blocks;
create policy "Users unblock community members" on public.community_user_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

create table if not exists public.community_rate_limit_buckets (
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (user_id, action, window_started_at)
);
alter table public.community_rate_limit_buckets enable row level security;
revoke all on public.community_rate_limit_buckets from public, anon, authenticated;

create or replace function public.community_users_blocked(user_a uuid, user_b uuid)
returns boolean
language plpgsql stable security definer
set search_path = pg_catalog, public, auth
as $$
declare actor uuid := auth.uid();
begin
  if actor is null or actor not in (user_a, user_b) or user_a is null or user_b is null then
    return false;
  end if;
  return exists (
    select 1 from public.community_user_blocks b
    where (b.blocker_id = user_a and b.blocked_id = user_b)
       or (b.blocker_id = user_b and b.blocked_id = user_a)
  );
end;
$$;
revoke all on function public.community_users_blocked(uuid, uuid) from public, anon;
grant execute on function public.community_users_blocked(uuid, uuid) to authenticated;

create or replace function public.community_post_engagement()
returns table (post_id uuid, like_count bigint, comment_count bigint, is_liked boolean)
language sql stable security definer
set search_path = public, pg_temp
as $$
  select p.id,
    (select count(*) from public.community_post_likes l where l.post_id = p.id),
    (select count(*) from public.community_comments c where c.post_id = p.id and c.status = 'published'),
    exists (
      select 1 from public.community_post_likes l
      where l.post_id = p.id and l.user_id = (select auth.uid())
    )
  from public.community_posts p
  where p.status = 'published'
    and (
      (select auth.uid()) is null
      or not public.community_users_blocked((select auth.uid()), p.author_id)
    );
$$;
revoke all on function public.community_post_engagement() from public;
grant execute on function public.community_post_engagement() to anon, authenticated;

drop policy if exists "Hide blocked authors from community feeds" on public.community_posts;
create policy "Hide blocked authors from community feeds" on public.community_posts
  as restrictive for select to authenticated
  using (public.is_admin() or not public.community_users_blocked((select auth.uid()), author_id));
drop policy if exists "Hide blocked authors from community comments" on public.community_comments;
create policy "Hide blocked authors from community comments" on public.community_comments
  as restrictive for select to authenticated
  using (public.is_admin() or not public.community_users_blocked((select auth.uid()), author_id));
drop policy if exists "Prevent likes across community blocks" on public.community_post_likes;
create policy "Prevent likes across community blocks" on public.community_post_likes
  as restrictive for insert to authenticated
  with check (
    not exists (
      select 1 from public.community_posts p
      where p.id = post_id
        and public.community_users_blocked((select auth.uid()), p.author_id)
    )
  );

create or replace function public.prepare_community_like()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare
  actor uuid := auth.uid();
  post_author uuid;
begin
  select p.author_id into post_author from public.community_posts p where p.id = new.post_id;
  if actor is null or new.user_id is distinct from actor or post_author is null then
    raise exception using errcode = '42501', message = 'Community votes must belong to the signed-in member and an existing post';
  end if;
  if public.community_users_blocked(actor, post_author) then
    raise exception using errcode = '42501', message = 'You cannot interact with this member';
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_community_like on public.community_post_likes;
create trigger prepare_community_like
before insert on public.community_post_likes
for each row execute function public.prepare_community_like();
revoke all on function public.prepare_community_like() from public, anon, authenticated;

create or replace function public.consume_community_rate_limit(
  target_user uuid,
  target_action text,
  max_requests integer,
  window_seconds integer
) returns void
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  bucket_start timestamptz;
  next_count integer;
begin
  if target_user is null or target_action is null or max_requests < 1 or window_seconds < 1 then
    raise exception using errcode = '22023', message = 'Invalid community rate limit';
  end if;
  bucket_start := to_timestamp(
    floor(extract(epoch from now()) / window_seconds) * window_seconds
  );
  delete from public.community_rate_limit_buckets
  where user_id = target_user and window_started_at < now() - interval '2 days';
  insert into public.community_rate_limit_buckets as current_bucket(user_id, action, window_started_at, request_count)
  values (target_user, target_action, bucket_start, 1)
  on conflict (user_id, action, window_started_at)
  do update set request_count = current_bucket.request_count + 1
  returning request_count into next_count;
  if next_count > max_requests then
    raise exception using errcode = 'P0001', message = 'Community action limit reached. Please try again later.';
  end if;
end;
$$;
revoke all on function public.consume_community_rate_limit(uuid, text, integer, integer) from public, anon, authenticated;

create or replace function public.prepare_community_post()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare
  actor uuid := auth.uid();
  general_space uuid;
  target_space public.community_spaces%rowtype;
begin
  if actor is null or new.author_id is distinct from actor then
    raise exception using errcode = '42501', message = 'Community posts must be published by the signed-in author';
  end if;
  if new.community_id is null then
    select id into general_space from public.community_spaces where slug = 'general';
    new.community_id := general_space;
  end if;
  select * into target_space from public.community_spaces where id = new.community_id;
  if not found or target_space.status <> 'active' then
    raise exception using errcode = '42501', message = 'This community is not available for posting';
  end if;
  if target_space.slug = 'general' and target_space.visibility = 'public' then
    insert into public.community_memberships(space_id, user_id, role)
    values (target_space.id, actor, 'member')
    on conflict (space_id, user_id) do nothing;
  end if;
  if not exists (
    select 1 from public.community_memberships m
    where m.space_id = target_space.id and m.user_id = actor
  ) then
    raise exception using errcode = '42501', message = 'Join this community before posting';
  end if;
  if new.post_type <> 'promotion' then
    perform public.consume_community_rate_limit(actor, 'post_10m', 5, 600);
    perform public.consume_community_rate_limit(actor, 'post_24h', 20, 86400);
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_community_post on public.community_posts;
create trigger prepare_community_post
before insert on public.community_posts
for each row execute function public.prepare_community_post();
revoke all on function public.prepare_community_post() from public, anon, authenticated;

create or replace function public.prepare_community_comment()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare
  actor uuid := auth.uid();
  post_author uuid;
  target_space uuid;
  target_slug text;
  parent_post uuid;
  parent_author uuid;
begin
  if actor is null or new.author_id is distinct from actor then
    raise exception using errcode = '42501', message = 'Community comments must be written by the signed-in author';
  end if;
  if new.status <> 'published' then
    raise exception using errcode = '42501', message = 'New community comments must be published';
  end if;
  select p.author_id, p.community_id, s.slug into post_author, target_space, target_slug
  from public.community_posts p
  join public.community_spaces s on s.id = p.community_id
  where p.id = new.post_id and p.status = 'published' and s.status = 'active';
  if not found then
    raise exception using errcode = 'P0002', message = 'Community post is unavailable';
  end if;
  if public.community_users_blocked(actor, post_author) then
    raise exception using errcode = '42501', message = 'You cannot interact with this member';
  end if;
  if target_slug = 'general' then
    if not exists (
      select 1 from public.community_spaces s
      where s.id = target_space and s.visibility = 'public'
    ) then
      raise exception using errcode = '42501', message = 'Join this community before commenting';
    end if;
    insert into public.community_memberships(space_id, user_id, role)
    values (target_space, actor, 'member')
    on conflict (space_id, user_id) do nothing;
  end if;
  if not exists (
    select 1 from public.community_memberships m
    where m.space_id = target_space and m.user_id = actor
  ) then
    raise exception using errcode = '42501', message = 'Join this community before commenting';
  end if;
  if new.parent_comment_id is not null then
    select c.post_id, c.author_id into parent_post, parent_author from public.community_comments c
    where c.id = new.parent_comment_id and c.status = 'published';
    if parent_post is distinct from new.post_id then
      raise exception using errcode = '22023', message = 'Replies must belong to the same post';
    end if;
    if public.community_users_blocked(actor, parent_author) then
      raise exception using errcode = '42501', message = 'You cannot interact with this member';
    end if;
  end if;
  perform public.consume_community_rate_limit(actor, 'comment_10m', 20, 600);
  perform public.consume_community_rate_limit(actor, 'comment_24h', 100, 86400);
  return new;
end;
$$;
drop trigger if exists prepare_community_comment on public.community_comments;
create trigger prepare_community_comment
before insert on public.community_comments
for each row execute function public.prepare_community_comment();
revoke all on function public.prepare_community_comment() from public, anon, authenticated;

create or replace function public.prepare_community_membership()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if not public.is_admin()
     and (auth.uid() is null or new.user_id is distinct from auth.uid() or new.role <> 'member') then
    raise exception using errcode = '42501', message = 'Community memberships must be created by the joining member';
  end if;
  if not public.is_admin() then
    perform public.consume_community_rate_limit(new.user_id, 'membership_24h', 20, 86400);
  end if;
  return new;
end;
$$;
drop trigger if exists prepare_community_membership on public.community_memberships;
create trigger prepare_community_membership
before insert on public.community_memberships
for each row execute function public.prepare_community_membership();
revoke all on function public.prepare_community_membership() from public, anon, authenticated;

create or replace function public.prepare_community_block()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
begin
  if auth.uid() is null or new.blocker_id is distinct from auth.uid() then
    raise exception using errcode = '42501', message = 'Members may only block from their own account';
  end if;
  perform public.consume_community_rate_limit(new.blocker_id, 'block_24h', 20, 86400);
  return new;
end;
$$;
drop trigger if exists prepare_community_block on public.community_user_blocks;
create trigger prepare_community_block
before insert on public.community_user_blocks
for each row execute function public.prepare_community_block();
revoke all on function public.prepare_community_block() from public, anon, authenticated;

create or replace function public.prepare_community_report()
returns trigger
language plpgsql security definer
set search_path = pg_catalog, public, auth
as $$
declare
  actor uuid := auth.uid();
  target_author uuid;
  comment_post uuid;
begin
  if actor is null or new.reporter_id is distinct from actor then
    raise exception using errcode = '42501', message = 'Reports must be submitted by the signed-in member';
  end if;
  if char_length(trim(coalesce(new.reason, ''))) not between 2 and 80 then
    raise exception using errcode = '22023', message = 'A valid report reason is required';
  end if;
  if new.comment_id is null then
    select p.author_id into target_author from public.community_posts p where p.id = new.post_id;
  else
    select c.author_id, c.post_id into target_author, comment_post
    from public.community_comments c where c.id = new.comment_id;
    if comment_post is distinct from new.post_id then
      raise exception using errcode = '22023', message = 'The reported comment does not belong to this post';
    end if;
  end if;
  if target_author is null then
    raise exception using errcode = 'P0002', message = 'Reported community content was not found';
  end if;
  if target_author = actor then
    raise exception using errcode = '22023', message = 'You cannot report your own content';
  end if;
  perform public.consume_community_rate_limit(actor, 'report_1h', 5, 3600);
  new.updated_at := now();
  return new;
end;
$$;
drop trigger if exists prepare_community_report on public.community_post_reports;
create trigger prepare_community_report
before insert on public.community_post_reports
for each row execute function public.prepare_community_report();
revoke all on function public.prepare_community_report() from public, anon, authenticated;

create or replace function public.admin_resolve_report(
  report_kind text,
  report_id uuid,
  expected_status text,
  expected_updated_at timestamptz,
  next_status text,
  resolution_note text
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  current_report record;
  target_id uuid;
  target_comment uuid;
  target_space uuid;
  previous_target jsonb;
  new_target jsonb;
  target_entity text;
  allowed_moderator boolean;
begin
  if report_kind not in ('provider', 'community')
     or next_status not in ('reviewing', 'resolved', 'dismissed') then
    raise exception using errcode = '22023', message = 'Invalid report transition';
  end if;
  if next_status in ('resolved', 'dismissed')
     and length(trim(coalesce(resolution_note, ''))) < 8 then
    raise exception using errcode = '22023', message = 'Resolution note required';
  end if;

  if report_kind = 'provider' then
    if not public.is_admin() then
      raise exception using errcode = '42501', message = 'Administrator access required';
    end if;
    select * into current_report from public.provider_reports where id = report_id for update;
  else
    select * into current_report from public.community_post_reports where id = report_id for update;
  end if;
  if not found then
    raise exception using errcode = 'P0002', message = 'Report not found';
  end if;
  if current_report.status <> expected_status
     or (expected_updated_at is not null
       and (to_jsonb(current_report)->>'updated_at')::timestamptz is distinct from expected_updated_at) then
    raise exception using errcode = '40001', message = 'Report changed; reload and retry';
  end if;
  if current_report.status not in ('open', 'reviewing')
     or (current_report.status = 'reviewing' and next_status = 'reviewing') then
    raise exception using errcode = '40001', message = 'Illegal or repeated report transition';
  end if;

  if report_kind = 'provider' then
    target_id := nullif(to_jsonb(current_report)->>'provider_id', '')::uuid;
    target_entity := 'provider';
    if next_status = 'resolved' then
      select to_jsonb(p) into previous_target from public.providers p where p.id = target_id for update;
      update public.providers set verification_status = 'suspended', is_verified = false
      where id = target_id returning to_jsonb(providers) into new_target;
    end if;
  else
    target_comment := nullif(to_jsonb(current_report)->>'comment_id', '')::uuid;
    target_id := nullif(to_jsonb(current_report)->>'post_id', '')::uuid;
    if target_comment is not null then
      target_entity := 'community_comment';
      select p.community_id into target_space
      from public.community_comments c join public.community_posts p on p.id = c.post_id
      where c.id = target_comment;
      if target_space is null then
        raise exception using errcode = 'P0002', message = 'Reported comment was not found';
      end if;
      if next_status = 'resolved' then
        select to_jsonb(c) into previous_target from public.community_comments c where c.id = target_comment for update;
        update public.community_comments set status = 'removed' where id = target_comment
        returning to_jsonb(community_comments) into new_target;
      end if;
    else
      target_entity := 'community_post';
      select p.community_id into target_space from public.community_posts p where p.id = target_id;
      if target_space is null then
        raise exception using errcode = 'P0002', message = 'Reported post was not found';
      end if;
      if next_status = 'resolved' then
        select to_jsonb(p) into previous_target from public.community_posts p where p.id = target_id for update;
        update public.community_posts set status = 'removed' where id = target_id
        returning to_jsonb(community_posts) into new_target;
      end if;
    end if;
    select exists (
      select 1 from public.community_memberships m
      where m.space_id = target_space and m.user_id = auth.uid()
        and m.role in ('moderator', 'owner')
    ) into allowed_moderator;
    if not public.is_admin() and not allowed_moderator then
      raise exception using errcode = '42501', message = 'Community moderator access required';
    end if;
  end if;

  if report_kind = 'provider' then
    update public.provider_reports set status = next_status where id = report_id;
  else
    update public.community_post_reports set status = next_status, updated_at = now() where id = report_id;
  end if;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (
    auth.uid(), report_kind || '_report_' || next_status, report_kind || '_report', report_id::text,
    jsonb_build_object(
      'source', 'admin_report_rpc', 'target_type', target_entity,
      'target_id', coalesce(target_comment, target_id), 'reason', resolution_note,
      'outcome', 'succeeded', 'previous_values', jsonb_build_object('status', expected_status, 'target', previous_target),
      'new_values', jsonb_build_object('status', next_status, 'target', new_target),
      'correlation_id', gen_random_uuid()
    )
  );
  return jsonb_build_object('ok', true, 'status', next_status);
end;
$$;
revoke all on function public.admin_resolve_report(text, uuid, text, timestamptz, text, text) from public, anon;
grant execute on function public.admin_resolve_report(text, uuid, text, timestamptz, text, text) to authenticated;

create or replace function public.community_moderate_post(
  target_post uuid,
  expected_status text,
  next_status text,
  reason text
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  current_post public.community_posts%rowtype;
  allowed_moderator boolean;
  clean_reason text := trim(coalesce(reason, ''));
begin
  select * into current_post from public.community_posts where id = target_post for update;
  if not found then raise exception using errcode = 'P0002', message = 'Community post not found'; end if;
  select exists (
    select 1 from public.community_memberships m
    where m.space_id = current_post.community_id and m.user_id = auth.uid()
      and m.role in ('moderator', 'owner')
  ) into allowed_moderator;
  if not public.is_admin() and not allowed_moderator then
    raise exception using errcode = '42501', message = 'Community moderator access required';
  end if;
  if expected_status not in ('published', 'under_review', 'removed')
     or next_status not in ('published', 'removed') then
    raise exception using errcode = '22023', message = 'Invalid community post status';
  end if;
  if current_post.status <> expected_status or current_post.status = next_status then
    raise exception using errcode = '40001', message = 'Community post changed; reload and retry';
  end if;
  if next_status = 'removed' and char_length(clean_reason) not between 8 and 1000 then
    raise exception using errcode = '22023', message = 'A moderation reason of 8 to 1000 characters is required';
  end if;
  update public.community_posts set status = next_status where id = target_post;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'community_post_' || next_status, 'community_post', target_post::text,
    jsonb_build_object('source', 'community_moderation_rpc', 'reason', clean_reason,
      'space_id', current_post.community_id, 'previous_status', current_post.status,
      'new_status', next_status, 'correlation_id', gen_random_uuid()));
  return jsonb_build_object('ok', true, 'status', next_status);
end;
$$;
revoke all on function public.community_moderate_post(uuid, text, text, text) from public, anon;
grant execute on function public.community_moderate_post(uuid, text, text, text) to authenticated;

create or replace function public.community_moderate_comment(
  target_comment uuid,
  expected_status text,
  next_status text,
  reason text
) returns jsonb
language plpgsql security definer
set search_path = pg_catalog, public
as $$
declare
  current_comment public.community_comments%rowtype;
  target_space uuid;
  allowed_moderator boolean;
  clean_reason text := trim(coalesce(reason, ''));
begin
  select * into current_comment from public.community_comments where id = target_comment for update;
  if not found then raise exception using errcode = 'P0002', message = 'Community comment not found'; end if;
  select community_id into target_space from public.community_posts where id = current_comment.post_id;
  select exists (
    select 1 from public.community_memberships m
    where m.space_id = target_space and m.user_id = auth.uid()
      and m.role in ('moderator', 'owner')
  ) into allowed_moderator;
  if not public.is_admin() and not allowed_moderator then
    raise exception using errcode = '42501', message = 'Community moderator access required';
  end if;
  if expected_status not in ('published', 'removed') or next_status not in ('published', 'removed') then
    raise exception using errcode = '22023', message = 'Invalid community comment status';
  end if;
  if current_comment.status <> expected_status or current_comment.status = next_status then
    raise exception using errcode = '40001', message = 'Community comment changed; reload and retry';
  end if;
  if next_status = 'removed' and char_length(clean_reason) not between 8 and 1000 then
    raise exception using errcode = '22023', message = 'A moderation reason of 8 to 1000 characters is required';
  end if;
  update public.community_comments set status = next_status where id = target_comment;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (auth.uid(), 'community_comment_' || next_status, 'community_comment', target_comment::text,
    jsonb_build_object('source', 'community_moderation_rpc', 'reason', clean_reason,
      'space_id', target_space, 'previous_status', current_comment.status,
      'new_status', next_status, 'correlation_id', gen_random_uuid()));
  return jsonb_build_object('ok', true, 'status', next_status);
end;
$$;
revoke all on function public.community_moderate_comment(uuid, text, text, text) from public, anon;
grant execute on function public.community_moderate_comment(uuid, text, text, text) to authenticated;

commit;
