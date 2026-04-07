-- GliErica: alimentos, refeições compostas, registo de hidratos (RLS por utilizador)
-- Executa no SQL Editor do Supabase (ou via CLI) depois de criar o projeto.

create extension if not exists "pgcrypto";

-- Perfil: meta diária de hidratos (gramas)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  daily_carb_goal numeric not null default 200
    check (daily_carb_goal > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Biblioteca de alimentos
create table public.foods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  carbs_per_100g numeric not null
    check (carbs_per_100g >= 0),
  is_favorite boolean not null default false,
  created_at timestamptz not null default now()
);

create index foods_user_id_lower_name_idx
  on public.foods (user_id, lower(name));

-- Refeição composta (ex.: "Pequeno Almoço VIP")
create table public.composite_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.composite_meal_items (
  id uuid primary key default gen_random_uuid(),
  composite_meal_id uuid not null
    references public.composite_meals (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  grams numeric not null check (grams > 0),
  unique (composite_meal_id, food_id)
);

-- Registos de hidratos (logged_on = dia civil YYYY-MM-DD enviado pela app)
create table public.carb_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  logged_on date not null,
  grams_carbs numeric not null check (grams_carbs >= 0),
  food_id uuid references public.foods (id) on delete set null,
  composite_meal_id uuid references public.composite_meals (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index carb_entries_user_logged_on_idx
  on public.carb_entries (user_id, logged_on);

-- RLS
alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.composite_meals enable row level security;
alter table public.composite_meal_items enable row level security;
alter table public.carb_entries enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "foods_all_own"
  on public.foods for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "composite_meals_all_own"
  on public.composite_meals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "composite_meal_items_select"
  on public.composite_meal_items for select
  using (
    exists (
      select 1 from public.composite_meals m
      where m.id = composite_meal_id and m.user_id = auth.uid()
    )
  );

create policy "composite_meal_items_insert"
  on public.composite_meal_items for insert
  with check (
    exists (
      select 1 from public.composite_meals m
      where m.id = composite_meal_id and m.user_id = auth.uid()
    )
    and exists (
      select 1 from public.foods f
      where f.id = food_id and f.user_id = auth.uid()
    )
  );

create policy "composite_meal_items_update"
  on public.composite_meal_items for update
  using (
    exists (
      select 1 from public.composite_meals m
      where m.id = composite_meal_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.composite_meals m
      where m.id = composite_meal_id and m.user_id = auth.uid()
    )
    and exists (
      select 1 from public.foods f
      where f.id = food_id and f.user_id = auth.uid()
    )
  );

create policy "composite_meal_items_delete"
  on public.composite_meal_items for delete
  using (
    exists (
      select 1 from public.composite_meals m
      where m.id = composite_meal_id and m.user_id = auth.uid()
    )
  );

create policy "carb_entries_all_own"
  on public.carb_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Perfil automático ao registar
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
