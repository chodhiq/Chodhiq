begin;

create or replace function public.admin_decide_verification(request_id uuid, decision text, decision_note text default null)
returns public.verification_requests
language plpgsql security definer
set search_path = pg_catalog, public as $$
declare request_row public.verification_requests;
begin
  if not public.is_admin() then raise exception 'Administrator access required' using errcode='42501'; end if;
  if decision not in ('approved','rejected','changes_requested','pending','revoked') then raise exception 'Unsupported verification decision'; end if;
  select * into request_row from public.verification_requests where id=request_id for update;
  if request_row.id is null then raise exception 'Verification request not found'; end if;
  if decision='approved' and not exists(select 1 from public.verification_documents where request_id=request_row.id) then raise exception 'Evidence is required before approval'; end if;

  update public.verification_requests set
    status=case when decision='revoked' then 'rejected' else decision end,
    admin_notes=coalesce(nullif(trim(decision_note),''),admin_notes),
    reviewed_at=case when decision='pending' then null else now() end,
    reviewed_by=case when decision='pending' then null else auth.uid() end
  where id=request_row.id returning * into request_row;

  update public.providers set
    verification_status=case decision when 'approved' then 'verified' when 'pending' then 'pending' when 'changes_requested' then 'unverified' else 'rejected' end,
    is_verified=(decision='approved'), updated_at=now()
  where id=request_row.provider_id;
  return request_row;
end $$;
revoke all on function public.admin_decide_verification(uuid,text,text) from public,anon;
grant execute on function public.admin_decide_verification(uuid,text,text) to authenticated;

drop policy if exists "Admins delete verification files" on storage.objects;
create policy "Admins delete verification files" on storage.objects for delete to authenticated
using (bucket_id='verification-documents' and public.is_admin());

commit;
