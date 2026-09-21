begin;
grant select, update on public.notifications to authenticated;
create or replace function public.notify_provider_owner_on_review()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare recipient uuid; provider_name text;
begin
  select owner_id,business_name into recipient,provider_name from public.providers where id=new.provider_id;
  if recipient is not null and recipient is distinct from new.user_id then
    insert into public.notifications(user_id,title,body) values
      (recipient,'New customer review',format('A customer left a %s-star review for %s.',new.rating,provider_name));
  end if;
  return new;
end $$;
drop trigger if exists notify_provider_owner_on_review_trigger on public.reviews;
create trigger notify_provider_owner_on_review_trigger after insert on public.reviews
for each row execute function public.notify_provider_owner_on_review();
create or replace function public.notify_verification_decision()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare provider_name text;
begin
  if new.status in ('approved','rejected') and old.status is distinct from new.status then
    select business_name into provider_name from public.providers where id=new.provider_id;
    insert into public.notifications(user_id,title,body) values
      (new.submitted_by,
       case when new.status='approved' then 'Verification approved' else 'Verification not approved' end,
       case when new.status='approved' then format('%s is now verified on Sanjha.',provider_name)
         else format('Your verification request for %s was rejected. Review the admin notes before resubmitting.',provider_name) end);
  end if;
  return new;
end $$;
drop trigger if exists notify_verification_decision_trigger on public.verification_requests;
create trigger notify_verification_decision_trigger after update of status on public.verification_requests
for each row execute function public.notify_verification_decision();
create or replace function public.notify_provider_owner_on_quote()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare recipient uuid; provider_name text;
begin
  select owner_id,business_name into recipient,provider_name from public.providers where id=new.provider_id;
  if recipient is not null and recipient is distinct from new.user_id then
    insert into public.notifications(user_id,title,body) values
      (recipient,'New quote request',format('A customer requested a quote from %s.',provider_name));
  end if;
  return new;
end $$;
drop trigger if exists notify_provider_owner_on_quote_trigger on public.quote_requests;
create trigger notify_provider_owner_on_quote_trigger after insert on public.quote_requests
for each row execute function public.notify_provider_owner_on_quote();
create or replace function public.notify_customer_on_quote_status()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare provider_name text;
begin
  if old.status is distinct from new.status then
    select business_name into provider_name from public.providers where id=new.provider_id;
    insert into public.notifications(user_id,title,body) values
      (new.user_id,'Quote request updated',format('%s marked your quote request as %s.',provider_name,new.status));
  end if;
  return new;
end $$;
drop trigger if exists notify_customer_on_quote_status_trigger on public.quote_requests;
create trigger notify_customer_on_quote_status_trigger after update of status on public.quote_requests
for each row execute function public.notify_customer_on_quote_status();
create or replace function public.notify_customer_on_review_reply()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
declare recipient uuid; provider_name text;
begin
  if tg_op='UPDATE' and old.body is not distinct from new.body then return new; end if;
  select r.user_id,p.business_name into recipient,provider_name
  from public.reviews r join public.providers p on p.id=r.provider_id where r.id=new.review_id;
  if recipient is not null and recipient is distinct from new.author_id then
    insert into public.notifications(user_id,title,body) values
      (recipient,'Business replied to your review',format('%s replied to your review.',provider_name));
  end if;
  return new;
end $$;
drop trigger if exists notify_customer_on_review_reply_trigger on public.review_replies;
create trigger notify_customer_on_review_reply_trigger after insert or update of body on public.review_replies
for each row execute function public.notify_customer_on_review_reply();
commit;
