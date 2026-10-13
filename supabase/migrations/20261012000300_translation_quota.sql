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
