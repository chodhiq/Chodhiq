begin;
-- The original table check only permitted images on paid promotions.
alter table public.community_posts drop constraint if exists community_posts_check;

create or replace function public.enforce_community_promotion()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  entitlement public.provider_entitlements%rowtype;
  provider_owner uuid;
begin
  if new.post_type <> 'promotion' then
    -- Community updates and experiences may keep their uploaded image.
    return new;
  end if;
  if new.provider_id is null or new.image_url is null then
    raise exception 'Promotional posts require a provider and poster image';
  end if;
  select owner_id into provider_owner from public.providers where id = new.provider_id;
  if provider_owner is distinct from new.author_id then
    raise exception 'Only the business owner can publish this promotion';
  end if;
  select * into entitlement from public.provider_entitlements where provider_id = new.provider_id for update;
  if not found or not entitlement.offers_active or entitlement.expires_at is null or entitlement.expires_at <= now() then
    raise exception 'The £10 Community Offers plan is not active';
  end if;
  if entitlement.offer_period_start is null or entitlement.offer_period_start < date_trunc('month', current_date)::date then
    update public.provider_entitlements set offer_period_start=date_trunc('month',current_date)::date,offer_posts_used=1,updated_at=now() where provider_id=new.provider_id;
  elsif entitlement.offer_posts_used >= 3 then
    raise exception 'Monthly allowance of 3 promotional posters has been used';
  else
    update public.provider_entitlements set offer_posts_used=offer_posts_used+1,updated_at=now() where provider_id=new.provider_id;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_community_promotion() from public, anon, authenticated;
commit;
