-- Leicester seed rows with an exact normalized name/postcode match in the
-- official FSA Leicester City extract dated 2026-09-16. No contact details,
-- ownership, ratings, or ChodhiQ verification status are inferred.
begin;

with confirmed(source_profile_id,business_name,category_slug,base_postcode,street_address,source_url,fsa_id,raw_id) as (values
  ('leicester-fsa-1275427','Bitsy''s Emporium Of Awesome','restaurants','LE35DL','4 North Mills, Frog Island, Leicester','https://ratings.food.gov.uk/business/1275427','1275427','4'),
  ('leicester-fsa-1873891','Public','restaurants','LE16RN','41 King Street, Leicester','https://ratings.food.gov.uk/business/1873891','1873891','6'),
  ('leicester-fsa-1217084','Chloe Gourmet','restaurants','LE15GW','10 - 12 Cank Street, Leicester','https://ratings.food.gov.uk/business/1217084','1217084','7'),
  ('leicester-fsa-982648','Halcyon Kitchen','restaurants','LE21TT','95 Queens Road, Leicester','https://ratings.food.gov.uk/business/982648','982648','14'),
  ('leicester-fsa-1198937','Hallaci Cafe','restaurants','LE13AN','79 Church Gate, Leicester','https://ratings.food.gov.uk/business/1198937','1198937','15'),
  ('leicester-fsa-656243','Grays Coffee Shop & Kitchen','restaurants','LE11RE','Leicester Creative Business Depot, 31 Rutland Street, Leicester','https://ratings.food.gov.uk/business/656243','656243','17'),
  ('leicester-fsa-1764666','B B''s Cafe','restaurants','LE45AS','28 Belgrave Road, Leicester','https://ratings.food.gov.uk/business/1764666','1764666','18'),
  ('leicester-fsa-1693207','Merchant Of Venice','restaurants','LE16FE','173 - 175 Granby Street, Leicester','https://ratings.food.gov.uk/business/1693207','1693207','19'),
  ('leicester-fsa-1645361','Wild Tango','restaurants','LE16RJ','14 King Street, Leicester','https://ratings.food.gov.uk/business/1645361','1645361','33'),
  ('leicester-fsa-1130305','Kings Coffee House','restaurants','LE16XE','Holy Trinity Church, Upper King Street, Leicester','https://ratings.food.gov.uk/business/1130305','1130305','35'),
  ('leicester-fsa-643136','The Tiny Bakery','restaurants','LE23AE','98 Clarendon Park Road, Leicester','https://ratings.food.gov.uk/business/643136','643136','36'),
  ('leicester-fsa-1935361','L''amore Dessert Lounge','restaurants','LE21QJ','145 Evington Road, Leicester','https://ratings.food.gov.uk/business/1935361','1935361','39'),
  ('leicester-fsa-923153','Rafiq Catering','catering','LE55DS','77 Dorothy Road, Leicester','https://ratings.food.gov.uk/business/923153','923153','43'),
  ('leicester-fsa-1948181','Madras Flavours','restaurants','LE14PF','Basement Restaurant, 25-27 Highcross Street, Leicester','https://ratings.food.gov.uk/business/1948181','1948181','101'),
  ('leicester-fsa-50190','The Good Earth','restaurants','LE11JX','19 Free Lane, Leicester','https://ratings.food.gov.uk/business/50190','50190','104'),
  ('leicester-fsa-1920112','Global Food Village','grocery-stores','LE13YH','1 Kildare Walk, Leicester','https://ratings.food.gov.uk/business/1920112','1920112','119'),
  ('leicester-fsa-211017','Shiva Shakti Foods','grocery-stores','LE45HD','4 - 6 Macdonald Road, Leicester','https://ratings.food.gov.uk/business/211017','211017','127'),
  ('leicester-fsa-776458','Apna Supermarket','grocery-stores','LE20GT','Ground Floor Shop, 31 Melbourne Road, Leicester','https://ratings.food.gov.uk/business/776458','776458','130'),
  ('leicester-fsa-703452','33 Cank Street','restaurants','LE15GX','Leicester','https://ratings.food.gov.uk/business/703452','703452','179'),
  ('leicester-fsa-1649128','Art''s Greek Cuisine','restaurants','LE16DN','11 Market Street, Leicester','https://ratings.food.gov.uk/business/1649128','1649128','181'),
  ('leicester-fsa-1531491','Audrey','restaurants','LE14LD','21 St Nicholas Place, Leicester','https://ratings.food.gov.uk/business/1531491','1531491','182'),
  ('leicester-fsa-668703','Dakshin','restaurants','LE45AT','150 Belgrave Road, Leicester','https://ratings.food.gov.uk/business/668703','668703','205'),
  ('leicester-fsa-1892896','Chennai Bites','restaurants','LE45AT','84 Belgrave Road, Leicester','https://ratings.food.gov.uk/business/1892896','1892896','208'),
  ('leicester-fsa-1931210','Kerala Arabic House','restaurants','LE54HJ','360 St Saviours Road, Leicester','https://ratings.food.gov.uk/business/1931210','1931210','212'),
  ('leicester-fsa-1876357','Southern Spices','restaurants','LE15TE','Restaurant, 9 Upper Brown Street, Leicester','https://ratings.food.gov.uk/business/1876357','1876357','213'),
  ('leicester-fsa-1735054','Mo''s Wembley','restaurants','LE13XL','144 Belgrave Gate, Leicester','https://ratings.food.gov.uk/business/1735054','1735054','215'),
  ('leicester-fsa-597392','Sanjay Foods','catering','LE45HD','Unit E, Belgrave Industrial Centre, Macdonald Road, Leicester','https://ratings.food.gov.uk/business/597392','597392','216'),
  ('leicester-fsa-356927','Chilli Guys','catering','LE53EB','Unit Q, Vulcan Business Centre, Vulcan Road, Leicester','https://ratings.food.gov.uk/business/356927','356927','219')
), resolved as (
  select x.*,c.id category_id from confirmed x join public.categories c on c.slug=x.category_slug
)
insert into public.providers(
  source_profile_id,business_name,category_id,subcategory,description,base_city,
  base_postcode,street_address,service_areas,source_url,data_notes,is_verified,
  is_claimed,verification_status
)
select source_profile_id,business_name,category_id,
  case category_slug when 'restaurants' then 'Food business' when 'grocery-stores' then 'Food retailer' else 'Caterer' end,
  business_name||' is listed at this Leicester location in the official Food Standards Agency register.',
  'Leicester',base_postcode,street_address,array['Leicester'],source_url,
  'FSA Leicester City extract 2026-09-16; FHRS ID '||fsa_id||'; source seed row '||raw_id||'. Contact details, ownership and provider verification are not asserted.',
  false,false,'unverified'
from resolved
on conflict (business_name,base_postcode) do update set
  category_id=excluded.category_id,street_address=excluded.street_address,
  source_url=excluded.source_url,data_notes=excluded.data_notes,updated_at=now();

commit;
