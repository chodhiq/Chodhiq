-- Business dashboard query and workflow safeguards.
alter table public.quote_requests drop constraint if exists quote_request_status_allowed;
alter table public.quote_requests add constraint quote_request_status_allowed check(status in ('sent','viewed','responded','closed')) not valid;
alter table public.providers drop constraint if exists provider_business_name_length;
alter table public.providers add constraint provider_business_name_length check(char_length(trim(business_name)) between 2 and 120) not valid;
alter table public.providers drop constraint if exists provider_description_length;
alter table public.providers add constraint provider_description_length check(description is null or char_length(description)<=2000) not valid;
create index if not exists quote_requests_provider_status_created_idx on public.quote_requests(provider_id,status,created_at desc);
create index if not exists bookings_provider_status_date_idx on public.bookings(provider_id,status,requested_date);
create index if not exists analytics_provider_type_created_idx on public.provider_analytics_events(provider_id,event_type,created_at desc);
create index if not exists payment_records_provider_created_idx on public.payment_records(provider_id,created_at desc);
