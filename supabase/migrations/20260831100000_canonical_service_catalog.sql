-- Canonical ChodhiQ service groups and selectable service catalogue.
alter table public.categories add column if not exists is_active boolean not null default true;
update public.categories set is_active = false;
insert into public.categories(name,slug,icon,color,sort_order,is_active) values
  ('Home & Property','home-property','house','#5B8DEF',10,true),
  ('Automotive','automotive','car','#D98A48',20,true),
  ('Personal & Family','personal-family','users','#C46CD7',30,true),
  ('Business & Professional','business-professional','briefcase','#8A76D5',40,true),
  ('Moving & Delivery','moving-delivery','truck','#58A6D8',50,true),
  ('Beauty & Wellness','beauty-wellness','sparkles','#C46CD7',60,true),
  ('Events','events','calendar','#D98A48',70,true),
  ('Education','education','graduation-cap','#E7B86D',80,true),
  ('Commercial Services','commercial-services','building','#08724F',90,true)
on conflict(slug) do update set name=excluded.name,icon=excluded.icon,color=excluded.color,sort_order=excluded.sort_order,is_active=true;
create table if not exists public.service_catalog (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null check(char_length(trim(name)) between 2 and 120),
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(category_id,name)
);
alter table public.service_catalog enable row level security;
drop policy if exists "Public reads active service catalogue" on public.service_catalog;
create policy "Public reads active service catalogue" on public.service_catalog for select using(is_active);
drop policy if exists "Admins manage service catalogue" on public.service_catalog;
create policy "Admins manage service catalogue" on public.service_catalog for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.service_catalog to anon,authenticated;
grant insert,update,delete on public.service_catalog to authenticated;
with catalogue(group_slug,services) as (values
  ('home-property',array['Plumber','Electrician','Handyman','Carpenter','Painter','Tiler','Bricklayer','Roofer','Landscaper','Gardener','Cleaner','Pest control','Pool maintenance','Locksmith','Glazier','Fencing','Flooring','Concreting','Home renovation','Appliance repair','Air-conditioning technician','Heating technician','Solar installer']),
  ('automotive',array['Mechanic','Mobile mechanic','Auto electrician','Tyre service','Car detailing','Car wash','Towing','Roadside assistance','Windscreen repair','Panel beater','Car inspection','Car servicing','Battery replacement','Vehicle transport','Car rental']),
  ('personal-family',array['Babysitter','Nanny','Elderly care','Disability support','Personal care','Dog walker','Pet sitter','Pet grooming','House sitter','Personal trainer','Tutor','Music teacher','Driving instructor']),
  ('business-professional',array['Accountant','Bookkeeper','Tax agent','Lawyer','Mortgage broker','Financial adviser','Insurance broker','Business consultant','Graphic designer','Photographer','Videographer','Web developer','App developer','Digital marketer','SEO specialist','Social media manager','Copywriter','Translator']),
  ('moving-delivery',array['Removalist','Furniture delivery','Courier','Local delivery','Man with a van','Rubbish removal','Skip-bin service','Storage','Moving cleaner','Packing service']),
  ('beauty-wellness',array['Hairdresser','Barber','Makeup artist','Beautician','Nail technician','Massage therapist','Personal trainer','Yoga instructor','Beauty salon','Mobile beauty services']),
  ('events',array['Event planner','Wedding planner','Photographer','Videographer','DJ','Singer/musician','Caterer','Cake maker','Florist','Decoration service','MC','Party entertainer','Venue hire','Equipment hire']),
  ('education',array['School tutor','University tutor','Language teacher','English teacher','Malayalam teacher','Music teacher','Dance teacher','Coding teacher','Sports coach','Exam preparation']),
  ('commercial-services',array['Commercial cleaning','Office maintenance','Security','IT support','Signage','Printing','Business photography','Commercial landscaping','Electrical contractors','Building contractors','Waste management'])
), expanded as (
  select c.id category_id, x.name, catalogue.group_slug||'-'||trim(both '-' from regexp_replace(lower(x.name),'[^a-z0-9]+','-','g')) slug, x.ordinality::integer sort_order
  from catalogue join public.categories c on c.slug=catalogue.group_slug
  cross join lateral unnest(catalogue.services) with ordinality as x(name,ordinality)
)
insert into public.service_catalog(category_id,name,slug,sort_order,is_active)
select category_id,name,slug,sort_order,true from expanded
on conflict(slug) do update set category_id=excluded.category_id,name=excluded.name,sort_order=excluded.sort_order,is_active=true,updated_at=now();
alter table public.services add column if not exists catalog_service_id uuid references public.service_catalog(id) on delete set null;
create index if not exists services_catalog_service_idx on public.services(catalog_service_id);
