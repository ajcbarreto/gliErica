-- Registo de insulina (UI) e regra opcional HC/UI para comparação orientativa

create table if not exists public.insulin_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_on date not null,
  units numeric not null check (units > 0),
  kind text not null check (kind in ('rapid', 'basal')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists insulin_entries_user_logged_on_idx
  on public.insulin_entries (user_id, logged_on);

-- Gramas de hidrato de carbono que 1 UI de insulina rápida “cobre” (definido com a equipa de saúde).
-- Ex.: se a regra for 1 UI por 12 g, coloca 12. Sugestão do dia ≈ (HC do dia) / este valor.
alter table public.profiles
  add column if not exists insulin_carb_grams_per_unit numeric
  check (insulin_carb_grams_per_unit is null or insulin_carb_grams_per_unit > 0);
