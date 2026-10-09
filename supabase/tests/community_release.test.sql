begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
select ('92900000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,'authenticated','authenticated','community-release-'||n||'@example.test',
case when n=3 then '{"role":"admin"}'::jsonb else '{}'::jsonb end,'{}'::jsonb from generate_series(1,5) n;
insert into public.community_spaces(id,slug,name) values
('92900000-0000-4000-8000-000000000010','release-test','Release test'),
('92900000-0000-4000-8000-000000000011','release-other','Release other');
insert into public.providers(id,owner_id,business_name,category_id,base_city,is_claimed,is_verified,verification_status)
select '92900000-0000-4000-8000-000000000040','92900000-0000-4000-8000-000000000001','Community test provider',id,'London',true,true,'verified'
from public.categories order by id limit 1;
insert into public.provider_entitlements(provider_id,offers_active,expires_at) values('92900000-0000-4000-8000-000000000040',true,now()+interval '30 days');
create function pg_temp.seed_limit(action_name text,maximum int,seconds int) returns void
language plpgsql security definer set search_path=pg_catalog,public as $$
begin
 delete from public.community_rate_limit_buckets where user_id=auth.uid();
 insert into public.community_rate_limit_buckets(user_id,action,window_started_at,request_count)
 values(auth.uid(),action_name,to_timestamp(floor(extract(epoch from now())/seconds)*seconds),maximum-1);
end $$;
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000001"}',true);
insert into public.community_posts(id,author_id,body) values('92900000-0000-4000-8000-000000000020','92900000-0000-4000-8000-000000000001','Queued offline payload');
select lives_ok($$update public.community_posts set body='Edited by author' where id='92900000-0000-4000-8000-000000000020'$$,'author edits own published post');
select is((select body from public.community_posts where id='92900000-0000-4000-8000-000000000020'),'Edited by author','author edit persisted');
select throws_ok($$update public.community_posts set post_type='promotion',provider_id='92900000-0000-4000-8000-000000000040',image_url='https://example.test/poster.jpg' where id='92900000-0000-4000-8000-000000000020'$$,'42501',null,'author cannot bypass promotion entitlement through edit');
select throws_ok($$update public.community_posts set community_id='92900000-0000-4000-8000-000000000011' where id='92900000-0000-4000-8000-000000000020'$$,'42501',null,'post cannot move between spaces through edit');
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000002"}',true);
update public.community_posts set body='Forged edit' where id='92900000-0000-4000-8000-000000000020';
delete from public.community_posts where id='92900000-0000-4000-8000-000000000020';
select is((select body from public.community_posts where id='92900000-0000-4000-8000-000000000020'),'Edited by author','another member cannot edit or delete post');
insert into public.community_comments(id,post_id,author_id,body) values('92900000-0000-4000-8000-000000000030','92900000-0000-4000-8000-000000000020','92900000-0000-4000-8000-000000000002','Reported comment');
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000001"}',true);
insert into public.community_post_reports(id,post_id,comment_id,reporter_id,reason) values('92900000-0000-4000-8000-000000000050','92900000-0000-4000-8000-000000000020','92900000-0000-4000-8000-000000000030','92900000-0000-4000-8000-000000000001','harassment_or_hate');
select throws_ok($$select public.admin_resolve_report('community','92900000-0000-4000-8000-000000000050','open',null,'resolved','Verified harmful comment')$$,'42501',null,'ordinary reporter cannot resolve comment report');
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000003","app_metadata":{"role":"admin"}}',true);
select throws_ok($$select public.admin_resolve_report('community','92900000-0000-4000-8000-000000000050','reviewing',null,'resolved','Verified harmful comment')$$,'40001',null,'stale report status rejected');
select throws_ok($$select public.admin_resolve_report('community','92900000-0000-4000-8000-000000000050','open','2000-01-01','resolved','Verified harmful comment')$$,'40001',null,'stale report timestamp rejected');
select lives_ok($$select public.admin_resolve_report('community','92900000-0000-4000-8000-000000000050','open',null,'resolved','Verified harmful comment')$$,'admin resolves comment report');
select is((select status from public.community_comments where id='92900000-0000-4000-8000-000000000030'),'removed','resolution removes comment');
select is((select status from public.community_posts where id='92900000-0000-4000-8000-000000000020'),'published','comment resolution preserves parent post');
select ok(exists(select 1 from public.admin_audit_log where entity_id='92900000-0000-4000-8000-000000000050' and details->>'target_type'='community_comment'),'resolution audited with comment target');
select throws_ok($$select public.admin_resolve_report('community','92900000-0000-4000-8000-000000000050','resolved',null,'resolved','Verified harmful comment')$$,'40001',null,'repeated resolution rejected');
select lives_ok($$select public.community_moderate_post('92900000-0000-4000-8000-000000000020','published','removed','Verified harmful post')$$,'admin removes post');
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000001"}',true);
update public.community_posts set status='published' where id='92900000-0000-4000-8000-000000000020';
reset role;
select is((select status from public.community_posts where id='92900000-0000-4000-8000-000000000020'),'removed','author cannot republish moderated content');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000001"}',true);
select lives_ok($$insert into public.community_posts(author_id,provider_id,post_type,body,image_url) values('92900000-0000-4000-8000-000000000001','92900000-0000-4000-8000-000000000040','promotion','First promotion','https://example.test/poster.jpg')$$,'active owner publishes promotion');
select lives_ok($$insert into public.community_posts(author_id,provider_id,post_type,body,image_url) values('92900000-0000-4000-8000-000000000001','92900000-0000-4000-8000-000000000040','promotion','Second promotion','https://example.test/poster.jpg'),('92900000-0000-4000-8000-000000000001','92900000-0000-4000-8000-000000000040','promotion','Third promotion','https://example.test/poster.jpg')$$,'three monthly promotions allowed');
select throws_ok($$insert into public.community_posts(author_id,provider_id,post_type,body,image_url) values('92900000-0000-4000-8000-000000000001','92900000-0000-4000-8000-000000000040','promotion','Fourth promotion','https://example.test/poster.jpg')$$,'P0001','Monthly allowance of 3 promotional posters has been used','fourth promotion rejected');
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000002"}',true);
select throws_ok($$insert into public.community_posts(author_id,provider_id,post_type,body,image_url) values('92900000-0000-4000-8000-000000000002','92900000-0000-4000-8000-000000000040','promotion','Forged promotion','https://example.test/poster.jpg')$$,'P0001','Only the business owner can publish this promotion','nonowner promotion rejected');
reset role;
update public.provider_entitlements set expires_at=null where provider_id='92900000-0000-4000-8000-000000000040';
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000001"}',true);
select throws_ok($$insert into public.community_posts(author_id,provider_id,post_type,body,image_url) values('92900000-0000-4000-8000-000000000001','92900000-0000-4000-8000-000000000040','promotion','No expiry promotion','https://example.test/poster.jpg')$$,'P0001',null,'missing entitlement expiry rejected');
reset role;
update public.provider_entitlements set expires_at=now()-interval '1 day' where provider_id='92900000-0000-4000-8000-000000000040';
set local role authenticated;
select throws_ok($$insert into public.community_posts(author_id,provider_id,post_type,body,image_url) values('92900000-0000-4000-8000-000000000001','92900000-0000-4000-8000-000000000040','promotion','Expired promotion','https://example.test/poster.jpg')$$,'P0001',null,'expired entitlement rejected');
select pg_temp.seed_limit('post_10m',5,600);
select lives_ok($$insert into public.community_posts(author_id,body) values('92900000-0000-4000-8000-000000000001','At ten-minute limit')$$,'fifth post allowed');
select throws_ok($$insert into public.community_posts(author_id,body) values('92900000-0000-4000-8000-000000000001','Above ten-minute limit')$$,'P0001','Community action limit reached. Please try again later.','sixth post rejected');
select pg_temp.seed_limit('post_24h',20,86400);
select lives_ok($$insert into public.community_posts(author_id,body) values('92900000-0000-4000-8000-000000000001','At daily limit')$$,'twentieth daily post allowed');
select throws_ok($$insert into public.community_posts(author_id,body) values('92900000-0000-4000-8000-000000000001','Above daily limit')$$,'P0001','Community action limit reached. Please try again later.','twenty-first daily post rejected');
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000002"}',true);
-- Use one of the author's published promotions as a stable comment/report target.
reset role;
create temp table release_target as select id from public.community_posts where author_id='92900000-0000-4000-8000-000000000001' and post_type='promotion' order by id limit 1;
grant select on release_target to authenticated;
set local role authenticated;

select lives_ok($$insert into public.community_comments(id,post_id,author_id,body) select '92900000-0000-4000-8000-000000000031',id,'92900000-0000-4000-8000-000000000002','Author deletion test' from release_target$$,'author creates deletable comment');
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000001"}',true);
delete from public.community_comments where id='92900000-0000-4000-8000-000000000031';
select is((select count(*)::int from public.community_comments where id='92900000-0000-4000-8000-000000000031'),1,'another author cannot delete comment');
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000002"}',true);
select lives_ok($$delete from public.community_comments where id='92900000-0000-4000-8000-000000000031'$$,'author deletes own comment');
select is((select count(*)::int from public.community_comments where id='92900000-0000-4000-8000-000000000031'),0,'comment deletion persisted');

select pg_temp.seed_limit('comment_10m',20,600);
select lives_ok($$insert into public.community_comments(post_id,author_id,body) select id,'92900000-0000-4000-8000-000000000002','At comment limit' from release_target$$,'twentieth comment allowed');
select throws_ok($$insert into public.community_comments(post_id,author_id,body) select id,'92900000-0000-4000-8000-000000000002','Above comment limit' from release_target$$,'P0001','Community action limit reached. Please try again later.','twenty-first comment rejected');
select pg_temp.seed_limit('comment_24h',100,86400);
select lives_ok($$insert into public.community_comments(post_id,author_id,body) select id,'92900000-0000-4000-8000-000000000002','At daily comment limit' from release_target$$,'hundredth daily comment allowed');
select throws_ok($$insert into public.community_comments(post_id,author_id,body) select id,'92900000-0000-4000-8000-000000000002','Above daily comment limit' from release_target$$,'P0001','Community action limit reached. Please try again later.','hundred-and-first comment rejected');
select pg_temp.seed_limit('report_1h',5,3600);
select lives_ok($$insert into public.community_post_reports(post_id,reporter_id,reason) select id,'92900000-0000-4000-8000-000000000002','spam_or_scam' from release_target$$,'fifth report allowed');
select throws_ok($$insert into public.community_post_reports(post_id,reporter_id,reason) values('92900000-0000-4000-8000-000000000020','92900000-0000-4000-8000-000000000002','spam_or_scam')$$,'P0001','Community action limit reached. Please try again later.','sixth report rejected');
select pg_temp.seed_limit('membership_24h',20,86400);
select lives_ok($$insert into public.community_memberships(space_id,user_id) values('92900000-0000-4000-8000-000000000010','92900000-0000-4000-8000-000000000002')$$,'twentieth join allowed');
select throws_ok($$insert into public.community_memberships(space_id,user_id) values('92900000-0000-4000-8000-000000000011','92900000-0000-4000-8000-000000000002')$$,'P0001','Community action limit reached. Please try again later.','twenty-first join rejected');
select pg_temp.seed_limit('membership_24h',21,86400);
select lives_ok($$insert into public.community_comments(post_id,author_id,body) select id,'92900000-0000-4000-8000-000000000002','Existing General member at join limit' from release_target$$,'General comments do not consume additional join allowance');
reset role;
select is((select request_count from public.community_rate_limit_buckets where user_id='92900000-0000-4000-8000-000000000002' and action='membership_24h'),20,'automatic membership preserves join count');
set local role authenticated;
select pg_temp.seed_limit('block_24h',20,86400);
select lives_ok($$insert into public.community_user_blocks(blocker_id,blocked_id) values('92900000-0000-4000-8000-000000000002','92900000-0000-4000-8000-000000000004')$$,'twentieth block allowed');
select throws_ok($$insert into public.community_user_blocks(blocker_id,blocked_id) values('92900000-0000-4000-8000-000000000002','92900000-0000-4000-8000-000000000005')$$,'P0001','Community action limit reached. Please try again later.','twenty-first block rejected');
select throws_ok($$select public.consume_community_rate_limit('92900000-0000-4000-8000-000000000002','post_10m',999999,600)$$,'42501',null,'caller cannot override limiter directly');
select set_config('request.jwt.claims','{"sub":"92900000-0000-4000-8000-000000000001"}',true);
select pg_temp.seed_limit('unused',2,600);
insert into public.community_posts(id,author_id,body) values('92900000-0000-4000-8000-000000000023','92900000-0000-4000-8000-000000000001','Delete me');
select lives_ok($$delete from public.community_posts where id='92900000-0000-4000-8000-000000000023'$$,'author deletes own post');
select is((select count(*)::int from public.community_posts where id='92900000-0000-4000-8000-000000000023'),0,'author deletion persisted');
reset role;
update public.provider_entitlements set offers_active=false,expires_at=now()+interval '30 days' where provider_id='92900000-0000-4000-8000-000000000040';
set local role authenticated;
select throws_ok($$insert into public.community_posts(author_id,provider_id,post_type,body,image_url) values('92900000-0000-4000-8000-000000000001','92900000-0000-4000-8000-000000000040','promotion','Inactive entitlement promotion','https://example.test/poster.jpg')$$,'P0001',null,'inactive entitlement rejected');
select throws_ok($$insert into public.community_posts(author_id,provider_id,post_type,body) values('92900000-0000-4000-8000-000000000001','92900000-0000-4000-8000-000000000040','promotion','Missing poster image')$$,'P0001','Promotional posts require a provider and poster image','promotion requires poster image');
reset role;
update public.provider_entitlements set offers_active=true,offer_period_start=(date_trunc('month',now())-interval '1 month')::date,offer_posts_used=3 where provider_id='92900000-0000-4000-8000-000000000040';
set local role authenticated;
select lives_ok($$insert into public.community_posts(author_id,provider_id,post_type,body,image_url) values('92900000-0000-4000-8000-000000000001','92900000-0000-4000-8000-000000000040','promotion','New-month promotion','https://example.test/poster.jpg')$$,'new month resets exhausted allowance');
reset role;
select is((select offer_posts_used::int from public.provider_entitlements where provider_id='92900000-0000-4000-8000-000000000040'),1,'new month counts first promotion once');
select * from finish();
rollback;
