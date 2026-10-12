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
