begin;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('ad-creatives','ad-creatives',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "Public reads ad creative files" on storage.objects
for select to anon,authenticated using(bucket_id='ad-creatives');
create policy "Admins upload ad creative files" on storage.objects
for insert to authenticated with check(bucket_id='ad-creatives' and public.is_admin());
create policy "Admins remove ad creative files" on storage.objects
for delete to authenticated using(bucket_id='ad-creatives' and public.is_admin());

-- RLS already restricts campaign writes to platform administrators; the
-- existing schema granted only SELECT, so the dashboard could not save them.
grant insert,update,delete on public.ad_campaigns to authenticated;

commit;
