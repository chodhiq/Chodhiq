begin;

alter table public.quote_requests
  drop constraint if exists quote_request_contact_allowed;

alter table public.quote_requests
  add constraint quote_request_contact_allowed
  check (preferred_contact is not null and preferred_contact in ('whatsapp','call','email')) not valid;

commit;
