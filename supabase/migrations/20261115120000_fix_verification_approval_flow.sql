begin;

-- Verification requests use revoked as an explicit terminal review result.
-- Preflight (should return no rows before validating the constraint):
--   select id, status
--   from public.verification_requests
--   where status is null
--      or status not in ('draft','pending','approved','changes_requested','rejected','revoked');
alter table public.verification_requests
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists decision_note text;

-- Normalize columns that may have been introduced manually with weaker nullability.
update public.verification_requests set updated_at = now() where updated_at is null;
alter table public.verification_requests
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.set_verification_request_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_verification_request_updated_at_trigger
  on public.verification_requests;
create trigger set_verification_request_updated_at_trigger
before update on public.verification_requests
for each row execute function public.set_verification_request_updated_at();

alter table public.verification_requests
  drop constraint if exists verification_requests_status_check;
alter table public.verification_requests
  drop constraint if exists verification_requests_status_allowed;
alter table public.verification_requests
  add constraint verification_requests_status_allowed
  check (status in ('draft','pending','approved','changes_requested','rejected','revoked'))
  not valid;
alter table public.verification_requests
  validate constraint verification_requests_status_allowed;

-- Keep the provider status vocabulary aligned with marketplace, provider
-- dashboard, and checkout consumers: provider status is 'verified'; the review
-- request itself retains the more specific 'approved' decision status.
create or replace function public.admin_decide_verification(
  request_id uuid,
  expected_status text,
  expected_updated_at timestamptz,
  decision text,
  decision_note text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $$
#variable_conflict use_variable
declare
  current_request record;
  evidence_count integer;
  provider_state text;
begin
  if not public.admin_has_permission('applications.review') then
    raise exception using errcode = '42501', message = 'administrator permission required';
  end if;

  if decision not in ('pending','changes_requested','approved','rejected','revoked') then
    raise exception using errcode = '22023', message = 'unknown decision';
  end if;

  if decision in ('changes_requested','rejected','revoked')
     and length(trim(coalesce(decision_note,''))) < 8 then
    raise exception using errcode = '22023', message = 'decision note required';
  end if;

  select * into current_request
  from public.verification_requests
  where id = request_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'verification request not found';
  end if;

  if current_request.status <> expected_status
     or (expected_updated_at is not null and current_request.updated_at is distinct from expected_updated_at) then
    raise exception using errcode = '40001', message = 'verification request changed; reload and retry';
  end if;

  if not (
    (current_request.status = 'pending' and decision in ('approved','rejected','changes_requested'))
    or (current_request.status in ('rejected','changes_requested','revoked') and decision = 'pending')
    or (current_request.status = 'approved' and decision = 'revoked')
  ) then
    raise exception using errcode = '40001', message = 'illegal verification transition';
  end if;

  if decision = 'approved' then
    select count(*) into evidence_count
    from public.verification_documents vd
    where vd.request_id = current_request.id;
    if evidence_count = 0 then
      raise exception using errcode = '22023', message = 'evidence required';
    end if;
  end if;

  update public.verification_requests
  set status = decision,
      decision_note = nullif(trim(decision_note),''),
      reviewed_by = auth.uid(),
      reviewed_at = case when decision = 'pending' then null else now() end,
      updated_at = now()
  where id = current_request.id;

  if decision in ('approved','revoked') then
    provider_state := case when decision = 'approved' then 'verified' else 'unverified' end;
    update public.providers
    set verification_status = provider_state,
        is_verified = (decision = 'approved'),
        updated_at = now()
    where id = current_request.provider_id;
  end if;

  insert into public.admin_audit_log(admin_id,action,entity_type,entity_id,details)
  values (
    auth.uid(),
    'verification_' || decision,
    'verification_request',
    current_request.id,
    jsonb_build_object(
      'source','admin_verification_rpc',
      'reason',decision_note,
      'outcome','succeeded',
      'previous_values',jsonb_build_object('status',current_request.status),
      'new_values',jsonb_build_object('status',decision),
      'correlation_id',gen_random_uuid()
    )
  );

  return jsonb_build_object('ok',true,'status',decision,'reviewed_by',auth.uid());
end;
$$;

revoke all on function public.admin_decide_verification(uuid,text,timestamptz,text,text)
  from public, anon;
grant execute on function public.admin_decide_verification(uuid,text,timestamptz,text,text)
  to authenticated;

-- Rollback note: restore the prior RPC only through a reviewed follow-up
-- migration. Do not remove updated_at or decision_note after decisions have
-- been recorded; reverting the status check also requires resolving any rows
-- currently marked revoked first.
commit;
