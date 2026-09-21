-- RLS already permits public provider reads, but the staging anon role lost
-- its table privilege. Expose only the fields consumed by public discovery.
grant select (
  id,business_name,category_id,description,base_city,base_postcode,
  service_areas,languages_spoken,years_experience,price_range,phone,whatsapp,
  website,google_place_id,cover_image_url,portfolio_urls,is_verified,
  avg_rating,review_count,created_at
) on public.providers to anon;

-- Signed-in provider/admin dashboards rely on the complete provider record;
-- row-level policies continue to govern mutations.
grant select on public.providers to authenticated;
