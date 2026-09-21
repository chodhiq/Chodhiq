begin;
alter table public.profiles
  add column if not exists expo_push_token text,
  add column if not exists push_token_updated_at timestamptz;
alter table public.profiles
  drop constraint if exists profiles_expo_push_token_format;
alter table public.profiles
  add constraint profiles_expo_push_token_format
  check (
    expo_push_token is null
    or expo_push_token ~ '^(ExponentPushToken|ExpoPushToken)[[][A-Za-z0-9_-]+[]]$'
  );
commit;
