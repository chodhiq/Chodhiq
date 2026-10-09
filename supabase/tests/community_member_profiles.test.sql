begin;
create extension if not exists pgtap with schema extensions;
select plan(7);
insert into auth.users(id,aud,role,email,raw_app_meta_data,raw_user_meta_data) values
('96200000-0000-4000-8000-000000000001','authenticated','authenticated','public-author@example.test','{}','{"full_name":"Public Author"}'),
('96200000-0000-4000-8000-000000000002','authenticated','authenticated','profile-viewer@example.test','{}','{}'),
('96200000-0000-4000-8000-000000000003','authenticated','authenticated','private-author@example.test','{}','{"full_name":"Private Author"}');
insert into public.community_spaces(id,slug,name,visibility) values('96200000-0000-4000-8000-000000000010','profile-private','Profile privacy test','private');
select set_config('request.jwt.claims','{"sub":"96200000-0000-4000-8000-000000000003"}',true);
insert into public.community_memberships(space_id,user_id,role) values('96200000-0000-4000-8000-000000000010','96200000-0000-4000-8000-000000000003','member');
select set_config('request.jwt.claims','{"sub":"96200000-0000-4000-8000-000000000001"}',true);
insert into public.community_posts(id,author_id,body) values('96200000-0000-4000-8000-000000000020','96200000-0000-4000-8000-000000000001','Public profile fixture');
select set_config('request.jwt.claims','{"sub":"96200000-0000-4000-8000-000000000003"}',true);
insert into public.community_posts(id,author_id,community_id,body) values('96200000-0000-4000-8000-000000000021','96200000-0000-4000-8000-000000000003','96200000-0000-4000-8000-000000000010','Private profile fixture');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"96200000-0000-4000-8000-000000000002"}',true);
select is((select count(*)::integer from public.get_community_member_profile('96200000-0000-4000-8000-000000000001')),1,'readable public author has a community profile');
select ok((select not(to_jsonb(p) ? 'email') and not(to_jsonb(p) ? 'phone') from public.get_community_member_profile('96200000-0000-4000-8000-000000000001') p),'profile response excludes private contact details');
select is((select count(*)::integer from public.get_community_member_profile('96200000-0000-4000-8000-000000000003')),0,'private-only author is hidden from nonmembers');
select is((select count(*)::integer from public.get_community_member_profile('96200000-0000-4000-8000-000000000002')),1,'member can open their own profile without publishing');
insert into public.community_user_blocks(blocker_id,blocked_id) values('96200000-0000-4000-8000-000000000002','96200000-0000-4000-8000-000000000001');
select is((select count(*)::integer from public.get_community_member_profile('96200000-0000-4000-8000-000000000001')),0,'blocked author profile is hidden');
select set_config('request.jwt.claims','{"sub":"96200000-0000-4000-8000-000000000003"}',true);
select is((select count(*)::integer from public.get_community_member_profile('96200000-0000-4000-8000-000000000003')),1,'private author can read own identity');
set local role anon;
select set_config('request.jwt.claims','{}',true);
select is((select count(*)::integer from public.get_community_member_profile('96200000-0000-4000-8000-000000000003')),0,'guest cannot inspect private-only author');
reset role;
select * from finish();
rollback;
