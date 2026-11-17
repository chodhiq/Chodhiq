-- Rollback-only verification decision integration test. All fixtures,
-- notification rows, and audit rows are removed by the final rollback.
begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values ('96700000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','verification-admin@example.test','',now(),'{"role":"admin"}','{}',now(),now());

insert into public.categories(id,name,slug,icon,color,is_active)
values ('96700000-0000-4000-8000-000000000010','Verification workflow test','verification-workflow-test-967','briefcase','#000000',true);

insert into public.providers(id,owner_id,business_name,category_id,base_city,is_verified,is_claimed,verification_status)
values
  ('96700000-0000-4000-8000-000000000020','96700000-0000-4000-8000-000000000001','Approval fixture','96700000-0000-4000-8000-000000000010','London',false,true,'pending'),
  ('96700000-0000-4000-8000-000000000021','96700000-0000-4000-8000-000000000001','Rejection fixture','96700000-0000-4000-8000-000000000010','London',false,true,'pending'),
  ('96700000-0000-4000-8000-000000000022','96700000-0000-4000-8000-000000000001','Changes fixture','96700000-0000-4000-8000-000000000010','London',false,true,'pending'),
  ('96700000-0000-4000-8000-000000000023','96700000-0000-4000-8000-000000000001','Revocation fixture','96700000-0000-4000-8000-000000000010','London',true,true,'verified'),
  ('96700000-0000-4000-8000-000000000024','96700000-0000-4000-8000-000000000001','Approval note fixture','96700000-0000-4000-8000-000000000010','London',false,true,'pending');

insert into public.verification_requests(id,provider_id,submitted_by,status,notes)
values
  ('96700000-0000-4000-8000-000000000030','96700000-0000-4000-8000-000000000020','96700000-0000-4000-8000-000000000001','pending','Approval test'),
  ('96700000-0000-4000-8000-000000000031','96700000-0000-4000-8000-000000000021','96700000-0000-4000-8000-000000000001','pending','Rejection test'),
  ('96700000-0000-4000-8000-000000000032','96700000-0000-4000-8000-000000000022','96700000-0000-4000-8000-000000000001','pending','Changes test'),
  ('96700000-0000-4000-8000-000000000033','96700000-0000-4000-8000-000000000023','96700000-0000-4000-8000-000000000001','approved','Revocation test'),
  ('96700000-0000-4000-8000-000000000034','96700000-0000-4000-8000-000000000024','96700000-0000-4000-8000-000000000001','pending','Approval with note test');

insert into public.verification_documents(id,request_id,provider_id,uploaded_by,document_type,storage_path)
values
  ('96700000-0000-4000-8000-000000000040','96700000-0000-4000-8000-000000000030','96700000-0000-4000-8000-000000000020','96700000-0000-4000-8000-000000000001','business_registration','verification-test/approval.pdf'),
  ('96700000-0000-4000-8000-000000000041','96700000-0000-4000-8000-000000000031','96700000-0000-4000-8000-000000000021','96700000-0000-4000-8000-000000000001','business_registration','verification-test/rejection.pdf'),
  ('96700000-0000-4000-8000-000000000042','96700000-0000-4000-8000-000000000032','96700000-0000-4000-8000-000000000022','96700000-0000-4000-8000-000000000001','business_registration','verification-test/changes.pdf'),
  ('96700000-0000-4000-8000-000000000043','96700000-0000-4000-8000-000000000034','96700000-0000-4000-8000-000000000024','96700000-0000-4000-8000-000000000001','business_registration','verification-test/approval-note.pdf');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"96700000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{"role":"admin"}}',true);

select lives_ok(
  $$select public.admin_decide_verification('96700000-0000-4000-8000-000000000030','pending',(select updated_at from public.verification_requests where id='96700000-0000-4000-8000-000000000030'),'approved',null)$$,
  'approval accepts an empty decision note'
);
select is((select status from public.verification_requests where id='96700000-0000-4000-8000-000000000030'),'approved','approval records the request decision');
select is((select decision_note from public.verification_requests where id='96700000-0000-4000-8000-000000000030'),null::text,'empty approval note is stored as null');
select is((select verification_status from public.providers where id='96700000-0000-4000-8000-000000000020'),'verified','approval uses the provider status accepted by marketplace consumers');
select is((select is_verified from public.providers where id='96700000-0000-4000-8000-000000000020'),true,'approval enables verified provider visibility');

select lives_ok(
  $$select public.admin_decide_verification('96700000-0000-4000-8000-000000000034','pending',(select updated_at from public.verification_requests where id='96700000-0000-4000-8000-000000000034'),'approved','Ownership evidence reviewed')$$,
  'approval accepts a non-empty decision note'
);
select is((select status from public.verification_requests where id='96700000-0000-4000-8000-000000000034'),'approved','approval with note records the request decision');
select is((select decision_note from public.verification_requests where id='96700000-0000-4000-8000-000000000034'),'Ownership evidence reviewed','approval preserves a supplied decision note');

select lives_ok(
  $$select public.admin_decide_verification('96700000-0000-4000-8000-000000000031','pending',(select updated_at from public.verification_requests where id='96700000-0000-4000-8000-000000000031'),'rejected','Evidence is incomplete')$$,
  'rejection accepts a valid decision note'
);
select is((select status from public.verification_requests where id='96700000-0000-4000-8000-000000000031'),'rejected','rejection records the request decision');

select lives_ok(
  $$select public.admin_decide_verification('96700000-0000-4000-8000-000000000032','pending',(select updated_at from public.verification_requests where id='96700000-0000-4000-8000-000000000032'),'changes_requested','Please provide a clearer certificate')$$,
  'request-changes accepts a valid decision note'
);
select is((select status from public.verification_requests where id='96700000-0000-4000-8000-000000000032'),'changes_requested','request-changes records the request decision');

select lives_ok(
  $$select public.admin_decide_verification('96700000-0000-4000-8000-000000000033','approved',(select updated_at from public.verification_requests where id='96700000-0000-4000-8000-000000000033'),'revoked','Ownership evidence no longer valid')$$,
  'revocation accepts a valid decision note'
);
select is((select status from public.verification_requests where id='96700000-0000-4000-8000-000000000033'),'revoked','revocation is accepted by the request status constraint');
select is((select verification_status from public.providers where id='96700000-0000-4000-8000-000000000023'),'unverified','revocation clears the provider verification state');
select is((select is_verified from public.providers where id='96700000-0000-4000-8000-000000000023'),false,'revocation removes verified visibility');

select * from finish();
rollback;
