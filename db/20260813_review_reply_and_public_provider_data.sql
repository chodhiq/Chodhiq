begin;

grant select on public.services, public.provider_hours, public.review_replies to anon, authenticated;

create or replace function public.notify_customer_on_review_reply()
returns trigger language plpgsql security definer
set search_path = pg_catalog, public as $$
declare
  recipient uuid;
  provider_name text;
begin
  if tg_op = 'UPDATE' and old.body is not distinct from new.body then
    return new;
  end if;
  select r.user_id, p.business_name
    into recipient, provider_name
  from public.reviews r
  join public.providers p on p.id = r.provider_id
  where r.id = new.review_id;

  if recipient is not null and recipient is distinct from new.author_id then
    insert into public.notifications(user_id, title, body)
    values(recipient, 'Business replied to your review',
      format('%s replied to your review.', provider_name));
  end if;
  return new;
end $$;

drop trigger if exists notify_customer_on_review_reply_trigger on public.review_replies;
create trigger notify_customer_on_review_reply_trigger
after insert or update of body on public.review_replies for each row
execute function public.notify_customer_on_review_reply();

commit;
