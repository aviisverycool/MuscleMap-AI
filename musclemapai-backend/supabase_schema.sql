-- Run this in Supabase Dashboard -> SQL Editor
create table if not exists backend_profile (
  id text primary key default 'default',
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

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