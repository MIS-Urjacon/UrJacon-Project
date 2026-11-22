-- Assignment log (Assign Work page + the bell). Run once on an existing database (SQL Editor).
-- One row per assignee whenever work is assigned, and one "removed" row when an assignment is taken back.
-- kind: 'temporary' = assigned with an Assign button on a page (until the work moves to its next step);
--       'permanent' = set in Settings > Assignees (all work that comes to that page, until changed).
-- Safe to re-run.
create table if not exists public.urjacon_assignments (
  id               text primary key,
  record_type      text not null,                 -- 'lead' | 'case'
  record_id        text not null,                 -- L-0001 / C-0001
  customer_name    text not null default '',
  bp_sc_number     text not null default '',
  page             text not null default '',      -- page slug the work was on, e.g. 'document-receive'
  page_label       text not null default '',
  action           text not null default 'assigned',   -- 'assigned' | 'removed'
  kind             text not null default 'temporary',  -- 'temporary' (Assign button) | 'permanent' (Settings > Assignees)
  assigned_to_id   text not null default '',
  assigned_to_name text not null default '',
  assigned_by_id   text not null default '',
  assigned_by_name text not null default '',
  assigned_on      date,                          -- the assign date picked in the dialog
  assigned_at      timestamptz not null default now(),
  seen_at          timestamptz                    -- null = the assignee has not read the message yet
);

-- Added after the first version of this table: harmless when the table was just created above.
alter table public.urjacon_assignments add column if not exists kind text not null default 'temporary';

create index if not exists uj_assignments_to_idx     on public.urjacon_assignments (assigned_to_id, seen_at);
create index if not exists uj_assignments_record_idx on public.urjacon_assignments (record_id);
create index if not exists uj_assignments_at_idx     on public.urjacon_assignments (assigned_at desc);

-- Same access as the other tables (DEMO: anon key). Before real use switch to the service role key.
alter table public.urjacon_assignments enable row level security;
drop policy if exists "urjacon anon access" on public.urjacon_assignments;
create policy "urjacon anon access" on public.urjacon_assignments for all to anon using (true) with check (true);
grant select, insert, update, delete on public.urjacon_assignments to anon;
