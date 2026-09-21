begin;
create extension if not exists pgtap with schema extensions;
select plan(13);

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

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
select is((select count(*)::integer from public.bookings where id='50000000-0000-4000-8000-000000000001'),1,'customer reads own booking');
select throws_ok(
  $$update public.bookings set status='cancelled',provider_message='forged' where id='50000000-0000-4000-8000-000000000001'$$,
  '42501','Customers may only cancel their own booking','customer cannot forge provider response'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,service_id,requested_date,requested_time,status) values('10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000002',current_date+8,'11:00','pending')$$,
  '23514','Selected service does not belong to this provider','booking service must belong to provider'
);
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
