-- Rollback-only integration test. Never commits fixtures or sends Auth emails.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);
insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values
('90900000-0000-4000-8000-000000000001','authenticated','authenticated','application-test@example.test',now(),'{}','{}'),
('90900000-0000-4000-8000-000000000002','authenticated','authenticated','application-other@example.test',now(),'{}','{}'),
('90900000-0000-4000-8000-000000000003','authenticated','authenticated','application-admin@example.test',now(),'{"role":"admin"}','{}');
insert into public.categories(id,name,slug,icon,color,is_active)
values('90900000-0000-4000-8000-000000000010','Application test','application-test-909','briefcase','#000000',true);
insert into storage.objects(bucket_id,name,metadata) values('business-application-proofs',
'90900000-0000-4000-8000-000000000001/90900000-0000-4000-8000-000000000020/proof.pdf','{"mimetype":"application/pdf","size":100}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"90900000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}',true);
select public.submit_business_application('90900000-0000-4000-8000-000000000020','Test Business','90900000-0000-4000-8000-000000000010','London','SW1A 1AA','020 7946 0958',
'90900000-0000-4000-8000-000000000001/90900000-0000-4000-8000-000000000020/proof.pdf','proof.pdf');
select ok((select status='pending' and review_due_at=submitted_at+interval '3 days' and email='application-test@example.test' from public.business_applications where id='90900000-0000-4000-8000-000000000020'),'pending application, confirmed email and three-day deadline');
select public.submit_business_application('90900000-0000-4000-8000-000000000020','Test Business','90900000-0000-4000-8000-000000000010','London','SW1A 1AA','020 7946 0958',
'90900000-0000-4000-8000-000000000001/90900000-0000-4000-8000-000000000020/proof.pdf','proof.pdf');
select ok((select revision=1 from public.business_applications where id='90900000-0000-4000-8000-000000000020'),'retry is idempotent');
select throws_ok(
  $$select public.review_business_application('90900000-0000-4000-8000-000000000020',1,'approved',null)$$,
  '42501',null,'applicant cannot approve their own application'
);
select throws_ok(
  $$update public.business_applications set status='approved'$$,
  '42501',null,'applicant cannot update applications directly'
);
select set_config('request.jwt.claims','{"sub":"90900000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{}}',true);
select ok((select count(*)=0 from public.business_applications),'another user cannot read the application');
select ok((select count(*)=0 from storage.objects where bucket_id='business-application-proofs'),'another user cannot read proof');
select set_config('request.jwt.claims','{"sub":"90900000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"admin"}}',true);
select public.review_business_application('90900000-0000-4000-8000-000000000020',1,'changes_requested','Please upload the complete licence.');
select set_config('request.jwt.claims','{"sub":"90900000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}',true);
select public.submit_business_application('90900000-0000-4000-8000-000000000020','Test Business','90900000-0000-4000-8000-000000000010','London','SW1A 1AA','020 7946 0958',
'90900000-0000-4000-8000-000000000001/90900000-0000-4000-8000-000000000020/proof.pdf','proof.pdf');
select ok((select revision=3 and status='pending' and reviewed_at is null from public.business_applications where id='90900000-0000-4000-8000-000000000020'),'resubmission resets review');
select set_config('request.jwt.claims','{"sub":"90900000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"admin"}}',true);
select throws_ok(
  $$select public.review_business_application('90900000-0000-4000-8000-000000000020',1,'approved',null)$$,
  '40001',null,'administrator cannot approve a stale application revision'
);
select public.review_business_application('90900000-0000-4000-8000-000000000020',3,'approved','Evidence reviewed.');
reset role;
select ok((select count(*)=1 from public.providers where owner_id='90900000-0000-4000-8000-000000000001' and is_verified and verification_status='verified'),'approval provisions one accessible provider');
select ok((select count(*)=2 from public.admin_audit_log where entity_id='90900000-0000-4000-8000-000000000020'),'decisions are audited');
select * from finish();
rollback;
