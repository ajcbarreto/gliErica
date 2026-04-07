-- Hidratação: meta diária (ml) e registos por dia

alter table public.profiles
  add column if not exists daily_water_goal_ml numeric not null default 2000
  check (daily_water_goal_ml > 0);

create table if not exists public.water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_on date not null,
  ml numeric not null check (ml > 0),
  created_at timestamptz not null default now()
);

create index if not exists water_entries_user_logged_on_idx
  on public.water_entries (user_id, logged_on);

-- Alinhado com 003: sem RLS (app pessoal com anon key)
