-- Undo the anon access given by schema.sql (run this once the app uses the
-- service_role key via SUPABASE_SERVICE_ROLE_KEY). RLS stays on, so the anon key
-- can no longer read or write anything.
do $$
declare t text;
begin
  foreach t in array array[
    'urjacon_cases','urjacon_case_steps','urjacon_case_schedule',
    'urjacon_leads','urjacon_lead_followups','urjacon_users','urjacon_masters'
  ]
  loop
    execute format('drop policy if exists "urjacon anon access" on public.%I', t);
  end loop;
end $$;
drop policy if exists "urjacon anon read uploads"   on storage.objects;
drop policy if exists "urjacon anon insert uploads" on storage.objects;
drop policy if exists "urjacon anon read pmsg"   on storage.objects;
drop policy if exists "urjacon anon insert pmsg" on storage.objects;
