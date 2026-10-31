-- Photo storage. See docs/02-lld.md §3.4 and docs/03 §A.2 for the privacy trade-off.
--   photos  (public):  {userId}/{tripId}/{photoId}/thumb.webp | display.webp
--   exports (private): {userId}/{tripId}/{photoId}/export.jpg

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('photos', 'photos', true, 5242880, array['image/webp', 'image/jpeg']),
  ('exports', 'exports', false, 8388608, array['image/jpeg']);

-- Users can only write and delete inside their own folder.
create policy "upload own photos" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('photos', 'exports')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "delete own photos" on storage.objects for delete to authenticated
  using (
    bucket_id in ('photos', 'exports')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "read own exports" on storage.objects for select to authenticated
  using (
    bucket_id = 'exports'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
