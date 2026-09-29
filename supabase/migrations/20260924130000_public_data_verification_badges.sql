-- Distinguish source-backed directory data from owner/business verification.
alter table public.providers
  add column if not exists data_verification_status text not null default 'unchecked'
    check (data_verification_status in ('unchecked','source_checked')),
  add column if not exists data_verified_at date;

update public.providers
set data_verification_status='source_checked', data_verified_at=date '2026-09-16', updated_at=now()
where data_notes like 'FSA Leicester City extract 2026-09-16;%';

grant select (data_verification_status,data_verified_at) on public.providers to anon;

comment on column public.providers.data_verification_status is
  'Public-data accuracy status; separate from owner identity and ChodhiQ business verification.';
