-- Local prototype data only. Never apply to production.
insert into auth.users(id,instance_id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
values
('91000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','customer@prototype.local',crypt('Prototype-Only-2026!',gen_salt('bf')),now(),'{"role":"customer"}','{"full_name":"Prototype Customer"}',now(),now()),
('91000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','owner@prototype.local',crypt('Prototype-Only-2026!',gen_salt('bf')),now(),'{"role":"provider"}','{"full_name":"Prototype Owner"}',now(),now()),
('91000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','admin@prototype.local',crypt('Prototype-Only-2026!',gen_salt('bf')),now(),'{"role":"admin"}','{"full_name":"Prototype Admin"}',now(),now())
on conflict(id) do update set encrypted_password=excluded.encrypted_password,raw_app_meta_data=excluded.raw_app_meta_data,email_confirmed_at=now(),updated_at=now();

insert into public.categories(id,name,slug,icon,color,sort_order)
values('92000000-0000-4000-8000-000000000001','Prototype catering','prototype-catering','utensils','#08724f',999)
on conflict(id) do update set name=excluded.name,slug=excluded.slug;

insert into public.providers(id,owner_id,business_name,description,category_id,base_city,base_postcode,is_verified,is_claimed,verification_status,phone,website)
values('93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','Demo — Malabar Kitchen','Fictional catering provider for the closed ChodhiQ prototype.','92000000-0000-4000-8000-000000000001','Birmingham','B1 1AA',true,true,'verified','+44 7000 000000','https://example.com')
on conflict(id) do update set owner_id=excluded.owner_id,business_name=excluded.business_name,is_verified=true,is_claimed=true,verification_status='verified';

insert into public.services(id,provider_id,name,description,starting_price,is_featured)
values('94000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Prototype event catering','Fictional service used in UAT.',250,true)
on conflict(id) do update set name=excluded.name,starting_price=excluded.starting_price;

insert into public.quote_requests(id,user_id,provider_id,message,preferred_contact,status,created_at)
values('94500000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Please provide a fictional quote for catering a 40-person prototype event.','email','sent',now()-interval '2 hours')
on conflict(id) do update set message=excluded.message,status='sent',response_message=null,responded_at=null;

insert into public.verification_requests(id,provider_id,submitted_by,status,notes,admin_notes,submitted_at,reviewed_at,reviewed_by)
values('95000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','approved','Prototype verification request','Fictional evidence accepted for local UAT only',now()-interval '10 days',now()-interval '9 days','91000000-0000-4000-8000-000000000003')
on conflict(id) do nothing;

insert into public.provider_reports(id,provider_id,reporter_id,reason,details,status,created_at)
values('96000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000001','other','Fictional moderation record for safe prototype testing.','open',now()-interval '1 day')
on conflict(id) do nothing;

insert into public.ad_campaign_enquiries(id,provider_id,requested_by,contact_email,objective,target_cities,requested_start,requested_end,budget_pence,status)
values('97000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','91000000-0000-4000-8000-000000000002','owner@prototype.local','Reach Birmingham customers seeking fictional event catering.',array['Birmingham'],current_date-1,current_date+14,25000,'submitted')
on conflict(id) do nothing;

insert into public.ad_campaigns(id,enquiry_id,provider_id,name,headline,body,creative_url,destination_url,target_cities,starts_at,ends_at,status,approved_by,approved_at)
values('98000000-0000-4000-8000-000000000001','97000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','Prototype Birmingham campaign','Planning a community celebration?','Demo — Malabar Kitchen offers fictional event catering for this closed prototype.','https://images.unsplash.com/photo-1555244162-803834f70033?w=1200','https://example.com',array['Birmingham'],now()-interval '1 day',now()+interval '14 days','in_review',null,null)
on conflict(id) do update set starts_at=excluded.starts_at,ends_at=excluded.ends_at,status='in_review',approved_by=null,approved_at=null;

insert into public.ad_campaign_invoices(id,campaign_id,invoice_number,amount_pence,status,issued_at,due_at)
values('99000000-0000-4000-8000-000000000001','98000000-0000-4000-8000-000000000001','PROTO-2026-001',25000,'issued',now()-interval '1 day',now()+interval '13 days')
on conflict(id) do nothing;

insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
values('91000000-0000-4000-8000-000000000003','prototype_seeded','ad_campaign','98000000-0000-4000-8000-000000000001','{"source":"local_prototype","fictional":true}');
