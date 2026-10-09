begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
insert into auth.users(id,aud,role,email,raw_app_meta_data) values
('96100000-0000-4000-8000-000000000001','authenticated','authenticated','feed-admin@example.test','{"role":"admin"}'),
('96100000-0000-4000-8000-000000000002','authenticated','authenticated','feed-author@example.test','{}');
select set_config('request.jwt.claims','{"sub":"96100000-0000-4000-8000-000000000002"}',true);
insert into public.community_posts(id,author_id,body) values('96100000-0000-4000-8000-000000000010','96100000-0000-4000-8000-000000000002','Admin feed fixture');
insert into public.community_comments(id,post_id,author_id,body) values('96100000-0000-4000-8000-000000000020','96100000-0000-4000-8000-000000000010','96100000-0000-4000-8000-000000000002','Moderation test comment');
set local role authenticated;
select throws_ok($q$select public.admin_transition_community_comment('96100000-0000-4000-8000-000000000020','published','removed','Valid removal reason')$q$,'42501','Administrator access required','ordinary members cannot moderate comments');
select set_config('request.jwt.claims','{"sub":"96100000-0000-4000-8000-000000000001","app_metadata":{"role":"admin"}}',true);
select throws_ok($q$select public.admin_transition_community_comment('96100000-0000-4000-8000-000000000020','published','removed','short')$q$,'P0001','Provide a reason between 8 and 1000 characters','reason is mandatory');
select throws_ok($q$select public.admin_transition_community_comment('96100000-0000-4000-8000-000000000020','published',null,'Valid moderation reason')$q$,'22023','Invalid comment status','null status is rejected');
select lives_ok($q$select public.admin_transition_community_comment('96100000-0000-4000-8000-000000000020','published','removed','Valid removal reason')$q$,'admin removes comment');
select is((select status from public.community_comments where id='96100000-0000-4000-8000-000000000020'),'removed','removed comment remains inspectable by admin');
select throws_ok($q$select public.admin_transition_community_comment('96100000-0000-4000-8000-000000000020','published','removed','Stale removal reason')$q$,'40001','Comment changed. Refresh before moderating.','concurrent stale decision is rejected');
select lives_ok($q$select public.admin_transition_community_comment('96100000-0000-4000-8000-000000000020','removed','published','Valid restoration reason')$q$,'admin restores comment');
reset role;
select is((select count(*)::integer from public.admin_audit_log where entity_id='96100000-0000-4000-8000-000000000020'),2,'only successful decisions are audited');
select * from finish();
rollback;
