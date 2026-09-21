
create table if not exists public.directory_profiles (
  source_id text primary key,
  profile_type text not null check (profile_type in ('Business','Creator','Service Provider','Creator Community','Community')),
  name text not null,
  category text not null,
  subcategory text,
  city text,
  region text,
  address text,
  phone text,
  email text,
  website text,
  instagram text,
  facebook text,
  description text not null,
  language_tags text[] not null default '{}',
  verification_status text not null,
  demo_use text not null,
  source_url text not null,
  notes text,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.directory_profiles enable row level security;
drop policy if exists "directory profiles are publicly readable" on public.directory_profiles;
create policy "directory profiles are publicly readable" on public.directory_profiles for select to anon, authenticated using (true);
grant select on public.directory_profiles to anon, authenticated;

alter table public.providers add column if not exists source_profile_id text unique;
alter table public.providers add column if not exists contact_email text;
alter table public.providers add column if not exists street_address text;
alter table public.providers add column if not exists subcategory text;
alter table public.providers add column if not exists instagram text;
alter table public.providers add column if not exists facebook text;
alter table public.providers add column if not exists source_url text;
alter table public.providers add column if not exists data_notes text;

insert into public.categories (name, slug, icon, color, sort_order)
values
 ('South Indian Restaurant','south-indian-restaurant','utensils','#C45A3D',20),
 ('Indian Restaurant','indian-restaurant','utensils','#B26A35',21),
 ('Grocery Store','grocery-store','shopping-basket','#4D7C5B',22),
 ('Digital Marketing','digital-marketing','megaphone','#536FA3',23),
 ('Influencer Marketing','influencer-marketing','users','#95608A',24)
on conflict (slug) do update set name=excluded.name, icon=excluded.icon, color=excluded.color;

with incoming as (
  select *
  from jsonb_to_recordset($seed$[{"id":"biz_001","profile_type":"Business","name":"Dakshin","category":"South Indian Restaurant","subcategory":"Vegetarian / South Indian","city":"Leicester","region":"England","address":"150 Belgrave Road, Leicester LE4 5AT","phone":"0116 319 4200","email":"babu@dakshin.co.uk","website":"https://www.dakshin.co.uk/","instagram":"","facebook":"","description":"Pure-vegetarian South Indian restaurant serving dishes influenced by Andhra Pradesh, Kerala, Tamil Nadu and Goa.","language_tags":"English; Tamil; Malayalam; Telugu","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://www.dakshin.co.uk/","notes":"Opening hours and contact details should be refreshed before public launch."},{"id":"biz_002","profile_type":"Business","name":"Amaravathi","category":"South Indian Restaurant","subcategory":"Fine dining / South Indian","city":"Leicester","region":"England","address":"2-16 Loughborough Road, Leicester LE4 5LD","phone":"0116 319 1850","email":"babu@dakshin.co.uk","website":"https://amaravathi.co.uk/","instagram":"","facebook":"","description":"South Indian restaurant featuring regional cuisine from Andhra Pradesh, Kerala, Tamil Nadu and Goa.","language_tags":"English; Tamil; Malayalam; Telugu","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://amaravathi.co.uk/","notes":"Public basic listing data only."},{"id":"biz_003","profile_type":"Business","name":"Karimeen South Indian Restaurant","category":"South Indian Restaurant","subcategory":"Kerala cuisine","city":"Leicester","region":"England","address":"2 Narborough Road, Leicester LE3 0BQ","phone":"+44 116 243 6639","email":"","website":"https://karimeen.uk/","instagram":"","facebook":"","description":"Kerala-focused restaurant offering curries, seafood, snacks and South Indian dishes.","language_tags":"English; Malayalam","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://karimeen.uk/","notes":"Confirm opening hours directly because the website displays an apparent AM/PM typo."},{"id":"biz_004","profile_type":"Business","name":"Greens Village","category":"Grocery Store","subcategory":"Indian groceries and fresh produce","city":"Leicester","region":"England","address":"93a Marfitt Street, Leicester LE4 6RP","phone":"+44 7868 307352 / +44 7919 720200","email":"","website":"https://www.greensvillage.co.uk/","instagram":"","facebook":"","description":"Indian grocery shop offering vegetables, fruits, groceries, local delivery and WhatsApp ordering.","language_tags":"English; Indian languages","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://www.greensvillage.co.uk/","notes":"Good example for grocery delivery and WhatsApp-order features."},{"id":"biz_005","profile_type":"Business","name":"SN Dosaland","category":"South Indian Restaurant","subcategory":"Vegetarian tiffin and dosa","city":"Birmingham","region":"England","address":"461 Bearwood Road, Birmingham B66 4DH","phone":"07349 367737","email":"","website":"https://www.sndosaland.co.uk/","instagram":"","facebook":"","description":"Family-run South Indian vegetarian kitchen specialising in dosa, idli, vada and regional thali meals.","language_tags":"English; South Indian languages","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://www.sndosaland.co.uk/","notes":"Useful demo listing for WhatsApp checkout and collection."},{"id":"biz_006","profile_type":"Business","name":"Udaya Restaurant","category":"South Indian Restaurant","subcategory":"Kerala cuisine","city":"London","region":"England","address":"105 Katherine Road, East Ham, London","phone":"020 8470 7400","email":"","website":"https://www.udayarestaurant.com/","instagram":"","facebook":"","description":"Established London restaurant specialising in Kerala cuisine.","language_tags":"English; Malayalam","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://www.udayarestaurant.com/","notes":"Verify postcode and social links before production."},{"id":"biz_007","profile_type":"Business","name":"Grace Taste Kerala","category":"South Indian Restaurant","subcategory":"Kerala restaurant and takeaway","city":"Stockport / Greater Manchester","region":"England","address":"48 Osborne Street, Bredbury, Stockport SK6 2BT","phone":"+44 7511 955054","email":"","website":"https://gracetaste.co.uk/","instagram":"","facebook":"","description":"Kerala restaurant and takeaway offering South Indian meals, snacks and catering.","language_tags":"English; Malayalam","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://gracetaste.co.uk/","notes":"Useful for catering and event-service tags."},{"id":"biz_008","profile_type":"Business","name":"The Great Indian","category":"Indian Restaurant","subcategory":"Indian gastropub","city":"London","region":"England","address":"Archway, London","phone":"","email":"","website":"","instagram":"https://www.instagram.com/thegreatindian_ldn/","facebook":"","description":"Indian gastropub in Archway with dine-in and takeaway content.","language_tags":"English; Indian cuisine","verification_status":"Public Instagram profile checked","demo_use":"Suitable with limited fields","source_url":"https://www.instagram.com/thegreatindian_ldn/","notes":"Do not reuse Instagram photos without permission."},{"id":"creator_001","profile_type":"Creator","name":"Shini Muthukrishnan","category":"Content Creator","subcategory":"Broadcasting, lifestyle and culture","city":"London / Manchester","region":"United Kingdom","address":"","phone":"","email":"","website":"https://insanity.com/collection/creators/talent/shini-muthukrishnant-creators","instagram":"","facebook":"","description":"British-Indian-Malaysian broadcaster and creator known for culture, lifestyle and youth-focused content.","language_tags":"English; South Asian culture","verification_status":"Talent agency profile checked","demo_use":"Suitable","source_url":"https://insanity.com/collection/creators/talent/shini-muthukrishnant-creators","notes":"Use profile link and text summary only; obtain permission for images."},{"id":"creator_002","profile_type":"Creator","name":"London Malayali Foodie","category":"Content Creator","subcategory":"Malayali food creator","city":"London","region":"England","address":"","phone":"","email":"","website":"","instagram":"https://www.instagram.com/london_malayali_foodie/","facebook":"","description":"London-based Malayali food-focused creator profile.","language_tags":"English; Malayalam","verification_status":"Public Instagram profile checked","demo_use":"Suitable","source_url":"https://www.instagram.com/london_malayali_foodie/","notes":"Follower counts change; retrieve dynamically or omit."},{"id":"creator_003","profile_type":"Creator Community","name":"UK Malayali Content Creators","category":"Creator Community","subcategory":"Networking and collaboration","city":"UK-wide","region":"United Kingdom","address":"","phone":"","email":"","website":"","instagram":"https://www.instagram.com/uk.mcc/","facebook":"","description":"Community page connecting UK-based Malayali creators for networking, growth and collaboration.","language_tags":"English; Malayalam","verification_status":"Public Instagram profile checked","demo_use":"Suitable","source_url":"https://www.instagram.com/uk.mcc/","notes":"Strong potential onboarding partner rather than an individual creator."},{"id":"creator_004","profile_type":"Creator Community","name":"UK Malayali Vloggers","category":"Creator Community","subcategory":"Malayali vloggers","city":"UK-wide","region":"United Kingdom","address":"","phone":"","email":"","website":"","instagram":"https://www.instagram.com/ukmalayalivloggers/","facebook":"","description":"Public community account focused on UK Malayali vloggers.","language_tags":"English; Malayalam","verification_status":"Public Instagram profile checked","demo_use":"Suitable","source_url":"https://www.instagram.com/ukmalayalivloggers/","notes":"Use as a community profile or outreach lead."},{"id":"creator_005","profile_type":"Creator","name":"London Ki Lali","category":"Content Creator","subcategory":"South Asian London food and lifestyle","city":"London","region":"England","address":"","phone":"","email":"","website":"","instagram":"https://www.instagram.com/londonki_lali/","facebook":"","description":"Creator sharing South Asian food, clothing, places and cultural experiences in London.","language_tags":"English; South Asian culture","verification_status":"Public Instagram profile checked","demo_use":"Suitable","source_url":"https://www.instagram.com/londonki_lali/","notes":"Good fit for food, lifestyle and city-guide filters."},{"id":"service_001","profile_type":"Service Provider","name":"Desi Reach","category":"Digital Marketing","subcategory":"South Asian social media and influencer marketing","city":"London","region":"England","address":"","phone":"","email":"jaya@desireach.co.uk","website":"https://desireach.co.uk/","instagram":"https://www.instagram.com/desi_dreamer_in_london/","facebook":"","description":"London-based social-first marketing agency specialising in South Asian audiences, content, influencer campaigns and paid social.","language_tags":"English; South Asian culture","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://desireach.co.uk/","notes":"Agency and creator ecosystem example."},{"id":"service_002","profile_type":"Service Provider","name":"SM Connect","category":"Influencer Marketing","subcategory":"South Asian diaspora marketing","city":"UK-based","region":"United Kingdom","address":"","phone":"","email":"","website":"https://www.wearesmconnect.com/","instagram":"","facebook":"","description":"South Asian specialist agency providing influencer marketing, ethnic media, PR and festival activations.","language_tags":"English; Urdu; Punjabi; Hindi; Tamil; Bengali","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://www.wearesmconnect.com/","notes":"Suitable for business-to-creator collaboration features."},{"id":"service_003","profile_type":"Service Provider","name":"Aam Creative","category":"Digital Marketing","subcategory":"Multicultural marketing and design","city":"UK / Global","region":"United Kingdom","address":"","phone":"","email":"","website":"https://www.aamcreative.co/","instagram":"","facebook":"","description":"Woman-led multicultural marketing agency focused on culturally intelligent campaigns and underrepresented audiences.","language_tags":"English; multicultural","verification_status":"Official website checked","demo_use":"Suitable","source_url":"https://www.aamcreative.co/","notes":"Confirm precise UK location during onboarding."},{"id":"community_001","profile_type":"Community","name":"South Asian Social","category":"Community Network","subcategory":"Social and professional networking","city":"Midlands / UK-wide","region":"United Kingdom","address":"","phone":"","email":"","website":"","instagram":"https://www.instagram.com/southasiansocial/","facebook":"","description":"Community account focused on helping UK South Asians socialise, network and connect.","language_tags":"English; South Asian community","verification_status":"Public Instagram profile checked","demo_use":"Suitable","source_url":"https://www.instagram.com/southasiansocial/","notes":"Potential events and community partner."}]$seed$::jsonb) as x(
    id text, profile_type text, name text, category text, subcategory text,
    city text, region text, address text, phone text, email text, website text,
    instagram text, facebook text, description text, language_tags text,
    verification_status text, demo_use text, source_url text, notes text
  )
)
insert into public.directory_profiles (
 source_id, profile_type, name, category, subcategory, city, region, address,
 phone, email, website, instagram, facebook, description, language_tags,
 verification_status, demo_use, source_url, notes, updated_at
)
select id, profile_type, name, category, nullif(subcategory,''), nullif(city,''),
 nullif(region,''), nullif(address,''), nullif(phone,''), nullif(email,''),
 nullif(website,''), nullif(instagram,''), nullif(facebook,''), description,
 regexp_split_to_array(language_tags, '\s*;\s*'), verification_status,
 demo_use, source_url, nullif(notes,''), now()
from incoming
on conflict (source_id) do update set
 profile_type=excluded.profile_type, name=excluded.name, category=excluded.category,
 subcategory=excluded.subcategory, city=excluded.city, region=excluded.region,
 address=excluded.address, phone=excluded.phone, email=excluded.email,
 website=excluded.website, instagram=excluded.instagram, facebook=excluded.facebook,
 description=excluded.description, language_tags=excluded.language_tags,
 verification_status=excluded.verification_status, demo_use=excluded.demo_use,
 source_url=excluded.source_url, notes=excluded.notes, updated_at=now();

insert into public.providers (
 source_profile_id, business_name, category_id, description, base_city,
 base_postcode, service_areas, languages_spoken, phone, website, is_verified,
 is_claimed, avg_rating, review_count, contact_email, street_address, subcategory,
 instagram, facebook, source_url, data_notes
)
select d.source_id, d.name, c.id, d.description, coalesce(d.city,'UK-wide'),
 nullif((regexp_match(coalesce(d.address,''), '([A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2})', 'i'))[1],''),
 array[coalesce(d.city,'UK-wide')], d.language_tags, d.phone, d.website,
 false, false, 0, 0, d.email, d.address, d.subcategory, d.instagram, d.facebook,
 d.source_url, d.notes
from public.directory_profiles d
join public.categories c on c.name=d.category
where d.profile_type in ('Business','Service Provider')
on conflict (source_profile_id) do update set
 business_name=excluded.business_name, category_id=excluded.category_id,
 description=excluded.description, base_city=excluded.base_city,
 base_postcode=excluded.base_postcode, service_areas=excluded.service_areas,
 languages_spoken=excluded.languages_spoken, phone=excluded.phone,
 website=excluded.website, contact_email=excluded.contact_email,
 street_address=excluded.street_address, subcategory=excluded.subcategory,
 instagram=excluded.instagram, facebook=excluded.facebook,
 source_url=excluded.source_url, data_notes=excluded.data_notes,
 updated_at=now();
;
