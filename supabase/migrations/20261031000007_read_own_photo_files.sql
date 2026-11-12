-- Supabase Storage needs select as well as delete to remove a file, so owners must be able to
-- see their own rows in the photos bucket. Visitors still load photos by exact public URL only:
-- they can't list the bucket.

create policy "read own photo files" on storage.objects for select to authenticated
  using (
    bucket_id = 'photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
