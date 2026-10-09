begin;
create extension if not exists pgtap with schema extensions;
select plan(4);
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data)
values('93900000-0000-4000-8000-000000000001','authenticated','authenticated','image-workflow@example.test','{}','{}');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"93900000-0000-4000-8000-000000000001"}',true);
insert into public.community_posts(id,author_id,post_type,body,image_url) values
('93900000-0000-4000-8000-000000000010','93900000-0000-4000-8000-000000000001','discussion','Community photo update','https://example.test/update.jpg'),
('93900000-0000-4000-8000-000000000011','93900000-0000-4000-8000-000000000001','experience','Community event photo','https://example.test/event.jpg');
select is((select image_url from public.community_posts where id='93900000-0000-4000-8000-000000000010'),'https://example.test/update.jpg','discussion image persists');
select is((select image_url from public.community_posts where id='93900000-0000-4000-8000-000000000011'),'https://example.test/event.jpg','experience image persists');
update public.community_posts set image_url='https://example.test/replaced.jpg' where id='93900000-0000-4000-8000-000000000010';
select is((select image_url from public.community_posts where id='93900000-0000-4000-8000-000000000010'),'https://example.test/replaced.jpg','replacement image persists');
select throws_ok($q$insert into public.community_posts(author_id,post_type,body,image_url)
values('93900000-0000-4000-8000-000000000001','promotion','Unowned paid offer','https://example.test/offer.jpg')$q$,'P0001','Promotional posts require a provider and poster image','promotion requires a provider and poster image');
reset role;
select * from finish();
rollback;
