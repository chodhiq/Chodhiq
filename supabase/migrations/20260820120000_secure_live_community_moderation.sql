begin;
alter table public.community_posts enable row level security;
drop policy if exists "Admins read all community posts" on public.community_posts;
create policy "Admins read all community posts"
on public.community_posts for select to authenticated
using (public.is_admin());
create or replace function public.admin_transition_community_post(
  post_id uuid,
  expected_status text,
  next_status text,
  reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_post public.community_posts%rowtype;
  clean_reason text := trim(coalesce(reason, ''));
begin
  if not public.is_admin() then
    raise exception using errcode = '42501', message = 'administrator required';
  end if;
  if expected_status not in ('published', 'under_review', 'removed')
    or next_status not in ('published', 'removed') then
    raise exception using errcode = '22023', message = 'invalid community post status';
  end if;
  if next_status = 'removed' and (length(clean_reason) < 8 or length(clean_reason) > 1000) then
    raise exception using errcode = '22023', message = 'removal reason must be between 8 and 1000 characters';
  end if;

  select * into current_post
  from public.community_posts
  where id = post_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'community post not found';
  end if;
  if current_post.status <> expected_status then
    raise exception using errcode = '40001', message = 'community post changed; reload and retry';
  end if;
  if current_post.status = next_status then
    raise exception using errcode = '40001', message = 'community post is already in the requested state';
  end if;

  update public.community_posts set status = next_status where id = post_id;
  insert into public.admin_audit_log(admin_id, action, entity_type, entity_id, details)
  values (
    auth.uid(),
    'community_post_' || next_status,
    'community_post',
    post_id,
    jsonb_build_object(
      'source', 'admin_transition_rpc',
      'reason', nullif(clean_reason, ''),
      'outcome', 'succeeded',
      'previous_values', jsonb_build_object('status', current_post.status),
      'new_values', jsonb_build_object('status', next_status),
      'correlation_id', gen_random_uuid()
    )
  );
  return jsonb_build_object('ok', true, 'status', next_status);
end;
$$;
revoke all on function public.admin_transition_community_post(uuid, text, text, text) from public;
grant execute on function public.admin_transition_community_post(uuid, text, text, text) to authenticated;
commit;
