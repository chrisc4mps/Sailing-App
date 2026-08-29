-- Run this in the Supabase SQL Editor AFTER creating a Storage bucket
-- named exactly "qualifications" (Storage -> New bucket). Leave the
-- "Public bucket" toggle OFF - files are private, and the app reads
-- them via short-lived signed URLs instead.
--
-- Each file is stored at "<user_id>/<filename>", so these policies
-- restrict every user to their own folder within the bucket.

create policy "Users can upload their own qualification files"
on storage.objects for insert
with check (
  bucket_id = 'qualifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can view their own qualification files"
on storage.objects for select
using (
  bucket_id = 'qualifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete their own qualification files"
on storage.objects for delete
using (
  bucket_id = 'qualifications'
  and (storage.foldername(name))[1] = auth.uid()::text
);
