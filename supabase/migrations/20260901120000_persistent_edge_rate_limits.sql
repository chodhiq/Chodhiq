begin;

create table if not exists public.edge_rate_limits (
  scope text not null,
  identifier text not null,
  bucket_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (scope, identifier, bucket_started_at)
);

alter table public.edge_rate_limits enable row level security;
revoke all on public.edge_rate_limits from public, anon, authenticated;

create or replace function public.consume_edge_rate_limit(
  rate_scope text,
  rate_identifier text,
  maximum_requests integer,
  window_seconds integer
)
returns table(request_count integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  bucket timestamptz;
begin
  if char_length(rate_scope) not between 2 and 80
    or char_length(rate_identifier) not between 1 and 200
    or maximum_requests not between 1 and 10000
    or window_seconds not between 1 and 86400 then
    raise exception 'Invalid rate-limit parameters' using errcode = '22023';
  end if;

  bucket := to_timestamp(floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds);
  delete from public.edge_rate_limits
  where scope = rate_scope
    and identifier = rate_identifier
    and bucket_started_at < clock_timestamp() - interval '2 days';
  return query
    insert into public.edge_rate_limits(scope, identifier, bucket_started_at, request_count)
    values(rate_scope, rate_identifier, bucket, 1)
    on conflict (scope, identifier, bucket_started_at)
    do update set request_count = public.edge_rate_limits.request_count + 1
    returning public.edge_rate_limits.request_count;
end;
$$;

revoke all on function public.consume_edge_rate_limit(text,text,integer,integer) from public, anon, authenticated;
grant execute on function public.consume_edge_rate_limit(text,text,integer,integer) to service_role;

commit;
