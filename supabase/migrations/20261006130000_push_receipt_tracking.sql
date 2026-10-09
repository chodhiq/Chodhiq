begin;
create extension if not exists pg_cron with schema pg_catalog;
alter table public.push_delivery_attempts drop constraint push_delivery_attempts_outcome_check;
alter table public.push_delivery_attempts add constraint push_delivery_attempts_outcome_check check(outcome in ('accepted','delivered','failed','skipped'));
alter table public.push_delivery_attempts add column expo_ticket_id text;
alter table public.push_delivery_attempts add column recipient_token_hash text;
alter table public.push_delivery_attempts add column receipt_checked_at timestamptz;
alter table public.push_delivery_attempts add column delivery_state text not null default 'unknown' check(delivery_state in ('unknown','accepted','receipt_ok','failed','skipped'));
create index push_delivery_pending_receipts_idx on public.push_delivery_attempts(created_at) where delivery_state='accepted' and receipt_checked_at is null;
create function public.dispatch_push_receipt_check() returns void language plpgsql security definer set search_path=pg_catalog,public as $$
declare endpoint text; secret text;
begin
 select decrypted_secret into endpoint from vault.decrypted_secrets where name='community_push_url';
 select decrypted_secret into secret from vault.decrypted_secrets where name='community_push_secret';
 if endpoint is null or secret is null then return; end if;
 perform net.http_post(url:=regexp_replace(endpoint,'/push-notification$','/check-push-receipts'),headers:=jsonb_build_object('Content-Type','application/json','x-webhook-secret',secret),body:='{}'::jsonb,timeout_milliseconds:=15000);
end $$;
revoke all on function public.dispatch_push_receipt_check() from public,anon,authenticated;
do $$ begin
 if to_regnamespace('cron') is not null then
  perform cron.schedule('chodhiq-push-receipts','*/5 * * * *','select public.dispatch_push_receipt_check()');
 end if;
end $$;
commit;
