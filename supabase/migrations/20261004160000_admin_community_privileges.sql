begin;
alter table public.community_spaces add column posting_policy text not null default 'members' check(posting_policy in ('members','moderators','closed'));
alter table public.community_spaces add column comments_enabled boolean not null default true;
create table public.community_member_permissions (
  space_id uuid not null references public.community_spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  can_post boolean not null default true,
  can_comment boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key(space_id,user_id)
);
alter table public.community_member_permissions enable row level security;
revoke all on public.community_member_permissions from public,anon,authenticated;
grant select on public.community_member_permissions to authenticated;
create policy "Members read own participation permissions" on public.community_member_permissions for select to authenticated using(user_id=auth.uid() or public.is_admin());

create or replace function public.community_can_contribute(target_space uuid,contribution text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and (public.is_admin() or exists(
  select 1 from public.community_spaces s
  left join public.community_memberships m on m.space_id=s.id and m.user_id=auth.uid()
  left join public.community_member_permissions p on p.space_id=s.id and p.user_id=auth.uid()
  where s.id=target_space and s.status='active' and (s.slug='general' or m.user_id is not null)
   and case contribution
    when 'post' then coalesce(p.can_post,true) and (s.posting_policy='members' or s.posting_policy='moderators' and m.role in ('moderator','owner'))
    when 'comment' then s.comments_enabled and coalesce(p.can_comment,true)
    else false end
 ));
$$;
revoke all on function public.community_can_contribute(uuid,text) from public,anon;
grant execute on function public.community_can_contribute(uuid,text) to authenticated;
create policy "Community posting privileges" on public.community_posts as restrictive for insert to authenticated with check(public.community_can_contribute(community_id,'post'));
create policy "Community comment privileges" on public.community_comments as restrictive for insert to authenticated with check(exists(select 1 from public.community_posts p where p.id=post_id and public.community_can_contribute(p.community_id,'comment')));
-- Also enforce for trusted publication RPCs, which bypass ordinary row policies.
create function public.enforce_community_contribution_privileges() returns trigger language plpgsql set search_path=pg_catalog,public as $$
declare space_id uuid;
begin
 if auth.uid() is null or public.is_admin() then return new; end if;
 if tg_table_name='community_posts' then space_id:=new.community_id;
 else select community_id into space_id from public.community_posts where id=new.post_id; end if;
 if not public.community_can_contribute(space_id,case when tg_table_name='community_posts' then 'post' else 'comment' end) then
   raise exception using errcode='42501',message='Posting or commenting is restricted in this community. Contact the community team.';
 end if;
 return new;
end $$;
revoke all on function public.enforce_community_contribution_privileges() from public,anon,authenticated;
-- AFTER triggers see the General community assigned by existing BEFORE triggers.
create trigger enforce_community_post_privileges after insert on public.community_posts for each row execute function public.enforce_community_contribution_privileges();
create trigger enforce_community_comment_privileges after insert on public.community_comments for each row execute function public.enforce_community_contribution_privileges();

create function public.admin_save_community_space(target_space uuid,changes jsonb,expected_updated_at timestamptz,decision_note text)
returns uuid language plpgsql security definer set search_path=pg_catalog,public as $$
declare previous public.community_spaces%rowtype; saved public.community_spaces%rowtype;
begin
 if not public.is_admin() then raise exception using errcode='42501',message='Administrator access required'; end if;
 if length(trim(coalesce(decision_note,'')))<3 then raise exception 'Provide a reason for this change'; end if;
 if target_space is null then
  insert into public.community_spaces(slug,name,description,rules,visibility,status,posting_policy,comments_enabled,created_by)
  values(changes->>'slug',trim(changes->>'name'),coalesce(changes->>'description',''),coalesce(changes->>'rules',''),coalesce(changes->>'visibility','public'),'active',coalesce(changes->>'posting_policy','members'),coalesce((changes->>'comments_enabled')::boolean,true),auth.uid()) returning * into saved;
 else
  select * into previous from public.community_spaces where id=target_space for update;
  if not found or previous.updated_at is distinct from expected_updated_at then raise exception 'This space changed. Refresh before saving.'; end if;
  if previous.slug='general' and (changes->>'visibility'<>'public' or changes->>'status'<>'active') then raise exception 'General must remain public and active'; end if;
  update public.community_spaces set name=trim(changes->>'name'),description=coalesce(changes->>'description',''),rules=coalesce(changes->>'rules',''),visibility=changes->>'visibility',status=changes->>'status',posting_policy=changes->>'posting_policy',comments_enabled=(changes->>'comments_enabled')::boolean,updated_at=clock_timestamp()
  where id=target_space returning * into saved;
 end if;
 insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details) values(auth.uid(),case when target_space is null then 'community_space_created' else 'community_space_updated' end,'community_space',saved.id,jsonb_build_object('reason',trim(decision_note),'before',to_jsonb(previous),'after',to_jsonb(saved)));
 return saved.id;
end $$;
revoke all on function public.admin_save_community_space(uuid,jsonb,timestamptz,text) from public,anon;
grant execute on function public.admin_save_community_space(uuid,jsonb,timestamptz,text) to authenticated;

create function public.admin_set_community_member(target_space uuid,target_user uuid,new_role text,allow_posts boolean,allow_comments boolean,expected_role text,expected_permission_update timestamptz,decision_note text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare previous_role text; old_permissions jsonb;
begin
 if not public.is_admin() then raise exception using errcode='42501',message='Administrator access required'; end if;
 if length(trim(coalesce(decision_note,'')))<3 then raise exception 'Provide a reason for this change'; end if;
 -- Serialize role changes per space, including simultaneous owner removal.
 perform 1 from public.community_spaces where id=target_space for update;
 if not found then raise exception 'Community space not found'; end if;
 if new_role is not null and new_role not in ('member','moderator','owner') then raise exception 'Invalid community role'; end if;
 select role into previous_role from public.community_memberships where space_id=target_space and user_id=target_user;
 if previous_role is distinct from expected_role then raise exception 'Membership changed. Refresh before saving.'; end if;
 if previous_role='owner' and new_role is distinct from 'owner' and (select count(*) from public.community_memberships where space_id=target_space and role='owner')<=1 then raise exception 'Assign another owner before removing the last owner'; end if;
 select to_jsonb(p) into old_permissions from public.community_member_permissions p where space_id=target_space and user_id=target_user;
 if (old_permissions->>'updated_at')::timestamptz is distinct from expected_permission_update then raise exception 'Permissions changed. Refresh before saving.'; end if;
 if new_role is null then
  delete from public.community_memberships where space_id=target_space and user_id=target_user;
 else
  insert into public.community_memberships(space_id,user_id,role) values(target_space,target_user,new_role) on conflict(space_id,user_id) do update set role=excluded.role;
 end if;
 -- Restrictions persist even if a member leaves and rejoins a public space.
 insert into public.community_member_permissions(space_id,user_id,can_post,can_comment) values(target_space,target_user,allow_posts,allow_comments)
 on conflict(space_id,user_id) do update set can_post=excluded.can_post,can_comment=excluded.can_comment,updated_at=clock_timestamp();
 insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details) values(auth.uid(),'community_member_privileges','community_space',target_space,jsonb_build_object('user_id',target_user,'previous_role',previous_role,'new_role',new_role,'previous_permissions',old_permissions,'can_post',allow_posts,'can_comment',allow_comments,'reason',trim(decision_note)));
end $$;
revoke all on function public.admin_set_community_member(uuid,uuid,text,boolean,boolean,text,timestamptz,text) from public,anon;
grant execute on function public.admin_set_community_member(uuid,uuid,text,boolean,boolean,text,timestamptz,text) to authenticated;
commit;
