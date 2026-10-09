begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
('93900000-0000-4000-8000-000000000001','authenticated','authenticated','offline-owner@example.test','{}','{}'),
('93900000-0000-4000-8000-000000000002','authenticated','authenticated','offline-other@example.test','{}','{}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"93900000-0000-4000-8000-000000000001"}',true);
select lives_ok($$select public.publish_queued_community_post('offline-one','{"author_id":"93900000-0000-4000-8000-000000000001","body":"Offline idempotency test","post_type":"discussion"}')$$,'queued post publishes');
select lives_ok($$select public.publish_queued_community_post('offline-one','{"author_id":"93900000-0000-4000-8000-000000000001","body":"Offline idempotency test","post_type":"discussion"}')$$,'identical queued retry succeeds');
select is((select count(*)::int from public.community_posts where author_id='93900000-0000-4000-8000-000000000001'),1,'retry creates exactly one post');
reset role;
select is((select request_count from public.community_rate_limit_buckets where user_id='93900000-0000-4000-8000-000000000001' and action='post_10m'),1,'retry does not consume posting allowance');
set local role authenticated;
select throws_ok($$select public.publish_queued_community_post('offline-one','{"author_id":"93900000-0000-4000-8000-000000000001","body":"Changed operation"}')$$,'22023','Queued operation payload changed','same operation cannot change payload');
select throws_ok($$select public.publish_queued_community_post('forged','{"author_id":"93900000-0000-4000-8000-000000000002","body":"Forged author"}')$$,'42501',null,'queued author spoof rejected');
select set_config('request.jwt.claims','{"sub":"93900000-0000-4000-8000-000000000002"}',true);
select is((select count(*)::int from public.community_post_sync_receipts where user_id='93900000-0000-4000-8000-000000000001'),0,'receipt stays private');
select lives_ok($$select public.publish_queued_community_post('offline-one','{"author_id":"93900000-0000-4000-8000-000000000002","body":"Second account same operation"}')$$,'operation identity scoped to author');
select set_config('request.jwt.claims','{"sub":"93900000-0000-4000-8000-000000000001"}',true);
delete from public.community_posts where author_id='93900000-0000-4000-8000-000000000001';
select lives_ok($$select public.publish_queued_community_post('offline-one','{"author_id":"93900000-0000-4000-8000-000000000001","body":"Offline idempotency test","post_type":"discussion"}')$$,'late retry of deleted post acknowledges receipt');
select is((select count(*)::int from public.community_posts where author_id='93900000-0000-4000-8000-000000000001'),0,'late retry cannot resurrect deleted post');
select * from finish();
rollback;
