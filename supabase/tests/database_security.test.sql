begin;
create extension if not exists pgtap with schema extensions;
select plan(29);

insert into auth.users(id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
('10000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','customer-a@example.test','',now(),'{}','{}',now(),now()),
('10000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','customer-b@example.test','',now(),'{}','{}',now(),now()),
('10000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner@example.test','',now(),'{}','{}',now(),now()),
('10000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner-two@example.test','',now(),'{}','{}',now(),now()),
('10000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@example.test','',now(),'{"role":"admin"}','{}',now(),now());

insert into public.categories(id,name,slug,icon,color)
values('20000000-0000-4000-8000-000000000001','Test category','test-category','briefcase','#000000');
insert into public.providers(id,owner_id,business_name,category_id,base_city,is_verified,is_claimed,verification_status)
values
('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Provider One','20000000-0000-4000-8000-000000000001','Birmingham',true,true,'verified'),
('30000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000004','Provider Two','20000000-0000-4000-8000-000000000001','Leeds',true,true,'verified'),
('30000000-0000-4000-8000-000000000003',null,'Imported Provider','20000000-0000-4000-8000-000000000001','London',false,false,'unverified');
update public.providers set source_profile_id='integration-import-1' where id='30000000-0000-4000-8000-000000000003';
insert into public.services(id,provider_id,name) values
('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Service One'),
('40000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','Service Two');
insert into public.bookings(id,user_id,provider_id,service_id,requested_date,requested_time,status)
values('50000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',current_date+7,'10:00','pending');
insert into public.reviews(id,provider_id,user_id,rating,comment)
values('60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001',5,'Security test review');
insert into public.review_replies(id,review_id,provider_id,author_id,body)
values('70000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000003','Security test reply');
insert into public.edge_rate_limits(scope,identifier,bucket_started_at,request_count)
select
  'customer-quote-requests',
  '10000000-0000-4000-8000-000000000001',
  to_timestamp(floor(extract(epoch from clock_timestamp()) / 3600) * 3600) + bucket_offset * interval '1 hour',
  5
from generate_series(0,1) as bucket_offset;

set local role anon;
select is((select count(*)::integer from public.categories where id='20000000-0000-4000-8000-000000000001'),1,'anonymous user reads categories');
select is((select count(*)::integer from public.reviews where id='60000000-0000-4000-8000-000000000001'),1,'anonymous user reads reviews');
select throws_ok(
  $$insert into public.quote_requests(user_id,provider_id,message,preferred_contact) values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Anonymous request','email')$$,
  '42501',null,'anonymous user cannot insert a quote request'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::integer from public.categories where id='20000000-0000-4000-8000-000000000001'),1,'authenticated user reads categories');
select is((select count(*)::integer from public.reviews where id='60000000-0000-4000-8000-000000000001'),1,'authenticated user reads reviews');
select is((select count(*)::integer from public.bookings where id='50000000-0000-4000-8000-000000000001'),1,'customer reads own booking');
select lives_ok(
  $$update public.profiles set full_name='Updated customer' where id='10000000-0000-4000-8000-000000000001'$$,
  'customer can update their own profile'
);
select is((select count(*)::integer from public.profiles where id='10000000-0000-4000-8000-000000000002'),0,'customer cannot read another profile');
select lives_ok(
  $$update public.profiles set full_name='Forged customer' where id='10000000-0000-4000-8000-000000000002'$$,
  'cross-account profile update request completes without exposing an error'
);
reset role;
select is(
  (select count(*)::integer from public.profiles where id='10000000-0000-4000-8000-000000000002' and full_name='Forged customer'),
  0,'customer cannot change another profile'
);
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok(
  $$insert into public.saved_items(user_id,provider_id) values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001')$$,
  'customer can save a provider for their own account'
);
select throws_ok(
  $$insert into public.saved_items(user_id,provider_id) values('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001')$$,
  '42501',null,'customer cannot save a provider for another account'
);
select is((select count(*)::integer from public.saved_items where user_id='10000000-0000-4000-8000-000000000002'),0,'customer cannot read another account saved items');
select throws_ok(
  $$update public.bookings set status='cancelled',provider_message='forged' where id='50000000-0000-4000-8000-000000000001'$$,
  '42501','Customers may only cancel their own booking','customer cannot forge provider response'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,service_id,requested_date,requested_time,status) values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002',current_date+8,'11:00','pending')$$,
  '23514','Selected service does not belong to this provider','booking service must belong to provider'
);
select throws_ok(
  $$insert into public.quote_requests(user_id,provider_id,message,preferred_contact) values('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Forged customer request','email')$$,
  '42501', 'Quote requests require the signed-in account', 'customer cannot create a quote for another account'
);
select throws_ok(
  $$insert into public.quote_requests(user_id,provider_id,message,preferred_contact) values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Valid test request','email')$$,
  'P0001', 'Quote request limit reached; try again later', 'customer quote creation is rate limited'
);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select lives_ok(
  $$insert into public.quote_requests(user_id,provider_id,message,preferred_contact) values('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Own customer request','email')$$,
  'customer can create their own quote request'
);
select throws_ok(
  $$insert into public.quote_requests(user_id,provider_id,message,preferred_contact) values('10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Missing contact preference',null)$$,
  '23514',null,'quote request requires an allowed contact preference'
);
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select lives_ok(
  $$insert into public.app_error_events(message,error_name,platform,app_area) values('Safe message','Error','android','test')$$,
  'authenticated user can submit own telemetry'
);
select throws_ok(
  $$insert into public.app_error_events(user_id,message,error_name,platform,app_area) values('10000000-0000-4000-8000-000000000002','Unsafe','Error','android','test')$$,
  '42501',null,'user cannot submit telemetry for another account'
);

select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
select is((select count(*)::integer from public.bookings where id='50000000-0000-4000-8000-000000000001'),0,'another customer cannot read the booking');
select lives_ok(
  $$select * from public.claim_imported_provider('30000000-0000-4000-8000-000000000003')$$,
  'claim request can be opened'
);
reset role;
select is((select owner_id from public.providers where id='30000000-0000-4000-8000-000000000003'),null::uuid,'claim does not assign ownership before approval');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated","app_metadata":{"role":"admin"}}',true);
select lives_ok(
  $$insert into public.categories(id,name,slug,icon,color) values('20000000-0000-4000-8000-000000000002','Admin category','admin-category','briefcase','#000000')$$,
  'administrator can create categories'
);
select lives_ok(
  $$update public.categories set name='Admin category updated' where id='20000000-0000-4000-8000-000000000002'$$,
  'administrator can update categories'
);
select lives_ok(
  $$delete from public.categories where id='20000000-0000-4000-8000-000000000002'$$,
  'administrator can delete categories'
);
select lives_ok(
  $$update public.reviews set moderation_status='removed' where id='60000000-0000-4000-8000-000000000001'$$,
  'administrator can moderate reviews'
);
select lives_ok(
  $$delete from public.review_replies where id='70000000-0000-4000-8000-000000000001'$$,
  'administrator can delete provider review replies'
);

select * from finish();
rollback;
