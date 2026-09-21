-- Remove the pre-launch directory dataset before the legitimate provider test run.
-- Scope is limited to the two repository-owned imports. Application-created
-- providers have a null source_profile_id and are not affected.

do $$
begin
  if exists (
    select 1
    from public.providers
    where (
      source_profile_id like 'uk-si-%'
      or source_profile_id in (select source_id from public.directory_profiles)
    )
      and (owner_id is not null or coalesce(is_claimed, false))
  ) then
    raise exception
      'Refusing to remove imported providers because at least one has been claimed or assigned an owner';
  end if;
end
$$;

-- Provider-owned dependent rows use ON DELETE CASCADE. Import candidates use
-- ON DELETE SET NULL. No customer-created or application-created provider is
-- selected by this predicate.
delete from public.providers
where source_profile_id like 'uk-si-%'
   or source_profile_id in (select source_id from public.directory_profiles);

-- This table contains only the earlier demo directory import, including
-- creator/community rows that were never promoted into providers.
delete from public.directory_profiles;
