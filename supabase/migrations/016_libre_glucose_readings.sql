-- Leituras CGM sincronizadas a partir do LibreLinkUp (acumulado ao longo do tempo).
-- Valores normalizados em mg/dL para gráficos e relatórios consistentes.

create table if not exists public.libre_glucose_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  measured_at timestamptz not null,
  value_mg_dl numeric not null check (value_mg_dl > 0),
  created_at timestamptz not null default now(),
  unique (user_id, measured_at)
);

create index if not exists libre_glucose_readings_user_measured_idx
  on public.libre_glucose_readings (user_id, measured_at desc);

comment on table public.libre_glucose_readings is
  'Pontos de glicemia do sensor Libre; ingeridos a partir de snapshots LibreLinkUp com sessão autenticada.';

alter table public.libre_glucose_readings enable row level security;

drop policy if exists "libre_glucose_readings_all_own" on public.libre_glucose_readings;

create policy "libre_glucose_readings_all_own"
  on public.libre_glucose_readings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
