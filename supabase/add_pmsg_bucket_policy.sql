-- Run once in Supabase > SQL Editor.
-- The app now uploads to the private bucket "Urjacon PMSG" (one folder per type:
-- Leads, Quotations, Documents, Site-Survey, Issues, Others). The bucket stays
-- private; files are served only through /api/files. With SUPABASE_SERVICE_ROLE_KEY
-- set in .env these policies are not needed (the service role bypasses them).
-- With only the anon key (demo), the anon role needs read + upload on this bucket.
drop policy if exists "urjacon anon read pmsg"   on storage.objects;
drop policy if exists "urjacon anon insert pmsg" on storage.objects;
create policy "urjacon anon read pmsg"   on storage.objects for select to anon
  using (bucket_id = 'Urjacon PMSG');
create policy "urjacon anon insert pmsg" on storage.objects for insert to anon
  with check (bucket_id = 'Urjacon PMSG');
