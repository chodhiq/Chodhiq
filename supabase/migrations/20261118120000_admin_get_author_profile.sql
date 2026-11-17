create or replace function public.admin_get_author_profile(author_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
#variable_conflict use_column
declare
  v_contact boolean := public.admin_has_permission('users.suspend');
  v_reports boolean := public.admin_has_permission('reports.resolve');
  v_reviews boolean := public.admin_has_permission('reviews.moderate');
  v_applications boolean := public.admin_has_permission('applications.review');
  v_notifications boolean := public.admin_has_permission('notifications.send');
  v_audit boolean := public.admin_has_permission('audit.view');
  v_profile jsonb;
  v_providers jsonb;
  v_suspensions jsonb;
  v_privileges jsonb;
  v_posts jsonb;
  v_comments jsonb;
  v_review_activity jsonb;
  v_bookings jsonb;
  v_quotes jsonb;
  v_reports_filed jsonb;
  v_reports_against jsonb;
  v_received_notifications jsonb;
  v_moderation_actions jsonb;
begin
  if not public.is_admin()
     or not (public.admin_has_permission('community.moderate')
          or public.admin_has_permission('reports.resolve')) then
    raise exception using errcode = '42501', message = 'Community moderation permission required';
  end if;
  if $1 is null then
    raise exception using errcode = '22023', message = 'Author id is required';
  end if;

  select jsonb_build_object(
    'id', u.id,
    'name', p.full_name,
    'avatar_url', case when p.avatar_url is null then null else pg_catalog.regexp_replace(p.avatar_url, '[?#].*$', '') end,
    'created_at', u.created_at,
    'last_active', u.last_sign_in_at,
    'account_status', case
      when u.banned_until > pg_catalog.now() then 'banned'
      else coalesce(ms.status, 'active')
    end,
    'provider_verification', (select string_agg(distinct p.verification_status, ', ' order by p.verification_status)
      from public.providers p where p.owner_id = u.id),
    'role', coalesce(u.raw_app_meta_data ->> 'role', 'user'),
    'admin_level', u.raw_app_meta_data ->> 'admin_level',
    'email', case when v_contact then u.email else null end,
    'phone', case when v_contact then coalesce(u.phone, p.phone) else null end
  ) into v_profile
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_moderation_status ms on ms.user_id = u.id
  where u.id = $1;
  if v_profile is null then
    raise exception using errcode = 'P0002', message = 'Author not found';
  end if;

  select jsonb_build_object(
    'count', count(*),
    'items', coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'name', q.business_name, 'verification_status', q.verification_status,
      'created_at', q.created_at
    ) order by q.created_at desc), '[]'::jsonb)
  ) into v_providers
  from (select id, business_name, verification_status, created_at
        from public.providers where owner_id = $1 order by created_at desc limit 50) q;
  v_providers := jsonb_set(v_providers, '{count}', to_jsonb((select count(*) from public.providers where owner_id = $1)));

  if v_contact then
    select jsonb_build_object(
      'available', true,
      'count', (select count(*) from public.user_moderation_status where user_id = $1)
        + case when v_audit then (select count(*) from public.admin_audit_log where entity_type = 'user' and entity_id = $1::text and action in ('user_suspended','user_active')) else 0 end,
      'items', coalesce((select jsonb_agg(item) from (
        select jsonb_build_object('kind','status','status',s.status,'reason',s.reason,'created_at',s.updated_at) as item, s.updated_at as sort_at
        from public.user_moderation_status s where s.user_id = $1
        union all
        select jsonb_build_object('kind','action','action',a.action,'reason',left(coalesce(a.details->>'reason',''),300),'created_at',a.created_at), a.created_at
        from public.admin_audit_log a where v_audit and a.entity_type = 'user' and a.entity_id = $1::text and a.action in ('user_suspended','user_active')
        order by sort_at desc limit 50
      ) history), '[]'::jsonb)
    ) into v_suspensions;
  else
    v_suspensions := jsonb_build_object('available',false,'count',null,'items','[]'::jsonb);
  end if;

  select jsonb_build_object(
    'available', true,
    'count', (select count(*) from public.community_memberships where user_id = $1)
      + (select count(*) from public.community_member_permissions where user_id = $1)
      + case when v_audit then (select count(*) from public.admin_audit_log where action = 'community_member_privileges' and details->>'user_id' = $1::text) else 0 end,
    'items', coalesce((select jsonb_agg(item) from (
      select jsonb_build_object('kind','membership','space',s.name,'role',m.role,'joined_at',m.joined_at,
        'can_post',coalesce(mp.can_post,true),'can_comment',coalesce(mp.can_comment,true),'restricted_until',mp.restricted_until) as item,
        m.joined_at as sort_at
      from public.community_memberships m join public.community_spaces s on s.id=m.space_id
      left join public.community_member_permissions mp on mp.space_id=m.space_id and mp.user_id=m.user_id
      where m.user_id=$1
      union all
      select jsonb_build_object('kind','restriction','space',s.name,'can_post',mp.can_post,'can_comment',mp.can_comment,
        'restricted_until',mp.restricted_until,'updated_at',mp.updated_at), mp.updated_at
      from public.community_member_permissions mp join public.community_spaces s on s.id=mp.space_id where mp.user_id=$1
      union all
      select jsonb_build_object('kind','admin_action','action',a.action,'created_at',a.created_at,
        'reason',left(coalesce(a.details->>'reason',''),300)), a.created_at
      from public.admin_audit_log a where v_audit and a.action='community_member_privileges' and a.details->>'user_id'=$1::text
      order by sort_at desc limit 50
    ) history), '[]'::jsonb)
  ) into v_privileges;

  select jsonb_build_object('count',count(*),'items',coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,'body',left(q.body,300),'status',q.status,'created_at',q.created_at
  ) order by q.created_at desc),'[]'::jsonb)) into v_posts
  from (select id,body,status,created_at from public.community_posts where author_id=$1 order by created_at desc limit 50) q;
  v_posts := jsonb_set(v_posts, '{count}', to_jsonb((select count(*) from public.community_posts where author_id=$1)));

  select jsonb_build_object('count',count(*),'items',coalesce(jsonb_agg(jsonb_build_object(
    'id',q.id,'post_id',q.post_id,'body',left(q.body,240),'status',q.status,'created_at',q.created_at
  ) order by q.created_at desc),'[]'::jsonb)) into v_comments
  from (select id,post_id,body,status,created_at from public.community_comments where author_id=$1 order by created_at desc limit 50) q;
  v_comments := jsonb_set(v_comments, '{count}', to_jsonb((select count(*) from public.community_comments where author_id=$1)));

  if v_reviews then
    select jsonb_build_object('available',true,'count',count(*),'items',coalesce(jsonb_agg(jsonb_build_object(
      'id',q.id,'provider_id',q.provider_id,'provider',q.business_name,'rating',q.rating,'comment',left(q.comment,240),'created_at',q.created_at
    ) order by q.created_at desc),'[]'::jsonb)) into v_review_activity
    from (select r.id,r.provider_id,p.business_name,r.rating,r.comment,r.created_at from public.reviews r
      join public.providers p on p.id=r.provider_id where r.user_id=$1 order by r.created_at desc limit 50) q;
    v_review_activity := jsonb_set(v_review_activity, '{count}', to_jsonb((select count(*) from public.reviews where user_id=$1)));
  else v_review_activity := jsonb_build_object('available',false,'count',null,'items','[]'::jsonb); end if;

  if v_applications then
    select jsonb_build_object('available',true,'count',count(*),'items',coalesce(jsonb_agg(jsonb_build_object(
      'id',q.id,'provider_id',q.provider_id,'provider',q.business_name,'status',q.status,'created_at',q.created_at
    ) order by q.created_at desc),'[]'::jsonb)) into v_bookings
    from (select b.id,b.provider_id,p.business_name,b.status,b.created_at from public.bookings b
      left join public.providers p on p.id=b.provider_id where b.user_id=$1 order by b.created_at desc limit 50) q;
    v_bookings := jsonb_set(v_bookings, '{count}', to_jsonb((select count(*) from public.bookings where user_id=$1)));
    select jsonb_build_object('available',true,'count',count(*),'items',coalesce(jsonb_agg(jsonb_build_object(
      'id',q.id,'provider_id',q.provider_id,'provider',q.business_name,'status',q.status,'created_at',q.created_at
    ) order by q.created_at desc),'[]'::jsonb)) into v_quotes
    from (select b.id,b.provider_id,p.business_name,b.status,b.created_at from public.quote_requests b
      left join public.providers p on p.id=b.provider_id where b.user_id=$1 order by b.created_at desc limit 50) q;
    v_quotes := jsonb_set(v_quotes, '{count}', to_jsonb((select count(*) from public.quote_requests where user_id=$1)));
  else
    v_bookings := jsonb_build_object('available',false,'count',null,'items','[]'::jsonb);
    v_quotes := jsonb_build_object('available',false,'count',null,'items','[]'::jsonb);
  end if;

  if v_reports then
    select jsonb_build_object('available',true,'count',count(*),'items',coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)) into v_reports_filed
    from (select jsonb_build_object('kind','community','id',r.id,'post_id',r.post_id,'comment_id',r.comment_id,'reason',r.reason,'status',r.status,'created_at',r.created_at) item,r.created_at as sort_at
      from public.community_post_reports r where r.reporter_id=$1
      union all
      select jsonb_build_object('kind','provider','id',r.id,'provider_id',r.provider_id,'reason',r.reason,'status',r.status,'created_at',r.created_at),r.created_at
      from public.provider_reports r where r.reporter_id=$1
      order by sort_at desc limit 50) q;
    v_reports_filed := jsonb_set(v_reports_filed, '{count}', to_jsonb(
      (select count(*) from public.community_post_reports where reporter_id=$1)
      + (select count(*) from public.provider_reports where reporter_id=$1)));
    select jsonb_build_object('available',true,'count',count(*),'items',coalesce(jsonb_agg(item order by sort_at desc),'[]'::jsonb)) into v_reports_against
    from (select jsonb_build_object('kind','community','id',r.id,'post_id',r.post_id,'comment_id',r.comment_id,'reason',r.reason,'status',r.status,'created_at',r.created_at) item,r.created_at as sort_at
      from public.community_post_reports r left join public.community_posts p on p.id=r.post_id left join public.community_comments c on c.id=r.comment_id
      where coalesce(c.author_id,p.author_id)=$1
      union all
      select jsonb_build_object('kind','provider','id',r.id,'provider_id',r.provider_id,'reason',r.reason,'status',r.status,'created_at',r.created_at),r.created_at
      from public.provider_reports r join public.providers p on p.id=r.provider_id where p.owner_id=$1
      order by sort_at desc limit 50) q;
    v_reports_against := jsonb_set(v_reports_against, '{count}', to_jsonb(
      (select count(*) from public.community_post_reports r left join public.community_posts p on p.id=r.post_id left join public.community_comments c on c.id=r.comment_id where coalesce(c.author_id,p.author_id)=$1)
      + (select count(*) from public.provider_reports r join public.providers p on p.id=r.provider_id where p.owner_id=$1)));
  else
    v_reports_filed := jsonb_build_object('available',false,'count',null,'items','[]'::jsonb);
    v_reports_against := jsonb_build_object('available',false,'count',null,'items','[]'::jsonb);
  end if;

  if v_notifications then
    select jsonb_build_object('available',true,'count',count(*),'items',coalesce(jsonb_agg(jsonb_build_object(
      'id',q.id,'title',q.title,'read_at',q.read_at,'created_at',q.created_at
    ) order by q.created_at desc),'[]'::jsonb)) into v_received_notifications
    from (select id,title,read_at,created_at from public.notifications where user_id=$1 order by created_at desc limit 50) q;
    v_received_notifications := jsonb_set(v_received_notifications, '{count}', to_jsonb((select count(*) from public.notifications where user_id=$1)));
  else v_received_notifications := jsonb_build_object('available',false,'count',null,'items','[]'::jsonb); end if;

  if v_audit then
    select jsonb_build_object('available',true,'count',count(*),'items',coalesce(jsonb_agg(jsonb_build_object(
      'id',q.id,'action',q.action,'entity_type',q.entity_type,'entity_id',q.entity_id,'created_at',q.created_at
    ) order by q.created_at desc),'[]'::jsonb)) into v_moderation_actions
    from (select a.id,a.action,a.entity_type,a.entity_id,a.created_at from public.admin_audit_log a
      where (a.entity_type='user' and a.entity_id=$1::text)
        or (a.entity_type='community_post' and a.entity_id in (select id::text from public.community_posts where author_id=$1))
        or (a.entity_type='community_comment' and a.entity_id in (select id::text from public.community_comments where author_id=$1))
        or (a.entity_type='provider' and a.entity_id in (select id::text from public.providers where owner_id=$1))
      order by a.created_at desc limit 50) q;
  else v_moderation_actions := jsonb_build_object('available',false,'count',null,'items','[]'::jsonb); end if;

  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  values(auth.uid(),'view_author_profile','user',$1::text,jsonb_build_object('viewed_author_id',$1));

  return jsonb_build_object(
    'profile',v_profile,'providers',v_providers,'suspensions',v_suspensions,'privileges',v_privileges,
    'activity',jsonb_build_object('posts',v_posts,'comments',v_comments,'reviews',v_review_activity,
      'bookings',v_bookings,'quotes',v_quotes,'reports_filed',v_reports_filed,'reports_against',v_reports_against,
      'notifications',v_received_notifications,'moderation_actions',v_moderation_actions)
  );
end;
$$;

revoke all on function public.admin_get_author_profile(uuid) from public, anon;
grant execute on function public.admin_get_author_profile(uuid) to authenticated;