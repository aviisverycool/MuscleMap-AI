-- Run this in Supabase Dashboard -> SQL Editor
create table if not exists backend_profile (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table backend_profile alter column id drop default;

-- Remove the former unscoped profile. It cannot be attributed safely to any
-- one conversation and may contain health details from a deleted chat.
delete from backend_profile where id = 'default';

create table if not exists backend_history (
  session_id text primary key,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists backend_state (
  session_id text primary key,
  context text,
  request text,
  updated_at timestamptz not null default now()
);
