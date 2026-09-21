-- Optional routing metadata used by the push delivery function and deep links.
alter table public.notifications
  add column if not exists type text,
  add column if not exists entity_type text,
  add column if not exists entity_id text;
