begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users(id,aud,role,email,email_confirmed_at,raw_app_meta_data,raw_user_meta_data)
values
('98100000-0000-4000-8000-000000000001','authenticated','authenticated','booking-time-test@example.test',now(),'{}','{}');
insert into public.categories(id,name,slug,icon,color,is_active)
values('98100000-0000-4000-8000-000000000010','Booking test','booking-time-test-981','briefcase','#000000',true);
insert into public.providers(id,business_name,category_id,base_city)
values('98100000-0000-4000-8000-000000000020','Booking test provider','98100000-0000-4000-8000-000000000010','London');

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"98100000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}',
  true
);

select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values('98100000-0000-4000-8000-000000000001','98100000-0000-4000-8000-000000000020',current_date+1,'10:00')$$,
  'a valid future booking is accepted'
);
select is(
  (select user_id from public.bookings where provider_id='98100000-0000-4000-8000-000000000020'),
  '98100000-0000-4000-8000-000000000001'::uuid,
  'booking is linked to the authenticated user'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values('98100000-0000-4000-8000-000000000001','98100000-0000-4000-8000-000000000020',current_date-1,'10:00')$$,
  '23514','Choose a future date and time','a past booking date is rejected by the database'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values('98100000-0000-4000-8000-000000000001','98100000-0000-4000-8000-000000000020',null,'10:00')$$,
  '23514','Choose both a booking date and time','a booking without a date is rejected'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values('98100000-0000-4000-8000-000000000001','98100000-0000-4000-8000-000000000020',current_date+1,null)$$,
  '23514','Choose both a booking date and time','a booking without a time is rejected'
);

reset role;
select * from finish();
rollback;
