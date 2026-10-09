begin;

-- Rate limit quote fan-out before notification and outbound lead triggers run.
-- Authenticated callers are bound to auth.uid(); trusted service-role inserts
-- are limited against the user_id on the row.
-- The trigger directly updates its private counter so the RPC remains
-- service-role-only for Edge Function callers. Missing counter storage fails
-- closed and rolls back the quote insert.
create or replace function public.limit_customer_quote_requests()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller uuid := auth.uid();
  requester uuid;
  bucket timestamptz;
  rate_count integer;
begin
  requester := coalesce(caller, new.user_id);
  if requester is null or (caller is not null and new.user_id is distinct from caller) then
    raise exception using errcode = '42501', message = 'Quote requests require the signed-in account';
  end if;

  bucket := to_timestamp(floor(extract(epoch from clock_timestamp()) / 3600) * 3600);
  insert into public.edge_rate_limits(scope, identifier, bucket_started_at, request_count)
  values('customer-quote-requests', requester::text, bucket, 1)
  on conflict(scope, identifier, bucket_started_at)
  do update set request_count = public.edge_rate_limits.request_count + 1
  returning request_count into rate_count;

  if rate_count > 5 then
    raise exception using errcode = 'P0001', message = 'Quote request limit reached; try again later';
  end if;

  return new;
end;
$$;

revoke all on function public.limit_customer_quote_requests() from public, anon, authenticated;

alter table public.quote_requests drop constraint if exists quote_request_message_length;
alter table public.quote_requests add constraint quote_request_message_length
  check (message is not null and char_length(message) between 1 and 2000) not valid;

alter table public.quote_requests drop constraint if exists quote_request_contact_allowed;
alter table public.quote_requests add constraint quote_request_contact_allowed
  check (preferred_contact in ('whatsapp','call','email')) not valid;

drop trigger if exists limit_customer_quote_requests_trigger on public.quote_requests;
create trigger limit_customer_quote_requests_trigger
before insert on public.quote_requests
for each row execute function public.limit_customer_quote_requests();

commit;
