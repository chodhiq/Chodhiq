begin;

alter table public.community_member_permissions
  add column if not exists restricted_until timestamptz;

create or replace function public.community_can_contribute(target_space uuid, contribution text)
returns boolean language sql stable security definer set search_path=pg_catalog,public as $$
 select auth.uid() is not null and (public.is_admin() or exists(
  select 1 from public.community_spaces s
  left join public.community_memberships m on m.space_id=s.id and m.user_id=auth.uid()
  left join public.community_member_permissions p on p.space_id=s.id and p.user_id=auth.uid()
  where s.id=target_space and s.status='active' and (s.slug='general' or m.user_id is not null)
   and case contribution
    when 'post' then (coalesce(p.can_post,true) or p.restricted_until is not null and p.restricted_until <= now()) and (s.posting_policy='members' or s.posting_policy='moderators' and m.role in ('moderator','owner'))
    when 'comment' then s.comments_enabled and (coalesce(p.can_comment,true) or p.restricted_until is not null and p.restricted_until <= now())
    else false end
 ));
$$;
revoke all on function public.community_can_contribute(uuid,text) from public,anon;
grant execute on function public.community_can_contribute(uuid,text) to authenticated;

create or replace function public.admin_set_community_member(
  target_space uuid,target_user uuid,new_role text,allow_posts boolean,allow_comments boolean,
  expected_role text,expected_permission_update timestamptz,decision_note text,restricted_until timestamptz
) returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare previous_role text; old_permissions jsonb;
begin
 if not public.admin_has_permission('community.privileges') then raise exception using errcode='42501',message='Administrator permission required'; end if;
 if length(trim(coalesce(decision_note,'')))<3 then raise exception 'Provide a reason for this change'; end if;
 if restricted_until is not null and restricted_until <= now() then raise exception 'Restriction expiry must be in the future'; end if;
 perform 1 from public.community_spaces where id=target_space for update;
 if not found then raise exception 'Community space not found'; end if;
 if new_role is not null and new_role not in ('member','moderator','owner') then raise exception 'Invalid community role'; end if;
 select role into previous_role from public.community_memberships where space_id=target_space and user_id=target_user;
 if previous_role is distinct from expected_role then raise exception 'Membership changed. Refresh before saving.'; end if;
 if previous_role='owner' and new_role is distinct from 'owner' and (select count(*) from public.community_memberships where space_id=target_space and role='owner')<=1 then raise exception 'Assign another owner before removing the last owner'; end if;
 select to_jsonb(p) into old_permissions from public.community_member_permissions p where space_id=target_space and user_id=target_user;
 if (old_permissions->>'updated_at')::timestamptz is distinct from expected_permission_update then raise exception 'Permissions changed. Refresh before saving.'; end if;
 if new_role is null then delete from public.community_memberships where space_id=target_space and user_id=target_user;
 else insert into public.community_memberships(space_id,user_id,role) values(target_space,target_user,new_role) on conflict(space_id,user_id) do update set role=excluded.role; end if;
 insert into public.community_member_permissions(space_id,user_id,can_post,can_comment,restricted_until)
 values(target_space,target_user,allow_posts,allow_comments,restricted_until)
 on conflict(space_id,user_id) do update set can_post=excluded.can_post,can_comment=excluded.can_comment,restricted_until=excluded.restricted_until,updated_at=clock_timestamp();
 insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
 values(auth.uid(),'community_member_privileges','community_space',target_space,jsonb_build_object('user_id',target_user,'previous_role',previous_role,'new_role',new_role,'previous_permissions',old_permissions,'can_post',allow_posts,'can_comment',allow_comments,'restricted_until',restricted_until,'reason',trim(decision_note)));
end $$;
revoke all on function public.admin_set_community_member(uuid,uuid,text,boolean,boolean,text,timestamptz,text,timestamptz) from public,anon;
grant execute on function public.admin_set_community_member(uuid,uuid,text,boolean,boolean,text,timestamptz,text,timestamptz) to authenticated;

-- Keep the legacy signature for existing callers while enforcing the same server permission.
create or replace function public.admin_set_community_member(target_space uuid,target_user uuid,new_role text,allow_posts boolean,allow_comments boolean,expected_role text,expected_permission_update timestamptz,decision_note text)
returns void language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 if not public.is_admin() then raise exception using errcode='42501',message='Administrator access required'; end if;
 if not public.admin_has_permission('community.privileges') then raise exception using errcode='42501',message='Administrator permission required'; end if;
 perform public.admin_set_community_member(target_space,target_user,new_role,allow_posts,allow_comments,expected_role,expected_permission_update,decision_note,null);
end $$;
revoke all on function public.admin_set_community_member(uuid,uuid,text,boolean,boolean,text,timestamptz,text) from public,anon;
grant execute on function public.admin_set_community_member(uuid,uuid,text,boolean,boolean,text,timestamptz,text) to authenticated;

commit;
