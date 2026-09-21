-- Auditable publication consent, contact verification, and image-rights evidence.
alter table public.provider_publication_consents
  add column if not exists contact_status text not null default 'unconfirmed'
    check (contact_status in ('unconfirmed','confirmed','outdated','unreachable')),
  add column if not exists contact_confirmed_at timestamptz,
  add column if not exists image_rights_status text not null default 'not_reviewed'
    check (image_rights_status in ('not_reviewed','licensed','provider_owned','removed')),
  add column if not exists evidence_reference text,
  add column if not exists reviewed_at timestamptz;
alter table public.provider_publication_consents
  drop constraint if exists provider_consent_evidence_reference_length;
alter table public.provider_publication_consents
  add constraint provider_consent_evidence_reference_length
  check (evidence_reference is null or char_length(evidence_reference) <= 500) not valid;
create index if not exists provider_compliance_contact_status_idx
  on public.provider_publication_consents(contact_status, updated_at desc);
create index if not exists provider_compliance_image_rights_status_idx
  on public.provider_publication_consents(image_rights_status, updated_at desc);
comment on column public.provider_publication_consents.evidence_reference is
  'Non-secret reference to the retained consent or licensing evidence; never store the evidence body here.';
