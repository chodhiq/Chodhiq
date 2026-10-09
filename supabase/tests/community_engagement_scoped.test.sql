begin;
create extension if not exists pgtap with schema extensions;
select plan(11);
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
('96300000-0000-4000-8000-000000000001','authenticated','authenticated','scoped-author@example.test','{}','{}'),
('96300000-0000-4000-8000-000000000002','authenticated','authenticated','scoped-viewer@example.test','{}','{}'),
('96300000-0000-4000-8000-000000000003','authenticated','authenticated','scoped-private@example.test','{}','{}'),
('96300000-0000-4000-8000-000000000004','authenticated','authenticated','scoped-admin@example.test','{"role":"admin"}','{}');
insert into public.community_spaces(id,slug,name,visibility) values('96300000-0000-4000-8000-000000000010','scoped-private','Scoped private','private');
select set_config('request.jwt.claims','{"sub":"96300000-0000-4000-8000-000000000003"}',true);
insert into public.community_memberships(space_id,user_id,role) values('96300000-0000-4000-8000-000000000010','96300000-0000-4000-8000-000000000003','member');
insert into public.community_posts(id,community_id,author_id,body) values('96300000-0000-4000-8000-000000000021','96300000-0000-4000-8000-000000000010','96300000-0000-4000-8000-000000000003','Private scoped fixture');
select set_config('request.jwt.claims','{"sub":"96300000-0000-4000-8000-000000000001"}',true);
insert into public.community_posts(id,author_id,body) values('96300000-0000-4000-8000-000000000020','96300000-0000-4000-8000-000000000001','Public scoped fixture');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"96300000-0000-4000-8000-000000000002"}',true);
insert into public.community_post_likes(post_id,user_id) values('96300000-0000-4000-8000-000000000020','96300000-0000-4000-8000-000000000002');
insert into public.community_comments(id,post_id,author_id,body) values('96300000-0000-4000-8000-000000000030','96300000-0000-4000-8000-000000000020','96300000-0000-4000-8000-000000000002','Scoped comment fixture');
select is((select count(*)::integer from public.community_post_engagement_for_posts(array['96300000-0000-4000-8000-000000000020']::uuid[])),1,'only requested readable post returned');
select is((select like_count from public.community_post_engagement_for_posts(array['96300000-0000-4000-8000-000000000020']::uuid[])),1::bigint,'like aggregate is correct');
select is((select is_liked from public.community_post_engagement_for_posts(array['96300000-0000-4000-8000-000000000020']::uuid[])),true,'caller own reaction is correct');
select is((select comment_count from public.community_post_engagement_for_posts(array['96300000-0000-4000-8000-000000000020']::uuid[])),1::bigint,'published comment counted');
select is((select count(*)::integer from public.community_post_engagement_for_posts('{}'::uuid[])),0,'empty request returns nothing');
select throws_ok($q$select public.community_post_engagement_for_posts(array_fill('96300000-0000-4000-8000-000000000020'::uuid,array[101]))$q$,'22023','Request engagement for at most 100 posts','large requests are bounded');
select is((select count(*)::integer from public.community_post_engagement_for_posts(array['96300000-0000-4000-8000-000000000021']::uuid[])),0,'private post excluded for nonmembers');
select set_config('request.jwt.claims','{"sub":"96300000-0000-4000-8000-000000000004","app_metadata":{"role":"admin"}}',true);
select public.admin_transition_community_comment('96300000-0000-4000-8000-000000000030','published','removed','Scoped test removal');
select is((select comment_count from public.community_post_engagement_for_posts(array['96300000-0000-4000-8000-000000000020']::uuid[])),0::bigint,'removed comment excluded');
select set_config('request.jwt.claims','{"sub":"96300000-0000-4000-8000-000000000002"}',true);
insert into public.community_user_blocks(blocker_id,blocked_id) values('96300000-0000-4000-8000-000000000002','96300000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.community_post_engagement_for_posts(array['96300000-0000-4000-8000-000000000020']::uuid[])),0,'blocked post excluded');
set local role anon;select set_config('request.jwt.claims','{}',true);
select is((select count(*)::integer from public.community_post_engagement_for_posts(array['96300000-0000-4000-8000-000000000020']::uuid[])),1,'guest sees public aggregate');
select is((select count(*)::integer from public.community_post_engagement_for_posts(array['96300000-0000-4000-8000-000000000021']::uuid[])),0,'guest cannot see private aggregate');
reset role;select * from finish();rollback;
