begin;

-- Keep verification decisions out of ordinary client writes. SECURITY DEFINER
-- RPCs run as their function owner and retain their own authorization checks.
create or replace function public.protect_verification_request_client_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  column_name text;
  protected_columns constant text[] := array[
    'status', 'reviewed_by', 'reviewed_at', 'admin_notes', 'decision_note',
    'decision', 'decided_at', 'updated_by'
  ];
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  -- An admin with the verification-review permission may make a direct client
  -- write; the dashboard's SECURITY DEFINER review RPC also has its own guard.
  if current_user = 'authenticated' then
    if public.is_admin() and public.admin_has_permission('applications.review') then
      return new;
    end if;
  end if;

  if tg_op = 'INSERT' then
    if new.status not in ('draft', 'pending') then
      new.status := 'draft';
    end if;
    -- JSON record assignment keeps this compatible with deployments where
    -- optional decision metadata columns have not been added.
    new := jsonb_populate_record(
      new,
      jsonb_build_object(
        'reviewed_by', null,
        'reviewed_at', null,
        'admin_notes', null,
        'decision_note', null,
        'decision', null,
        'decided_at', null,
        'updated_by', null
      )
    );
    return new;
  end if;

  foreach column_name in array protected_columns || array['provider_id', 'submitted_by'] loop
    if (to_jsonb(new) -> column_name) is distinct from (to_jsonb(old) -> column_name) then
      raise exception 'Verification decision and ownership fields may only be changed by an authorized reviewer'
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists protect_verification_request_client_fields_trigger
  on public.verification_requests;
create trigger protect_verification_request_client_fields_trigger
before insert or update on public.verification_requests
for each row execute function public.protect_verification_request_client_fields();

-- Owners can continue editing business details, while identity, verification,
-- reputation, publication, imported-source, and promotion controls stay trusted.
create or replace function public.protect_provider_trust_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  column_name text;
  protected_columns constant text[] := array[
    'id', 'owner_id', 'is_claimed', 'is_verified', 'verification_status',
    'verification_date', 'verification_expires_at', 'verified_at',
    'reviewed_at', 'reviewed_by', 'avg_rating', 'rating', 'review_count',
    'created_at', 'source_profile_id', 'source_url', 'data_notes',
    'data_verification_status', 'data_verified_at', 'sponsored_rank',
    'sponsored_until', 'status', 'is_published', 'published', 'published_at',
    'publication_status', 'approved_by', 'approved_at', 'moderation_status',
    'admin_notes'
  ];
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  foreach column_name in array protected_columns loop
    if (to_jsonb(new) -> column_name) is distinct from (to_jsonb(old) -> column_name) then
      raise exception 'Protected provider trust and administration fields cannot be changed by clients'
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists protect_provider_trust_fields_trigger on public.providers;
create trigger protect_provider_trust_fields_trigger
before update on public.providers
for each row execute function public.protect_provider_trust_fields();

commit;


