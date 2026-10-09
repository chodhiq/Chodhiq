begin;
create extension if not exists pgtap with schema extensions;
select plan(26);
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
('91900000-0000-4000-8000-000000000001','authenticated','authenticated','community-a@example.test','{}','{}'),
('91900000-0000-4000-8000-000000000002','authenticated','authenticated','community-b@example.test','{}','{}'),
('91900000-0000-4000-8000-000000000003','authenticated','authenticated','community-admin@example.test','{"role":"admin"}','{}');
insert into public.community_spaces(id,slug,name,visibility) values
('91900000-0000-4000-8000-000000000010','test-public','Test public','public'),
('91900000-0000-4000-8000-000000000011','test-private','Test private','private');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91900000-0000-4000-8000-000000000003","app_metadata":{"role":"admin"}}',true);
insert into public.community_memberships(space_id,user_id,role) values
('91900000-0000-4000-8000-000000000010','91900000-0000-4000-8000-000000000001','moderator'),
('91900000-0000-4000-8000-000000000011','91900000-0000-4000-8000-000000000001','member');
select set_config('request.jwt.claims','{"sub":"91900000-0000-4000-8000-000000000001"}',true);
insert into public.community_posts(id,author_id,body,community_id) values
('91900000-0000-4000-8000-000000000020','91900000-0000-4000-8000-000000000001','Public discussion','91900000-0000-4000-8000-000000000010'),
('91900000-0000-4000-8000-000000000021','91900000-0000-4000-8000-000000000001','Private discussion','91900000-0000-4000-8000-000000000011');
select lives_ok($$insert into public.community_posts(id,author_id,body) values('91900000-0000-4000-8000-000000000022','91900000-0000-4000-8000-000000000001','Legacy General post')$$,'legacy posts default to General');
select is((select s.slug from public.community_posts p join public.community_spaces s on s.id=p.community_id where p.id='91900000-0000-4000-8000-000000000022'),'general','General assigned');
reset role;
set local role anon;
select set_config('request.jwt.claims','{}',true);
select is((select count(*)::int from public.community_posts where id='91900000-0000-4000-8000-000000000020'),1,'guest reads public post');
select is((select count(*)::int from public.community_posts where id='91900000-0000-4000-8000-000000000021'),0,'guest cannot read private post');
select is((select count(*)::int from public.community_post_engagement() where post_id='91900000-0000-4000-8000-000000000021'),0,'guest aggregates hide private post');
reset role;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"91900000-0000-4000-8000-000000000002"}',true);
select is((select count(*)::int from public.community_post_engagement() where post_id='91900000-0000-4000-8000-000000000021'),0,'nonmember aggregates hide private post');
select throws_ok($$insert into public.community_posts(author_id,body,community_id) values('91900000-0000-4000-8000-000000000002','Not a member','91900000-0000-4000-8000-000000000010')$$,'42501',null,'nonmember cannot post');
select throws_ok($$insert into public.community_post_likes(post_id,user_id) values('91900000-0000-4000-8000-000000000021','91900000-0000-4000-8000-000000000002')$$,'42501',null,'private post vote denied');
select throws_ok($$insert into public.community_saved_posts(post_id,user_id) values('91900000-0000-4000-8000-000000000021','91900000-0000-4000-8000-000000000002')$$,'42501',null,'private post save denied');
select lives_ok($$insert into public.community_memberships(space_id,user_id) values('91900000-0000-4000-8000-000000000010','91900000-0000-4000-8000-000000000002')$$,'user joins public space');
select throws_ok($$insert into public.community_memberships(space_id,user_id,role) values('91900000-0000-4000-8000-000000000011','91900000-0000-4000-8000-000000000002','moderator')$$,'42501',null,'user cannot self-assign moderator');
select lives_ok($$insert into public.community_comments(id,post_id,author_id,body) values('91900000-0000-4000-8000-000000000030','91900000-0000-4000-8000-000000000020','91900000-0000-4000-8000-000000000002','Top-level comment')$$,'member comments');
select lives_ok($$insert into public.community_comments(post_id,author_id,body,parent_comment_id) values('91900000-0000-4000-8000-000000000020','91900000-0000-4000-8000-000000000002','Reply','91900000-0000-4000-8000-000000000030')$$,'same-post reply');
select throws_ok($$insert into public.community_comments(post_id,author_id,body,parent_comment_id) values('91900000-0000-4000-8000-000000000022','91900000-0000-4000-8000-000000000002','Wrong thread','91900000-0000-4000-8000-000000000030')$$,'22023',null,'cross-post reply denied');
insert into public.community_post_likes(post_id,user_id) values('91900000-0000-4000-8000-000000000020','91900000-0000-4000-8000-000000000002');
select throws_ok($$insert into public.community_post_likes(post_id,user_id) values('91900000-0000-4000-8000-000000000020','91900000-0000-4000-8000-000000000002')$$,'23505',null,'duplicate vote denied');
select is((select like_count from public.community_post_engagement() where post_id='91900000-0000-4000-8000-000000000020'),1::bigint,'vote counted');
select lives_ok($$insert into public.community_saved_posts(post_id,user_id) values('91900000-0000-4000-8000-000000000020','91900000-0000-4000-8000-000000000002')$$,'member saves post');
select throws_ok($$select public.community_moderate_post('91900000-0000-4000-8000-000000000020','published','removed','Moderation reason')$$,'42501',null,'ordinary member cannot moderate');
select set_config('request.jwt.claims','{"sub":"91900000-0000-4000-8000-000000000001"}',true);
select is((select count(*)::int from public.community_saved_posts where user_id='91900000-0000-4000-8000-000000000002'),0,'saved posts stay private');
select lives_ok($$select public.community_moderate_comment('91900000-0000-4000-8000-000000000030','published','removed','Moderation reason')$$,'space moderator removes comment');
select throws_ok($$select public.community_moderate_post('91900000-0000-4000-8000-000000000021','published','removed','Moderation reason')$$,'42501',null,'moderator cannot act outside own space');
select set_config('request.jwt.claims','{"sub":"91900000-0000-4000-8000-000000000002"}',true);
insert into public.community_user_blocks(blocker_id,blocked_id) values('91900000-0000-4000-8000-000000000002','91900000-0000-4000-8000-000000000001');
select is((select count(*)::int from public.community_posts where id='91900000-0000-4000-8000-000000000020'),0,'blocked author hidden');
select throws_ok($$insert into public.community_comments(post_id,author_id,body) values('91900000-0000-4000-8000-000000000020','91900000-0000-4000-8000-000000000002','Blocked interaction')$$,'42501',null,'blocked comment denied');
select lives_ok($$insert into public.community_post_reports(post_id,reporter_id,reason) values('91900000-0000-4000-8000-000000000020','91900000-0000-4000-8000-000000000002','spam_or_scam')$$,'reporting blocked content remains available');
select set_config('request.jwt.claims','{"sub":"91900000-0000-4000-8000-000000000001"}',true);
insert into public.community_posts(author_id,body) values('91900000-0000-4000-8000-000000000001','Fourth post'),('91900000-0000-4000-8000-000000000001','Fifth post');
select throws_ok($$insert into public.community_posts(author_id,body) values('91900000-0000-4000-8000-000000000001','Sixth post')$$,'P0001',null,'direct inserts respect post limit');
select set_config('request.jwt.claims','{"sub":"91900000-0000-4000-8000-000000000003","app_metadata":{"role":"admin"}}',true);
select lives_ok($$select public.community_moderate_post('91900000-0000-4000-8000-000000000021','published','removed','Moderation reason')$$,'platform admin moderates private space');
select * from finish();
rollback;
