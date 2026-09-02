-- Run this in Supabase Dashboard -> SQL Editor before deploying the backend.
-- Re-running the migration is safe and refreshes all authorization policies.

create table if not exists public.conversations (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Chat',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conversations enable row level security;
revoke all on table public.conversations from public, anon, authenticated;
grant select, insert, update, delete on table public.conversations to authenticated;
grant all on table public.conversations to service_role;

-- Policies are permissive by default, so remove any older policy that could
-- accidentally OR broader access into the owner-only rules below.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
      from pg_policies
      where schemaname = 'public' and tablename = 'conversations'
  loop
    execute format(
      'drop policy if exists %I on public.conversations',
      existing_policy.policyname
    );
  end loop;
end;
$$;

drop policy if exists conversations_select_own on public.conversations;
create policy conversations_select_own
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists conversations_insert_own on public.conversations;
create policy conversations_insert_own
  on public.conversations for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists conversations_update_own on public.conversations;
create policy conversations_update_own
  on public.conversations for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists conversations_delete_own on public.conversations;
create policy conversations_delete_own
  on public.conversations for delete
  to authenticated
  using ((select auth.uid()) = user_id);


-- Backend-only health context. Keys are namespaced as user_id:conversation_id.
create table if not exists public.backend_profile (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.backend_history (
  session_id text primary key,
  messages jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.backend_state (
  session_id text primary key,
  context text,
  request text,
  updated_at timestamptz not null default now()
);

-- Old UUID-only rows cannot be attributed safely after ownership enforcement.
delete from public.backend_profile where strpos(id, ':') = 0;
delete from public.backend_history where strpos(session_id, ':') = 0;
delete from public.backend_state where strpos(session_id, ':') = 0;

alter table public.backend_profile enable row level security;
alter table public.backend_history enable row level security;
alter table public.backend_state enable row level security;

revoke all on table public.backend_profile from public, anon, authenticated;
revoke all on table public.backend_history from public, anon, authenticated;
revoke all on table public.backend_state from public, anon, authenticated;
grant all on table public.backend_profile to service_role;
grant all on table public.backend_history to service_role;
grant all on table public.backend_state to service_role;


-- Shared rate limits work across serverless instances and deployments.
create table if not exists public.backend_rate_limit (
  rate_key text primary key,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.backend_rate_limit enable row level security;
revoke all on table public.backend_rate_limit from public, anon, authenticated;
grant all on table public.backend_rate_limit to service_role;

create or replace function public.consume_backend_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_time timestamptz := clock_timestamp();
  stored_window timestamptz;
  stored_count integer;
begin
  if p_key is null or length(p_key) > 200 or p_limit <= 0 or p_window_seconds <= 0 then
    raise exception 'Invalid rate-limit parameters';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_key, 0));
  select window_started_at, request_count
    into stored_window, stored_count
    from public.backend_rate_limit
    where rate_key = p_key
    for update;

  if not found or stored_window <= current_time - make_interval(secs => p_window_seconds) then
    insert into public.backend_rate_limit(rate_key, window_started_at, request_count, updated_at)
      values (p_key, current_time, 1, current_time)
      on conflict (rate_key) do update
        set window_started_at = excluded.window_started_at,
            request_count = 1,
            updated_at = excluded.updated_at;
    return query select true, 0;
    return;
  end if;

  if stored_count >= p_limit then
    return query select false, greatest(
      1,
      ceil(extract(epoch from (
        stored_window + make_interval(secs => p_window_seconds) - current_time
      )))::integer
    );
    return;
  end if;

  update public.backend_rate_limit
    set request_count = request_count + 1,
        updated_at = current_time
    where rate_key = p_key;
  return query select true, 0;
end;
$$;

revoke all on function public.consume_backend_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_backend_rate_limit(text, integer, integer)
  to service_role;
