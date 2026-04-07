-- Favoritar refeições compostas (scores de impacto / análise)
alter table public.composite_meals
  add column if not exists is_favorite boolean not null default false;
