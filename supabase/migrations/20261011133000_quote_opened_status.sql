-- Distinguish opening WhatsApp from sending a message. The app cannot verify
-- delivery, but businesses still need the existing sent/viewed response flow.
alter table public.quote_requests
  drop constraint if exists quote_request_status_allowed;

alter table public.quote_requests
  add constraint quote_request_status_allowed
  check (status in ('opened', 'sent', 'viewed', 'responded', 'closed')) not valid;

create or replace function public.respond_to_quote(
  target_quote uuid,
  expected_status text,
  response_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_quote public.quote_requests%rowtype;
  clean_response text := trim(coalesce(response_text, ''));
begin
  if expected_status not in ('opened', 'sent', 'viewed')
    or length(clean_response) not between 2 and 2000 then
    raise exception using errcode = '22023', message = 'invalid quote response';
  end if;

  select * into current_quote
  from public.quote_requests
  where id = target_quote
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'quote request not found';
  end if;
  if not public.owns_provider(current_quote.provider_id) then
    raise exception using errcode = '42501', message = 'provider owner required';
  end if;
  if current_quote.status <> expected_status then
    raise exception using errcode = '40001', message = 'quote request changed; reload and retry';
  end if;

  update public.quote_requests
  set status = 'responded', response_message = clean_response, responded_at = now()
  where id = target_quote;
  return jsonb_build_object('ok', true, 'status', 'responded');
end;
$$;

revoke all on function public.respond_to_quote(uuid, text, text) from public;
grant execute on function public.respond_to_quote(uuid, text, text) to authenticated;
