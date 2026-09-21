begin;
create or replace function public.replace_provider_hours(target_provider uuid, schedule jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare row_count integer; unique_day_count integer;
begin
  if auth.uid() is null or not public.owns_provider(target_provider) then
    raise exception using errcode = '42501', message = 'provider owner required';
  end if;
  if jsonb_typeof(schedule) <> 'array' then
    raise exception using errcode = '22023', message = 'schedule must be an array';
  end if;
  select count(*), count(distinct day_of_week)
  into row_count, unique_day_count
  from jsonb_to_recordset(schedule) as x(day_of_week integer, is_closed boolean, open_time time, close_time time);
  if row_count <> 7 or unique_day_count <> 7 then
    raise exception using errcode = '22023', message = 'schedule must contain seven unique days';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(schedule) as x(day_of_week integer, is_closed boolean, open_time time, close_time time)
    where day_of_week not between 0 and 6
      or is_closed is null
      or (not is_closed and (open_time is null or close_time is null or open_time >= close_time))
  ) then
    raise exception using errcode = '22023', message = 'invalid opening-hours entry';
  end if;
  delete from public.provider_hours where provider_id = target_provider;
  insert into public.provider_hours(provider_id, day_of_week, is_closed, open_time, close_time)
  select target_provider, day_of_week, is_closed,
    case when is_closed then null else open_time end,
    case when is_closed then null else close_time end
  from jsonb_to_recordset(schedule) as x(day_of_week integer, is_closed boolean, open_time time, close_time time);
  return jsonb_build_object('ok', true, 'days', 7);
end;
$$;
create or replace function public.respond_to_quote(target_quote uuid, expected_status text, response_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare current_quote public.quote_requests%rowtype; clean_response text := trim(coalesce(response_text, ''));
begin
  if expected_status not in ('sent', 'viewed') or length(clean_response) not between 2 and 2000 then
    raise exception using errcode = '22023', message = 'invalid quote response';
  end if;
  select * into current_quote from public.quote_requests where id = target_quote for update;
  if not found then raise exception using errcode = 'P0002', message = 'quote request not found'; end if;
  if not public.owns_provider(current_quote.provider_id) then
    raise exception using errcode = '42501', message = 'provider owner required';
  end if;
  if current_quote.status <> expected_status then
    raise exception using errcode = '40001', message = 'quote request changed; reload and retry';
  end if;
  update public.quote_requests set status = 'responded', response_message = clean_response, responded_at = now()
  where id = target_quote;
  return jsonb_build_object('ok', true, 'status', 'responded');
end;
$$;
revoke all on function public.replace_provider_hours(uuid, jsonb) from public;
revoke all on function public.respond_to_quote(uuid, text, text) from public;
grant execute on function public.replace_provider_hours(uuid, jsonb) to authenticated;
grant execute on function public.respond_to_quote(uuid, text, text) to authenticated;
commit;
