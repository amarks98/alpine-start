alter table public.routes add column if not exists plan_date date;
alter table public.routes add column if not exists description text not null default '';
