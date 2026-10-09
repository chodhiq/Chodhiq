begin;

grant select, insert, update on table public.profiles to authenticated;
grant select, insert, update, delete on table public.saved_items to authenticated;

commit;
