-- Custom page access per user (Settings > Users > Page access). NULL = follow the role's default pages.
alter table public.urjacon_users add column if not exists pages jsonb;
