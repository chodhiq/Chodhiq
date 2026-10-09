begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
('94900000-0000-4000-8000-000000000001','authenticated','authenticated','post-author@example.test','{}','{}'),
('94900000-0000-4000-8000-000000000002','authenticated','authenticated','post-member@example.test','{}','{}'),
('94900000-0000-4000-8000-000000000003','authenticated','authenticated','post-outsider@example.test','{}','{}'),
('94900000-0000-4000-8000-000000000004','authenticated','authenticated','post-admin@example.test','{"role":"admin"}','{}');
insert into public.community_spaces(id,slug,name,visibility)
values('94900000-0000-4000-8000-000000000010','notification-private-test','Private test','private');
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000001"}',true);
insert into public.community_memberships(space_id,user_id) values
('94900000-0000-4000-8000-000000000010','94900000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000002"}',true);
insert into public.community_memberships(space_id,user_id) values
('94900000-0000-4000-8000-000000000010','94900000-0000-4000-8000-000000000002');
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000001"}',true);
insert into storage.objects(bucket_id,name) values('community-images','94900000-0000-4000-8000-000000000001/test-photo.jpg');
insert into public.community_posts(id,author_id,community_id,body,image_url) values
('94900000-0000-4000-8000-000000000020','94900000-0000-4000-8000-000000000001','94900000-0000-4000-8000-000000000010','Private notification test','community-image:94900000-0000-4000-8000-000000000001/test-photo.jpg');
select is((select count(*)::int from public.notifications where entity_id='94900000-0000-4000-8000-000000000020' and user_id='94900000-0000-4000-8000-000000000002'),1,'member receives new post notification');
select is((select count(*)::int from public.notifications where entity_id='94900000-0000-4000-8000-000000000020' and user_id='94900000-0000-4000-8000-000000000003'),0,'nonmember receives no private notification');
select is((select count(*)::int from public.notifications where entity_id='94900000-0000-4000-8000-000000000020' and user_id='94900000-0000-4000-8000-000000000001'),0,'author receives no self notification');
update public.community_posts set body='Edited notification test' where id='94900000-0000-4000-8000-000000000020';
select is((select count(*)::int from public.notifications where entity_id='94900000-0000-4000-8000-000000000020'),1,'editing does not duplicate notification');
set local role authenticated;
select is((select count(*)::int from storage.objects where bucket_id='community-images' and name='94900000-0000-4000-8000-000000000001/test-photo.jpg'),1,'author can read uploaded photo');
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000002"}',true);
select is((select count(*)::int from storage.objects where bucket_id='community-images' and name='94900000-0000-4000-8000-000000000001/test-photo.jpg'),1,'private member can read post photo');
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000003"}',true);
select is((select count(*)::int from storage.objects where bucket_id='community-images' and name='94900000-0000-4000-8000-000000000001/test-photo.jpg'),0,'nonmember cannot read private photo');
set local role anon;
select set_config('request.jwt.claims','{}',true);
select is((select count(*)::int from storage.objects where bucket_id='community-images' and name='94900000-0000-4000-8000-000000000001/test-photo.jpg'),0,'guest cannot read private photo');
reset role;
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000002"}',true);
insert into public.community_user_blocks(blocker_id,blocked_id) values
('94900000-0000-4000-8000-000000000002','94900000-0000-4000-8000-000000000001');
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000001"}',true);
insert into public.community_posts(id,author_id,community_id,body) values
('94900000-0000-4000-8000-000000000021','94900000-0000-4000-8000-000000000001','94900000-0000-4000-8000-000000000010','Blocked notification test');
select is((select count(*)::int from public.notifications where entity_id='94900000-0000-4000-8000-000000000021'),0,'blocked member receives no notification');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000002"}',true);
select is((select count(*)::int from storage.objects where bucket_id='community-images' and name='94900000-0000-4000-8000-000000000001/test-photo.jpg'),0,'blocked member cannot read post photo');
reset role;
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000001"}',true);
insert into public.community_posts(id,author_id,body) values('94900000-0000-4000-8000-000000000022','94900000-0000-4000-8000-000000000001','General notification test');
select is((select count(*)::int from public.notifications where entity_id='94900000-0000-4000-8000-000000000022' and user_id='94900000-0000-4000-8000-000000000003'),1,'General notifies another profile without membership');
update public.community_posts set status='removed' where id='94900000-0000-4000-8000-000000000020';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"94900000-0000-4000-8000-000000000004","app_metadata":{"role":"admin"}}',true);
select is((select count(*)::int from storage.objects where bucket_id='community-images' and name='94900000-0000-4000-8000-000000000001/test-photo.jpg'),1,'admin can inspect removed post photo for moderation');
reset role;
select * from finish();
rollback;
