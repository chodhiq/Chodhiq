begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users(
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('98200000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','booking-customer@example.test','',now(),'{}','{}',now(),now()),
  ('98200000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','booking-owner@example.test','',now(),'{}','{}',now(),now()),
  ('98200000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','booking-admin@example.test','',now(),'{"role":"admin"}','{}',now(),now());

insert into public.categories(id,name,slug,icon,color,is_active)
values('98200000-0000-4000-8000-000000000010','Booking hours test','booking-hours-test-982','briefcase','#000000',true);
insert into public.providers(id,owner_id,business_name,category_id,base_city)
values
  ('98200000-0000-4000-8000-000000000020','98200000-0000-4000-8000-000000000002','Provider with hours','98200000-0000-4000-8000-000000000010','London'),
  ('98200000-0000-4000-8000-000000000021',null,'Provider without hours','98200000-0000-4000-8000-000000000010','London'),
  ('98200000-0000-4000-8000-000000000022',null,'Closed provider','98200000-0000-4000-8000-000000000010','London'),
  ('98200000-0000-4000-8000-000000000023','98200000-0000-4000-8000-000000000003','Admin-owned provider','98200000-0000-4000-8000-000000000010','London'),
  ('98200000-0000-4000-8000-000000000024',null,'DST provider','98200000-0000-4000-8000-000000000010','London');

insert into public.provider_hours(provider_id,day_of_week,open_time,close_time,is_closed)
select '98200000-0000-4000-8000-000000000020', weekday, '10:00', '17:00', false
from generate_series(0, 6) as weekday;
insert into public.provider_hours(provider_id,day_of_week,open_time,close_time,is_closed)
select '98200000-0000-4000-8000-000000000022', weekday, null, null, true
from generate_series(0, 6) as weekday;
insert into public.provider_hours(provider_id,day_of_week,open_time,close_time,is_closed)
select '98200000-0000-4000-8000-000000000023', weekday, '10:00', '17:00', false
from generate_series(0, 6) as weekday;
insert into public.provider_hours(provider_id,day_of_week,open_time,close_time,is_closed)
select '98200000-0000-4000-8000-000000000024', weekday, '00:00', '04:00', false
from generate_series(0, 6) as weekday;

create temporary table booking_hours_test_dates on commit drop as
with current_uk as (
  select (clock_timestamp() at time zone 'Europe/London')::date as today
),
transition_dates as (
  select
    today,
    make_date(extract(year from today)::integer, 3, 31)
      - extract(dow from make_date(extract(year from today)::integer, 3, 31))::integer as spring_last_sunday,
    make_date(extract(year from today)::integer, 10, 31)
      - extract(dow from make_date(extract(year from today)::integer, 10, 31))::integer as autumn_last_sunday
  from current_uk
)
select
  today,
  case
    when spring_last_sunday > today then spring_last_sunday
    else make_date(extract(year from today)::integer + 1, 3, 31)
      - extract(dow from make_date(extract(year from today)::integer + 1, 3, 31))::integer
  end as next_spring_transition,
  case
    when autumn_last_sunday > today then autumn_last_sunday
    else make_date(extract(year from today)::integer + 1, 10, 31)
      - extract(dow from make_date(extract(year from today)::integer + 1, 10, 31))::integer
  end as next_autumn_transition
from transition_dates;
grant select on booking_hours_test_dates to public;

create function public.test_booking_hours_security_definer_insert(
  target_user uuid,
  target_provider uuid,
  target_date date,
  target_time time
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.bookings(user_id,provider_id,requested_date,requested_time)
  values(target_user,target_provider,target_date,target_time);
end;
$$;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"98200000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}',
  true
);

select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 1 from booking_hours_test_dates),
      '10:00'
    )$$,
  'booking inside opening hours is accepted'
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000021',
      (select today + 1 from booking_hours_test_dates),
      '03:00'
    )$$,
  'future booking is accepted when the provider has no opening-hours rows'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000022',
      (select today + 1 from booking_hours_test_dates),
      '10:00'
    )$$,
  'PZH01',
  'Choose a time within the business’s opening hours.',
  'closed day is rejected with app-displayable text'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000021',
      (select today from booking_hours_test_dates),
      '00:00'
    )$$,
  '23514',
  'Choose a future date and time',
  'past time today is rejected using UK local time'
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 1 from booking_hours_test_dates),
      '10:00'
    )$$,
  'exact opening time is accepted'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 1 from booking_hours_test_dates),
      '09:59'
    )$$,
  'PZH01',
  'Choose a time within the business’s opening hours.',
  'one minute before opening is rejected'
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 1 from booking_hours_test_dates),
      '10:01'
    )$$,
  'one minute after opening is accepted'
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 1 from booking_hours_test_dates),
      '16:59'
    )$$,
  'one minute before closing is accepted'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 1 from booking_hours_test_dates),
      '17:00'
    )$$,
  'PZH01',
  'Choose a time within the business’s opening hours.',
  'exact closing time is rejected'
);
select throws_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 1 from booking_hours_test_dates),
      '17:01'
    )$$,
  'PZH01',
  'Choose a time within the business’s opening hours.',
  'one minute after closing is rejected'
);

select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time,status)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 2 from booking_hours_test_dates),
      '16:00',
      'pending'
    )$$,
  'owner-confirm fixture booking is created'
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time,status)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 3 from booking_hours_test_dates),
      '16:00',
      'pending'
    )$$,
  'owner-cancel fixture booking is created'
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time,status)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 4 from booking_hours_test_dates),
      '16:00',
      'pending'
    )$$,
  'customer-cancel fixture booking is created'
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time,status)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000023',
      (select today + 5 from booking_hours_test_dates),
      '16:00',
      'pending'
    )$$,
  'admin-update fixture booking is created'
);

reset role;
update public.provider_hours
set is_closed = true, open_time = null, close_time = null
where provider_id = '98200000-0000-4000-8000-000000000020';

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"98200000-0000-4000-8000-000000000002","role":"authenticated","app_metadata":{}}',
  true
);
select lives_ok(
  $$update public.bookings
    set status = 'confirmed', provider_message = 'Confirmed'
    where provider_id = '98200000-0000-4000-8000-000000000020'
      and requested_date = (select today + 2 from booking_hours_test_dates)$$,
  'provider owner can confirm an existing booking after hours change'
);
select lives_ok(
  $$update public.bookings
    set status = 'cancelled'
    where provider_id = '98200000-0000-4000-8000-000000000020'
      and requested_date = (select today + 3 from booking_hours_test_dates)$$,
  'provider owner can cancel an existing booking after hours change'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"98200000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}',
  true
);
select lives_ok(
  $$update public.bookings
    set status = 'cancelled'
    where provider_id = '98200000-0000-4000-8000-000000000020'
      and requested_date = (select today + 4 from booking_hours_test_dates)$$,
  'customer can cancel their own existing booking after hours change'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"98200000-0000-4000-8000-000000000003","role":"authenticated","app_metadata":{"role":"admin"}}',
  true
);
select lives_ok(
  $$update public.bookings
    set status = 'confirmed', provider_message = 'Admin update'
    where provider_id = '98200000-0000-4000-8000-000000000023'
      and requested_date = (select today + 5 from booking_hours_test_dates)$$,
  'admin who owns the provider can update booking status'
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000003',
      '98200000-0000-4000-8000-000000000023',
      (select today + 1 from booking_hours_test_dates),
      '19:00'
    )$$,
  'admin client insert is not blocked by provider hours'
);

reset role;
set local role service_role;
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 1 from booking_hours_test_dates),
      '19:00'
    )$$,
  'service role insert is not blocked by provider hours'
);
reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"98200000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}',
  true
);
select lives_ok(
  $$select public.test_booking_hours_security_definer_insert(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000020',
      (select today + 1 from booking_hours_test_dates),
      '19:00'
    )$$,
  'security definer insert is not blocked by provider hours'
);
reset role;
drop function public.test_booking_hours_security_definer_insert(uuid,uuid,date,time);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"98200000-0000-4000-8000-000000000001","role":"authenticated","app_metadata":{}}',
  true
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000024',
      (select next_spring_transition from booking_hours_test_dates),
      '01:30'
    )$$,
  'nonexistent UK spring-forward wall time is accepted when within opening hours'
);
select lives_ok(
  $$insert into public.bookings(user_id,provider_id,requested_date,requested_time)
    values(
      '98200000-0000-4000-8000-000000000001',
      '98200000-0000-4000-8000-000000000024',
      (select next_autumn_transition from booking_hours_test_dates),
      '01:30'
    )$$,
  'ambiguous UK fall-back wall time is accepted as one local-time value'
);

reset role;
select * from finish();
rollback;
