drop function public.public_provider_directory_page(integer, integer);

create function public.public_provider_directory_page(
  page_offset integer default 0,
  page_size integer default 100
)
returns table (
  id uuid,
  business_name text,
  base_city text,
  base_postcode text,
  service_areas text[],
  price_range smallint,
  google_place_id text,
  cover_image_url text,
  is_verified boolean,
  data_verification_status text,
  data_verified_at date,
  avg_rating numeric,
  review_count integer,
  created_at timestamptz,
  category_name text,
  category_slug text,
  service_tags text[],
  opening_hours_summary jsonb
)
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
begin
  if page_offset < 0 or page_size < 1 or page_size > 500 then
    raise exception 'Invalid provider directory page range';
  end if;

  return query
  select
    p.id,
    p.business_name,
    p.base_city,
    p.base_postcode,
    p.service_areas,
    p.price_range,
    p.google_place_id,
    p.cover_image_url,
    p.is_verified,
    p.data_verification_status,
    p.data_verified_at,
    p.avg_rating,
    p.review_count,
    p.created_at,
    c.name,
    c.slug,
    coalesce(service_summary.service_tags, '{}'::text[]),
    coalesce(hours_summary.opening_hours_summary, '[]'::jsonb)
  from public.providers as p
  join public.categories as c on c.id = p.category_id
  left join lateral (
    select array_agg(distinct service.name order by service.name) as service_tags
    from public.services as service
    where service.provider_id = p.id
  ) as service_summary on true
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'day_of_week', hours.day_of_week,
        'is_closed', hours.is_closed,
        'open_time', hours.open_time,
        'close_time', hours.close_time
      )
      order by hours.day_of_week
    ) as opening_hours_summary
    from public.provider_hours as hours
    where hours.provider_id = p.id
  ) as hours_summary on true
  order by p.created_at desc nulls last, p.id
  limit page_size
  offset page_offset;
end;
$$;

revoke all on function public.public_provider_directory_page(integer, integer) from public;
grant execute on function public.public_provider_directory_page(integer, integer) to anon, authenticated;
