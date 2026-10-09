begin;
create extension if not exists pg_net with schema extensions;

-- Credentials are supplied separately through Vault; migration files contain none.
create or replace function public.dispatch_notification_push()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public as $$
declare webhook_url text; webhook_secret text;
begin
  select decrypted_secret into webhook_url from vault.decrypted_secrets where name='community_push_url';
  select decrypted_secret into webhook_secret from vault.decrypted_secrets where name='community_push_secret';
  if webhook_url is null or webhook_secret is null then return new; end if;
  perform net.http_post(
    url:=webhook_url,
    headers:=jsonb_build_object('Content-Type','application/json','x-webhook-secret',webhook_secret),
    body:=jsonb_build_object('type','INSERT','table','notifications','schema','public','record',to_jsonb(new)),
    timeout_milliseconds:=5000
  );
  return new;
end $$;
revoke all on function public.dispatch_notification_push() from public,anon,authenticated;
create trigger dispatch_notification_push_trigger after insert on public.notifications
for each row execute function public.dispatch_notification_push();

do $$ begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
    and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
commit;
