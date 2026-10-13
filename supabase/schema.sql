-- Alpine Start — Phase 1 schema.
-- Apply in the Supabase SQL editor, or: psql "$DATABASE_URL" -f supabase/schema.sql

create table if not exists public.routes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name             text not null check (length(trim(name)) > 0),
  lat              double precision not null check (lat between -90 and 90),
  lng              double precision not null check (lng between -180 and 180),
  elev_m           integer not null default 0,
  timezone         text not null,            -- IANA, derived from lat/lng at create time
  segments         jsonb not null default '[]'::jsonb,

  -- The plan controls. These are persisted because the demo changes them; the
  -- selected plan date and original route description are persisted as well.
  party_size       integer not null default 2  check (party_size between 1 and 20),
  storm_cutoff_min integer not null default 840 check (storm_cutoff_min between 0 and 1439),
  margin_min       integer not null default 60  check (margin_min between 0 and 600),

  created_at       timestamptz not null default now()
);

create index if not exists routes_user_created_idx
  on public.routes (user_id, created_at desc);

alter table public.routes enable row level security;

-- Owner-only, all four operations. Note what this means for reads of someone
-- else's route: the row is filtered out rather than refused, so the page gets
-- zero rows and must call notFound().
drop policy if exists "routes_select_own" on public.routes;
create policy "routes_select_own" on public.routes
  for select using (auth.uid() = user_id);

drop policy if exists "routes_insert_own" on public.routes;
create policy "routes_insert_own" on public.routes
  for insert with check (auth.uid() = user_id);

drop policy if exists "routes_update_own" on public.routes;
create policy "routes_update_own" on public.routes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "routes_delete_own" on public.routes;
create policy "routes_delete_own" on public.routes
  for delete using (auth.uid() = user_id);

-- Also applied as a separate upgrade migration to existing projects.
alter table public.routes add column if not exists plan_date date;
alter table public.routes add column if not exists description text not null default '';

-- Optional AI translation budget (equivalent to migration 003).
-- Durable daily AI call budget. No route descriptions or provider secrets stored.
create table if not exists public.translation_usage (
  day date not null,
  scope text not null,
  calls integer not null default 0 check (calls >= 0),
  primary key (day, scope)
);
alter table public.translation_usage enable row level security;
revoke all on public.translation_usage from anon, authenticated;

create or replace function public.reserve_translation_quota()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor uuid := auth.uid();
  today date := (statement_timestamp() at time zone 'UTC')::date;
  actor_scope text;
  global_calls integer;
  actor_calls integer;
begin
  if actor is null then return false; end if;
  actor_scope := 'user:' || actor::text;
  -- All reservations take the same transaction lock, so global and user limits
  -- cannot be exceeded by concurrent requests or multiple server instances.
  perform pg_catalog.pg_advisory_xact_lock(187645239);
  insert into public.translation_usage(day, scope) values (today, 'global'), (today, actor_scope)
    on conflict do nothing;
  select calls into global_calls from public.translation_usage where day = today and scope = 'global';
  select calls into actor_calls from public.translation_usage where day = today and scope = actor_scope;
  if global_calls >= 100 or actor_calls >= 20 then return false; end if;
  update public.translation_usage set calls = calls + 1 where day = today and scope in ('global', actor_scope);
  return true;
end;
$$;
revoke all on function public.reserve_translation_quota() from public, anon;
grant execute on function public.reserve_translation_quota() to authenticated;
