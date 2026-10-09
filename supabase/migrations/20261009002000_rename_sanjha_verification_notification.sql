begin;

update public.notifications
set body = replace(body, 'Sanjha', 'ChodhiQ')
where body like '%Sanjha%';

create or replace function public.notify_verification_decision()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  provider_name text;
begin
  if new.status in ('approved','rejected') and old.status is distinct from new.status then
    select business_name into provider_name from public.providers where id = new.provider_id;
    insert into public.notifications(user_id, title, body) values
      (
        new.submitted_by,
        case when new.status = 'approved' then 'Verification approved' else 'Verification not approved' end,
        case when new.status = 'approved'
          then format('%s is now verified on ChodhiQ.', provider_name)
          else format('Your verification request for %s was rejected. Review the admin notes before resubmitting.', provider_name)
        end
      );
  end if;
  return new;
end;
$$;

commit;
