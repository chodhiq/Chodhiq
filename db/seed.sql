-- Seed categories
insert into categories (name, slug, icon, color, sort_order) values
  ('Interior Design', 'interior-design', 'sofa', '#2E5E4E', 1),
  ('Mechanic & Auto Repair', 'mechanic', 'wrench', '#C1554A', 2),
  ('Electrician', 'electrician', 'zap', '#B8894A', 3),
  ('Plumber', 'plumber', 'droplet', '#3D7C6B', 4),
  ('Tailoring & Alterations', 'tailoring', 'scissors', '#A85C7A', 5),
  ('Event Catering', 'catering', 'utensils', '#B8894A', 6),
  ('Bridal & Beauty', 'beauty', 'sparkles', '#A85C7A', 7),
  ('Photography & Videography', 'photography', 'camera', '#4A6B8A', 8),
  ('Legal & Immigration', 'legal', 'scale', '#5C6B4A', 9),
  ('Removals', 'removals', 'truck', '#4A6B8A', 10),
  ('Cleaning Services', 'cleaning', 'sparkle', '#3D7C6B', 11),
  ('Accounting & Tax', 'accounting', 'calculator', '#2E5E4E', 12)
on conflict (slug) do update set
  name = excluded.name,
  icon = excluded.icon,
  color = excluded.color,
  sort_order = excluded.sort_order;

-- Seed providers — real UK businesses sourced from Google Places.
-- Name, address, phone, rating, and review_count are real.
-- cover_image_url uses a placeholder photo service since Places didn't return photos here.
-- languages_spoken / years_experience / price_range are left null — not exposed by Google,
-- would need to be collected from the business directly during onboarding.
insert into providers (business_name, category_id, description, base_city, base_postcode, base_location, service_areas, avg_rating, review_count, phone, whatsapp, cover_image_url, is_verified)
select
  'Paniz Bastani Interiors',
  (select id from categories where slug = 'interior-design'),
  'Bespoke interior design studio based in Birmingham.',
  'Birmingham', 'B17 9HD',
  st_setsrid(st_makepoint(-1.9478860999999998, 52.4634972), 4326)::geography,
  array['Birmingham'],
  5.0, 15,
  '+44 7595 247150', '+44 7595 247150',
  'https://picsum.photos/seed/paniz-interiors-cover/400/300',
  true
on conflict (business_name, base_postcode) do nothing;

insert into providers (business_name, category_id, description, base_city, base_postcode, base_location, service_areas, avg_rating, review_count, phone, whatsapp, cover_image_url, is_verified)
select
  'M A Autos',
  (select id from categories where slug = 'mechanic'),
  'Auto repair garage based in Bradford, known for honest pricing.',
  'Bradford', 'BD7 4EX',
  st_setsrid(st_makepoint(-1.7890749, 53.7802215), 4326)::geography,
  array['Bradford'],
  4.4, 61,
  '+44 7908 569953', '+44 7908 569953',
  'https://picsum.photos/seed/ma-autos-cover/400/300',
  true
on conflict (business_name, base_postcode) do nothing;

insert into providers (business_name, category_id, description, base_city, base_postcode, base_location, service_areas, avg_rating, review_count, phone, whatsapp, cover_image_url, is_verified)
select
  'Milan Catering',
  (select id from categories where slug = 'catering'),
  'Wedding and event catering based in Leicester.',
  'Leicester', 'LE5 4AN',
  st_setsrid(st_makepoint(-1.0941039, 52.6388182), 4326)::geography,
  array['Leicester'],
  4.9, 132,
  '+44 116 276 4455', '+44 116 276 4455',
  'https://picsum.photos/seed/milan-catering-cover/400/300',
  true
on conflict (business_name, base_postcode) do nothing;

insert into providers (business_name, category_id, description, base_city, base_postcode, base_location, service_areas, avg_rating, review_count, phone, whatsapp, cover_image_url, is_verified)
select
  'Henna Artist London — Sweta Vajir',
  (select id from categories where slug = 'beauty'),
  'Bridal mehndi and party henna artist based in Harrow, serving London.',
  'Harrow', 'HA3 0XY',
  st_setsrid(st_makepoint(-0.2987832, 51.5866841), 4326)::geography,
  array['Harrow', 'London'],
  5.0, 124,
  '+44 7718 818893', '+44 7718 818893',
  'https://picsum.photos/seed/sweta-henna-cover/400/300',
  true
on conflict (business_name, base_postcode) do nothing;

insert into providers (business_name, category_id, description, base_city, base_postcode, base_location, service_areas, avg_rating, review_count, phone, whatsapp, cover_image_url, is_verified)
select
  'Stitched by Farida',
  (select id from categories where slug = 'tailoring'),
  'Bridal outfit alterations and tailoring based in Bradford.',
  'Bradford', 'BD2 3LA',
  st_setsrid(st_makepoint(-1.7229189, 53.8098831), 4326)::geography,
  array['Bradford', 'Birmingham'],
  4.9, 59,
  '+44 7500 947877', '+44 7500 947877',
  'https://picsum.photos/seed/farida-tailoring-cover/400/300',
  true
on conflict (business_name, base_postcode) do nothing;

insert into providers (business_name, category_id, description, base_city, base_postcode, base_location, service_areas, avg_rating, review_count, phone, whatsapp, cover_image_url, is_verified)
select
  'Sami''s Studio',
  (select id from categories where slug = 'photography'),
  'Wedding photography and videography based in London.',
  'London', 'E7 8JE',
  st_setsrid(st_makepoint(0.0327077, 51.5429427), 4326)::geography,
  array['London', 'Essex'],
  4.8, 609,
  '+44 20 3590 0210', '+44 20 3590 0210',
  'https://picsum.photos/seed/samis-studio-cover/400/300',
  true
on conflict (business_name, base_postcode) do nothing;

insert into providers (business_name, category_id, description, base_city, base_postcode, base_location, service_areas, avg_rating, review_count, phone, whatsapp, cover_image_url, is_verified)
select
  'SA Electrical & Plumbing Contractors',
  (select id from categories where slug = 'electrician'),
  'Electrical and plumbing contractor based in London.',
  'London', 'E10 6EU',
  st_setsrid(st_makepoint(-0.0073534, 51.5743473), 4326)::geography,
  array['London'],
  4.9, 110,
  '+44 7796 893239', '+44 7796 893239',
  'https://picsum.photos/seed/sa-electrical-cover/400/300',
  true
on conflict (business_name, base_postcode) do nothing;
