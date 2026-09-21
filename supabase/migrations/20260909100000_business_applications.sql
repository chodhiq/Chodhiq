begin;

-- Signup creates an Auth account, never a provider. Only an audited admin
-- decision provisions the workspace. Application documents are not public.
create table public.business_applications (
  id uuid primary key,
  applicant_id uuid not null unique references auth.users(id) on delete cascade,
  business_name text not null check (char_length(business_name) between 2 and 120),
  category_id uuid not null references public.categories(id),
  city text not null check (char_length(city) between 2 and 100),
  postcode text not null,
  phone text not null,
  email text not null,
  proof_path text not null,
  proof_name text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','changes_requested')),
  submitted_at timestamptz not null default now(),
  review_due_at timestamptz not null default (now() + interval '3 days'),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  review_note text,
  provider_id uuid references public.providers(id),
  revision integer not null default 1
);
alter table public.business_applications enable row level security;
revoke all on public.business_applications from public, anon, authenticated;
grant select on public.business_applications to authenticated;
create policy "Applicants and admins read business applications"
on public.business_applications for select to authenticated
using (applicant_id = (select auth.uid()) or public.is_admin());
create index business_applications_queue_idx on public.business_applications(status, submitted_at);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('business-application-proofs','business-application-proofs',false,10485760,array['application/pdf','image/jpeg','image/png']);
create policy "Applicants upload private business proof" on storage.objects
for insert to authenticated with check (
  bucket_id='business-application-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not exists (select 1 from public.business_applications a where a.applicant_id=(select auth.uid()) and a.status in ('pending','approved'))
);
create policy "Applicants and admins read private business proof" on storage.objects
for select to authenticated using (
  bucket_id='business-application-proofs' and ((storage.foldername(name))[1]=(select auth.uid())::text or public.is_admin())
);
-- Submitted proof is immutable. No UPDATE policy, and no removal while attached.
create policy "Applicants remove unattached business proof" on storage.objects
for delete to authenticated using (
  bucket_id='business-application-proofs' and (storage.foldername(name))[1]=(select auth.uid())::text
  and not exists (select 1 from public.business_applications a where a.proof_path=name)
);

create function public.submit_business_application(
  application_id uuid, business_name text, category_id uuid, city text,
  postcode text, phone text, proof_path text, proof_name text
) returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := auth.uid(); account_email text; existing public.business_applications; normalized_phone text;
begin
  if uid is null then raise exception 'Sign in first' using errcode='42501'; end if;
  -- Serialize submissions per account, including first submissions and retries.
  select u.email into account_email from auth.users u where u.id=uid and u.email_confirmed_at is not null for update;
  if not found then raise exception 'Confirm your email before applying' using errcode='42501'; end if;
  select * into existing from public.business_applications a where a.applicant_id=uid for update;
  if found and existing.status in ('pending','approved') then
    if existing.id=application_id then return existing.id; end if;
    raise exception 'An application already exists' using errcode='23505';
  end if;
  if exists(select 1 from public.providers p where p.owner_id=uid) then raise exception 'A business is already assigned to this account'; end if;
  if application_id is null or business_name is null or city is null or postcode is null or phone is null or proof_path is null or proof_name is null then raise exception 'Complete all required fields'; end if;
  if char_length(trim(business_name)) not between 2 and 120 or char_length(trim(city)) not between 2 and 100 then raise exception 'Enter a valid business name and city'; end if;
  if upper(trim(postcode)) !~ '^(GIR ?0AA|[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2})$' then raise exception 'Enter a UK postcode'; end if;
  normalized_phone := regexp_replace(phone, '[ ()-]', '', 'g');
  if normalized_phone !~ '^(0[1-9][0-9]{9}|\+44[1-9][0-9]{9})$' then raise exception 'Enter a UK phone number'; end if;
  if not exists(select 1 from public.categories c where c.id=category_id and c.is_active) then raise exception 'Choose an active business category'; end if;
  if char_length(proof_name) not between 1 and 180 or proof_path not like uid::text || '/' || application_id::text || '/%' then raise exception 'Invalid business proof'; end if;
  if not exists(select 1 from storage.objects o where o.bucket_id='business-application-proofs' and o.name=proof_path
    and o.metadata->>'mimetype' in ('application/pdf','image/jpeg','image/png')
    and (o.metadata->>'size')::bigint between 1 and 10485760) then raise exception 'Upload a PDF, JPG or PNG proof, up to 10 MB'; end if;
  insert into public.business_applications(id,applicant_id,business_name,category_id,city,postcode,phone,email,proof_path,proof_name)
  values(application_id,uid,trim(business_name),category_id,trim(city),upper(trim(postcode)),normalized_phone,account_email,proof_path,proof_name)
  on conflict(applicant_id) do update set business_name=excluded.business_name,category_id=excluded.category_id,city=excluded.city,
    postcode=excluded.postcode,phone=excluded.phone,email=excluded.email,proof_path=excluded.proof_path,proof_name=excluded.proof_name,
    status='pending',submitted_at=now(),review_due_at=now()+interval '3 days',reviewed_at=null,reviewed_by=null,review_note=null,
    revision=business_applications.revision+1;
  return coalesce(existing.id,application_id);
end $$;

create function public.review_business_application(application_id uuid, expected_revision integer, decision text, decision_note text)
returns uuid language plpgsql security definer set search_path='' as $$
declare application public.business_applications; new_provider uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if decision is null or decision not in ('approved','rejected','changes_requested') then raise exception 'Invalid decision'; end if;
  if decision in ('rejected','changes_requested') and char_length(trim(coalesce(decision_note,''))) < 8 then raise exception 'Give a reason of at least 8 characters'; end if;
  if char_length(coalesce(decision_note,''))>1000 then raise exception 'Decision note is too long'; end if;
  select * into application from public.business_applications a where a.id=application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if application.status<>'pending' or application.revision is distinct from expected_revision then raise exception 'Application changed; refresh before reviewing' using errcode='40001'; end if;
  if decision='approved' then
    perform 1 from auth.users u where u.id=application.applicant_id for update;
    if exists(select 1 from public.providers p where p.owner_id=application.applicant_id) then raise exception 'This account already owns a business'; end if;
    if not exists(select 1 from storage.objects o where o.bucket_id='business-application-proofs' and o.name=application.proof_path) then raise exception 'Business proof is missing'; end if;
    insert into public.providers(owner_id,business_name,category_id,base_city,base_postcode,phone,is_claimed,is_verified,verification_status)
    values(application.applicant_id,application.business_name,application.category_id,application.city,application.postcode,application.phone,true,true,'verified') returning id into new_provider;
  end if;
  update public.business_applications set status=decision,review_note=nullif(trim(decision_note),''),reviewed_at=now(),reviewed_by=auth.uid(),
    provider_id=new_provider,revision=revision+1 where id=application.id;
  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  values(auth.uid(),'business_application_'||decision,'business_application',application.id::text,
    jsonb_build_object('previous_status','pending','new_status',decision,'reason',decision_note,'provider_id',new_provider));
  return new_provider;
end $$;
revoke all on function public.submit_business_application(uuid,text,uuid,text,text,text,text,text) from public,anon;
grant execute on function public.submit_business_application(uuid,text,uuid,text,text,text,text,text) to authenticated;
revoke all on function public.review_business_application(uuid,integer,text,text) from public,anon;
grant execute on function public.review_business_application(uuid,integer,text,text) to authenticated;
commit;
