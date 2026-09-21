-- Staging-only Leicester test catalogue. These records are unverified,
-- unclaimed and deliberately have no third-party image URL. The customer app
-- supplies neutral bundled category artwork until an owner approves an image.

do $$
begin
  if current_setting('app.settings.environment', true) = 'production' then
    raise exception 'Leicester test providers must not be applied to Production';
  end if;
end
$$;

with candidates(source_profile_id,business_name,category_slug,subcategory,description,base_postcode,street_address,phone,contact_email,website,source_url) as (
  values
    ('staging-leicester-test-leicester-plumbers','Leicester Plumbers Ltd','home-property','Plumber','Emergency plumbing, boilers, heating, bathrooms, kitchens, drains and commercial plumbing.','LE2 9TQ','20 Windsor Avenue, Glen Parva, Leicester','07878 994804','info@leicesterplumb.co.uk','https://leicesterplumb.co.uk/','https://leicesterplumb.co.uk/'),
    ('staging-leicester-test-lt-electrical','LT Electrical','home-property','Electrician','Domestic, commercial and industrial electrical work, CCTV, EV chargers, fuse boards and lighting.',null,'Leicester','0116 456 0757','info@lt-electrical.co.uk','https://lt-electrical.co.uk/','https://lt-electrical.co.uk/'),
    ('staging-leicester-test-jaffer-motor-care','Jaffer Motor Care','automotive','Car detailing','Mobile premium car detailing using professional products.',null,'Leicester mobile service','07404 184381','jmc@jaffermotorcare.com','https://jaffermotorcare.com/','https://jaffermotorcare.com/'),
    ('staging-leicester-test-m8-pitstop','M8 PitStop Ltd','automotive','Mechanic','Vehicle mechanic and repair garage.','LE3 0BH','39 Upperton Road, Leicester','0116 233 3497','m8pitstop@gmail.com','https://www.m8pitstop.co.uk/','https://www.m8pitstop.co.uk/'),
    ('staging-leicester-test-abbey-cars-mot','Abbey Cars & MOT','automotive','Car servicing','MOT preparation, servicing, diagnostics, brakes, clutches, suspension, tyres, batteries, dent repair and respraying.','LE5 0PU','Unit 5, 15 Layton Road, Leicester','07599 001160','abbeycars.mot@gmail.com','https://www.abbeycarsandmot.co.uk/','https://www.abbeycarsandmot.co.uk/'),
    ('staging-leicester-test-amicare','Amicare','personal-family','Personal care','Live-in, personal, palliative and person-centred home care.','LE4 8EB','Amicare House, 651 Melton Road, Thurmaston, Leicester','0116 260 1747','managers@amicare.org.uk','https://www.amicare.org.uk/','https://www.amicare.org.uk/'),
    ('staging-leicester-test-reliance-care','Reliance Community Care','personal-family','Personal care','Domiciliary, live-in, companionship, palliative, respite, reablement and children''s care.',null,'Leicester','0116 367 4568','info@reliancecommunitycare.co.uk','https://www.reliancecommunitycare.co.uk/','https://www.reliancecommunitycare.co.uk/'),
    ('staging-leicester-test-accountants','Leicester Accountants','business-professional','Accountant','Tax returns, bookkeeping and accountancy support.','LE1 6DP','38 Market Street, Leicester','0333 339 0092','help@yourleicesteraccountants.co.uk','https://www.yourleicesteraccountants.co.uk/','https://www.yourleicesteraccountants.co.uk/'),
    ('staging-leicester-test-insight','Insight Consultancy','business-professional','Digital marketer','Websites, branding, digital marketing and business-growth strategy.','LE1 1TG','Workspace 30, Phoenix Square, 4 Midland Street, Leicester','0116 482 0412','info@insightconsultancy.co.uk','https://insightconsultancy.co.uk/','https://insightconsultancy.co.uk/'),
    ('staging-leicester-test-moving-company','Leicester Moving Company','moving-delivery','Removalist','Home removals, man-and-van, storage moves, packing, furniture delivery and clearance.',null,'Leicester','0116 456 0631','quote@leicestermovingcompany.co.uk','https://www.leicestermovingcompany.co.uk/','https://www.leicestermovingcompany.co.uk/'),
    ('staging-leicester-test-couriers','Leicester Couriers','moving-delivery','Courier','Same-day parcels, pallets, documents, haulage and next-day delivery.','LE2 0PF','London Road, Leicester','0116 313 2445','info@leicester-couriers.co.uk','https://www.leicester-couriers.co.uk/','https://www.leicester-couriers.co.uk/'),
    ('staging-leicester-test-emma-brown','Emma Brown Hair','beauty-wellness','Hairdresser','Hair salon services and grooming.','LE2 3AE','140 Clarendon Park Road, Leicester','0116 270 4374','salon@emmabrownhair.co.uk','https://www.emmabrownhair.co.uk/','https://www.emmabrownhair.co.uk/'),
    ('staging-leicester-test-remy','Remy Hair Salon','beauty-wellness','Beauty salon','Hair and beauty salon with an established Leicester premises.','LE1 6RN','20 King Street, Leicester','0116 255 9697','remyhairsalon@gmail.com','https://www.remyhairsalon.co.uk/','https://www.remyhairsalon.co.uk/'),
    ('staging-leicester-test-lavish','Lavish Leicester','beauty-wellness','Makeup artist','Qualified hair and makeup services including bridal work, fashion shoots and event styling.','LE5 5EG','70 Moat Road, Leicester','07835 498343','contact@lavishleicester.co.uk','https://lavishleicester.co.uk/about/','https://lavishleicester.co.uk/about/'),
    ('staging-leicester-test-sarafina','Sarafina Events','events','Event planner','Wedding and party planning, styling, venue dressing and equipment hire.',null,'15 Cherry Hills Road, Leicester','07877 083470','joy@sarafinaevents.com','https://sarafinaevents.com/','https://sarafinaevents.com/'),
    ('staging-leicester-test-event-decor','The Event Decor Company','events','Decoration service','Mandaps, wedding and reception decor, themed events, florals and venue dressing.','LE1 2DE','Gilbros Business Centre, 4/18 Crafton Street West, Leicester','07810 491613','info@eventdecorcompany.co.uk','https://www.eventdecorcompany.co.uk/','https://www.eventdecorcompany.co.uk/'),
    ('staging-leicester-test-tutors','Leicester Tutors','education','School tutor','Personalised primary and secondary tuition from qualified teachers.',null,'Leicester','07898 366092','enquiries@leicestertutors.co.uk','https://leicester-tutors.co.uk/','https://leicester-tutors.co.uk/'),
    ('staging-leicester-test-music-lessons','Leicester Music Lessons Ltd','education','Music teacher','One-to-one piano, guitar, brass, woodwind, strings and other instrument lessons.','LE2 1ND','178 London Road, Leicester','07849 417372','enquiry@leicestermusiclessons.co.uk','https://www.leicestermusiclessons.co.uk/','https://www.leicestermusiclessons.co.uk/'),
    ('staging-leicester-test-mh-cleaning','MH Cleaning Solutions Ltd','commercial-services','Commercial cleaning','Commercial, office, warehouse, factory, carpet, window and duct cleaning.','LE2 8DD','65 Eastwood Road, Leicester','0116 283 5505','markhenfrey@mhcleaningservices.co.uk','https://www.mhcleaningsolutionsltd.co.uk/','https://www.mhcleaningsolutionsltd.co.uk/'),
    ('staging-leicester-test-reveal-cleaning','Reveal Cleaning Solutions Ltd','commercial-services','Commercial cleaning','Commercial, industrial, office, hospitality, student accommodation and builders'' cleaning.','LE1 5QQ','19-25 Friar Lane, Leicester','0116 326 1006','info@revealcleaningsolutions.co.uk','https://www.revealcleaningsolutions.co.uk/','https://www.revealcleaningsolutions.co.uk/')
)
insert into public.providers(
  source_profile_id,business_name,category_id,subcategory,description,base_city,
  base_postcode,street_address,service_areas,phone,contact_email,website,source_url,
  cover_image_url,is_verified,is_claimed,verification_status,data_notes
)
select
  x.source_profile_id,x.business_name,c.id,x.subcategory,x.description,'Leicester',
  x.base_postcode,x.street_address,array['Leicester'],x.phone,x.contact_email,x.website,x.source_url,
  null,false,false,'unverified','STAGING ONLY: researched public contact data; no listing or image permission recorded.'
from candidates x
join public.categories c on c.slug=x.category_slug
on conflict(source_profile_id) do update set
  business_name=excluded.business_name,category_id=excluded.category_id,subcategory=excluded.subcategory,
  description=excluded.description,base_city=excluded.base_city,base_postcode=excluded.base_postcode,
  street_address=excluded.street_address,service_areas=excluded.service_areas,phone=excluded.phone,
  contact_email=excluded.contact_email,website=excluded.website,source_url=excluded.source_url,
  cover_image_url=null,is_verified=false,is_claimed=false,verification_status='unverified',
  data_notes=excluded.data_notes,updated_at=now();
