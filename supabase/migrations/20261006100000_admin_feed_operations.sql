begin;

-- Comment moderation is atomic, checks concurrent decisions, and audits on server.
create policy "Admins inspect all community comments" on public.community_comments for select to authenticated using(public.is_admin());
create function public.admin_transition_community_comment(comment_id uuid,expected_status text,next_status text,reason text)
returns jsonb language plpgsql security definer set search_path=pg_catalog,public as $$
declare current_comment public.community_comments%rowtype; clean_reason text:=trim(coalesce(reason,''));
begin
  if not public.is_admin() then raise exception using errcode='42501',message='Administrator access required'; end if;
  if expected_status is null or next_status is null or expected_status not in ('published','removed') or next_status not in ('published','removed') then
    raise exception using errcode='22023',message='Invalid comment status';
  end if;
  if length(clean_reason)<8 or length(clean_reason)>1000 then raise exception 'Provide a reason between 8 and 1000 characters'; end if;
  select * into current_comment from public.community_comments where id=comment_id for update;
  if not found then raise exception using errcode='P0002',message='Comment not found'; end if;
  if current_comment.status is distinct from expected_status or current_comment.status=next_status then
    raise exception using errcode='40001',message='Comment changed. Refresh before moderating.';
  end if;
  update public.community_comments set status=next_status where id=comment_id;
  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  values(auth.uid(),'community_comment_' || next_status,'community_comment',comment_id,
    jsonb_build_object('reason',clean_reason,'post_id',current_comment.post_id,'previous_status',current_comment.status,'new_status',next_status,'source','admin_transition_rpc','outcome','succeeded'));
  return jsonb_build_object('ok',true,'status',next_status);
end $$;
revoke all on function public.admin_transition_community_comment(uuid,text,text,text) from public,anon;
grant execute on function public.admin_transition_community_comment(uuid,text,text,text) to authenticated;

-- Both admin queues have polling fallback if realtime is unavailable.
do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='business_applications') then
      alter publication supabase_realtime add table public.business_applications;
    end if;
  end if;
end $$;
commit;
