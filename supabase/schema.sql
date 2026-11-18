-- Urjacon Process System: Supabase schema (real columns).
-- Run this once in the Supabase SQL Editor. Safe to run again.
--
-- What it does
--   1. If the OLD json-style tables exist (urjacon_cases ... with a `data` column) it
--      renames them to urjacon_*_json_old.
--   2. Creates the new tables with proper columns.
--   3. Copies the old data into the new tables (only if the old tables exist).
--   4. Turns on RLS and opens the tables to the ANON key (demo setup).
--
-- Tables
--   urjacon_cases            one row per case
--   urjacon_case_steps       one row per submitted step of a case (form answers as columns)
--   urjacon_case_schedule    Timestamp / Planned Date / Actual Date per case step
--   urjacon_leads            one row per lead
--   urjacon_lead_followups   follow-up history of a lead
--   urjacon_users            login users
--   urjacon_masters          Branch, Dealer, ... lists (one row per value)

-- ---------------------------------------------------------------- 1. keep old data
do $$
declare t text;
begin
  foreach t in array array['urjacon_cases','urjacon_leads','urjacon_users','urjacon_masters']
  loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = t and column_name = 'data'
    ) then
      execute format('alter table public.%I rename to %I', t, t || '_json_old');
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------- 2. new tables
create table if not exists public.urjacon_cases (
  id                     text not null,                 -- C-0001
  added_at               timestamptz not null default now(),
  lead_id                text,                          -- L-0001 the case came from
  bp_sc_number           text not null default '',
  customer_name          text not null default '',
  village                text not null default '',
  product_code           text not null default '',
  branch                 text not null default '',
  dealer                 text not null default '',
  liaisoning             text not null default '',
  route                  text not null default '',
  deal_amount            numeric not null default 0,
  preferred_payment_mode text not null default '',
  lead_source            text not null default '',
  stage                  text not null default 'nameCheck',
  extra                  jsonb not null default '{}',   -- any field the app adds later
  updated_at             timestamptz not null default now(),
  constraint uj_cases_pk primary key (id)
);

-- Each step has its own small form, so one table holds every step's answers.
-- Columns a step does not use stay NULL.
create table if not exists public.urjacon_case_steps (
  case_id            text not null,
  step_key           text not null,                     -- nameCheck, login, siteSurvey, ...
  status             text,                              -- done | hold
  submitted_at       timestamptz,
  submitted_by       text,
  work_status        text,                              -- Done / Not Done
  remark             text,
  amount             numeric,                           -- amount received
  bank               text,
  bank_branch        text,
  bank_quotation     numeric,
  responsible_person text,
  approver           text,
  installer_name     text,
  payment_received   text,                              -- Yes / No
  login_check        text,                              -- Login Done / Login Hold
  images             jsonb,                             -- login images [{url,name}]
  cash_or_loan       text,
  corridor           text,
  customer_name      text,                              -- site survey
  village            text,
  contact_number     text,
  survey_date        text,
  surveyor_name      text,
  aadhaar_name       text, aadhaar_matched  boolean, aadhaar_files  jsonb,   -- name check
  pan_name           text, pan_matched      boolean, pan_files      jsonb,
  passbook_name      text, passbook_matched boolean, passbook_files jsonb,
  bill_name          text, bill_matched     boolean, bill_files     jsonb,
  extra              jsonb not null default '{}',
  constraint uj_case_steps_pk primary key (case_id, step_key),
  constraint uj_case_steps_case_fk foreign key (case_id)
    references public.urjacon_cases (id) on delete cascade
);

create table if not exists public.urjacon_case_schedule (
  case_id      text not null,
  step_key     text not null,
  arrived_at   timestamptz,        -- "Timestamp": when the case reached this step
  planned_date timestamptz,
  actual_date  timestamptz,
  constraint uj_case_schedule_pk primary key (case_id, step_key),
  constraint uj_case_schedule_case_fk foreign key (case_id)
    references public.urjacon_cases (id) on delete cascade
);

create table if not exists public.urjacon_leads (
  id                  text not null,                    -- L-0001
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  status              text not null default 'open',     -- open | lost | converted
  lost_reason         text not null default '',
  converted_case_id   text,
  converted_at        timestamptz,
  created_by          text,
  updated_by          text,
  customer_name       text not null default '',
  mobile              text not null default '',
  village             text not null default '',
  address             text not null default '',
  bp_sc_number        text not null default '',
  source              text not null default '',
  agent               text not null default '',
  monthly_bill        numeric not null default 0,
  kw_wanted           numeric not null default 0,
  product_code        text not null default '',
  payment_mode        text not null default '',
  temperature         text not null default 'Warm',
  next_follow_up      text not null default '',
  outcome             text not null default '',
  quotation_reference text not null default '',
  commission          numeric not null default 0,
  branch              text not null default '',
  dealer              text not null default '',
  liaisoning          text not null default '',
  route               text not null default '',
  deal_amount         numeric not null default 0,
  lead_stage          text not null default 'new',
  doc_aadhaar         boolean not null default false,
  doc_pan             boolean not null default false,
  doc_passbook        boolean not null default false,
  doc_bill            boolean not null default false,
  doc_terrace_photo   boolean not null default false,
  extra               jsonb not null default '{}',
  constraint uj_leads_pk primary key (id)
);

create table if not exists public.urjacon_lead_followups (
  lead_id        text not null,
  seq            int  not null,                          -- 0,1,2... in order
  followed_at    timestamptz,
  contact_type   text not null default '',               -- Call / Visit ...
  outcome        text not null default '',
  next_follow_up text not null default '',
  remark         text not null default '',
  by_user        text not null default '',
  constraint uj_lead_followups_pk primary key (lead_id, seq),
  constraint uj_lead_followups_lead_fk foreign key (lead_id)
    references public.urjacon_leads (id) on delete cascade
);

create table if not exists public.urjacon_users (
  id            text not null,                           -- U-0001
  username      text not null,
  name          text not null default '',
  role          text not null default 'user',            -- admin | user
  active        boolean not null default true,
  pages         jsonb,                                   -- custom page access (slug list); NULL = role default
  password_hash text not null,                           -- salted scrypt hash, never plain text
  created_at    timestamptz not null default now(),
  constraint uj_users_pk primary key (id)
);

-- type = branch / dealer / liaisoning / productCode / bank / responsiblePerson / installer.
-- A row with type '_seeded' only remembers that the starting values were loaded.
create table if not exists public.urjacon_masters (
  type       text not null,
  value      text not null,
  sort_order int  not null default 0,
  constraint uj_masters_pk primary key (type, value)
);

create index if not exists uj_cases_bp_idx     on public.urjacon_cases (bp_sc_number);
create index if not exists uj_cases_stage_idx  on public.urjacon_cases (stage);
create index if not exists uj_cases_lead_idx   on public.urjacon_cases (lead_id);
create index if not exists uj_leads_mobile_idx on public.urjacon_leads (mobile);
create index if not exists uj_leads_status_idx on public.urjacon_leads (status);
alter table public.urjacon_users add column if not exists pages jsonb;
create index if not exists uj_users_name_idx   on public.urjacon_users (lower(username));

-- ---------------------------------------------------------------- 3. copy old data
do $$
begin
  if to_regclass('public.urjacon_cases_json_old') is not null then
    insert into public.urjacon_cases
      (id, added_at, lead_id, bp_sc_number, customer_name, village, product_code, branch,
       dealer, liaisoning, route, deal_amount, preferred_payment_mode, lead_source, stage)
    select id,
           coalesce((data->>'timestamp')::timestamptz, now()),
           data->>'leadId',
           coalesce(data->>'bpScNumber', ''), coalesce(data->>'customerName', ''),
           coalesce(data->>'village', ''), coalesce(data->>'productCode', ''),
           coalesce(data->>'branch', ''), coalesce(data->>'dealer', ''),
           coalesce(data->>'liaisoning', ''), coalesce(data->>'route', ''),
           coalesce((data->>'dealAmount')::numeric, 0),
           coalesce(data->>'preferredPaymentMode', ''), coalesce(data->>'leadSource', ''),
           coalesce(data->>'stage', 'nameCheck')
    from public.urjacon_cases_json_old
    on conflict (id) do nothing;

    insert into public.urjacon_case_steps
      (case_id, step_key, status, submitted_at, submitted_by, work_status, remark, amount,
       bank, bank_branch, bank_quotation, responsible_person, approver, installer_name,
       payment_received, login_check, images, cash_or_loan, corridor, customer_name, village,
       contact_number, survey_date, surveyor_name,
       aadhaar_name, aadhaar_matched, aadhaar_files, pan_name, pan_matched, pan_files,
       passbook_name, passbook_matched, passbook_files, bill_name, bill_matched, bill_files)
    select c.id, s.key, s.value->>'status', (s.value->>'submittedAt')::timestamptz, s.value->>'submittedBy',
           s.value->>'workStatus', s.value->>'remark', (s.value->>'amount')::numeric,
           s.value->>'bank', s.value->>'bankBranch', (s.value->>'bankQuotation')::numeric,
           s.value->>'responsiblePerson', s.value->>'approver', s.value->>'installerName',
           s.value->>'paymentReceived', s.value->>'loginCheck', s.value->'images',
           s.value->>'cashOrLoan', s.value->>'corridor', s.value->>'customerName', s.value->>'village',
           s.value->>'contactNumber', s.value->>'surveyDate', s.value->>'surveyorName',
           s.value#>>'{aadhaar,name}',  (s.value#>>'{aadhaar,matched}')::boolean,  s.value#>'{aadhaar,files}',
           s.value#>>'{pan,name}',      (s.value#>>'{pan,matched}')::boolean,      s.value#>'{pan,files}',
           s.value#>>'{passbook,name}', (s.value#>>'{passbook,matched}')::boolean, s.value#>'{passbook,files}',
           s.value#>>'{bill,name}',     (s.value#>>'{bill,matched}')::boolean,     s.value#>'{bill,files}'
    from public.urjacon_cases_json_old c,
         lateral jsonb_each(coalesce(c.data->'steps', '{}'::jsonb)) as s(key, value)
    on conflict (case_id, step_key) do nothing;

    insert into public.urjacon_case_schedule (case_id, step_key, arrived_at, planned_date, actual_date)
    select c.id, s.key, (s.value->>'timestamp')::timestamptz,
           (s.value->>'plannedDate')::timestamptz, (s.value->>'actualDate')::timestamptz
    from public.urjacon_cases_json_old c,
         lateral jsonb_each(coalesce(c.data->'schedule', '{}'::jsonb)) as s(key, value)
    on conflict (case_id, step_key) do nothing;
  end if;

  if to_regclass('public.urjacon_leads_json_old') is not null then
    insert into public.urjacon_leads
      (id, created_at, updated_at, status, lost_reason, converted_case_id, converted_at,
       created_by, updated_by, customer_name, mobile, village, address, bp_sc_number, source,
       agent, monthly_bill, kw_wanted, product_code, payment_mode, temperature, next_follow_up,
       outcome, quotation_reference, commission, branch, dealer, liaisoning, route, deal_amount,
       lead_stage, doc_aadhaar, doc_pan, doc_passbook, doc_bill, doc_terrace_photo)
    select id,
           coalesce((data->>'timestamp')::timestamptz, now()), (data->>'updatedAt')::timestamptz,
           coalesce(data->>'status', 'open'), coalesce(data->>'lostReason', ''),
           data->>'convertedCaseId', (data->>'convertedAt')::timestamptz,
           data->>'createdBy', data->>'updatedBy',
           coalesce(data->>'customerName', ''), coalesce(data->>'mobile', ''),
           coalesce(data->>'village', ''), coalesce(data->>'address', ''),
           coalesce(data->>'bpScNumber', ''), coalesce(data->>'source', ''), coalesce(data->>'agent', ''),
           coalesce((data->>'monthlyBill')::numeric, 0), coalesce((data->>'kwWanted')::numeric, 0),
           coalesce(data->>'productCode', ''), coalesce(data->>'paymentMode', ''),
           coalesce(data->>'temperature', 'Warm'), coalesce(data->>'nextFollowUp', ''),
           coalesce(data->>'outcome', ''), coalesce(data->>'quotationReference', ''),
           coalesce((data->>'commission')::numeric, 0),
           coalesce(data->>'branch', ''), coalesce(data->>'dealer', ''),
           coalesce(data->>'liaisoning', ''), coalesce(data->>'route', ''),
           coalesce((data->>'dealAmount')::numeric, 0), coalesce(data->>'leadStage', 'new'),
           coalesce((data#>>'{documents,aadhaar}')::boolean, false),
           coalesce((data#>>'{documents,pan}')::boolean, false),
           coalesce((data#>>'{documents,passbook}')::boolean, false),
           coalesce((data#>>'{documents,bill}')::boolean, false),
           coalesce((data#>>'{documents,terracePhoto}')::boolean, false)
    from public.urjacon_leads_json_old
    on conflict (id) do nothing;

    insert into public.urjacon_lead_followups
      (lead_id, seq, followed_at, contact_type, outcome, next_follow_up, remark, by_user)
    select l.id, (f.n - 1)::int, (f.v->>'at')::timestamptz,
           coalesce(f.v->>'type', ''), coalesce(f.v->>'outcome', ''),
           coalesce(f.v->>'nextFollowUp', ''), coalesce(f.v->>'remark', ''), coalesce(f.v->>'by', '')
    from public.urjacon_leads_json_old l,
         lateral jsonb_array_elements(coalesce(l.data->'followUps', '[]'::jsonb)) with ordinality as f(v, n)
    on conflict (lead_id, seq) do nothing;
  end if;

  if to_regclass('public.urjacon_users_json_old') is not null then
    insert into public.urjacon_users (id, username, name, role, active, password_hash, created_at)
    select id, data->>'username', coalesce(data->>'name', ''), coalesce(data->>'role', 'user'),
           coalesce((data->>'active')::boolean, true), data->>'passwordHash',
           coalesce((data->>'createdAt')::timestamptz, now())
    from public.urjacon_users_json_old
    on conflict (id) do nothing;
  end if;

  if to_regclass('public.urjacon_masters_json_old') is not null then
    insert into public.urjacon_masters (type, value, sort_order)
    select m.key, v.value, (v.n - 1)::int
    from public.urjacon_masters_json_old o,
         lateral jsonb_each(o.data) as m(key, value),
         lateral jsonb_array_elements_text(m.value) with ordinality as v(value, n)
    where jsonb_typeof(m.value) = 'array'
    on conflict (type, value) do nothing;

    insert into public.urjacon_masters (type, value, sort_order)
    select '_seeded', '1', 0
    where exists (select 1 from public.urjacon_masters_json_old)
    on conflict (type, value) do nothing;
  end if;
end $$;

-- ---------------------------------------------------------------- 4. access (DEMO)
-- RLS on for every table. The app connects with the ANON key, so the anon role is
-- given full access. DEMO ONLY: before real use switch the app to the service_role
-- key (SUPABASE_SERVICE_ROLE_KEY) and run supabase/revoke_anon_access.sql.
do $$
declare t text;
begin
  foreach t in array array[
    'urjacon_cases','urjacon_case_steps','urjacon_case_schedule',
    'urjacon_leads','urjacon_lead_followups','urjacon_users','urjacon_masters'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "urjacon anon access" on public.%I', t);
    execute format(
      'create policy "urjacon anon access" on public.%I for all to anon using (true) with check (true)', t);
    execute format('grant select, insert, update, delete on public.%I to anon', t);
  end loop;
end $$;

-- Uploads bucket (private; served through /api/files) + anon read/upload for it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'urjacon-uploads', 'urjacon-uploads', false, 5242880,
  array['image/jpeg','image/png','image/webp','image/gif','application/pdf']
)
on conflict (id) do nothing;

drop policy if exists "urjacon anon read uploads"   on storage.objects;
drop policy if exists "urjacon anon insert uploads" on storage.objects;
create policy "urjacon anon read uploads"   on storage.objects for select to anon
  using (bucket_id = 'urjacon-uploads');
create policy "urjacon anon insert uploads" on storage.objects for insert to anon
  with check (bucket_id = 'urjacon-uploads');
