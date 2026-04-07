-- App pessoal sem autenticação: remove dependência de auth.users e abre acesso com anon key.
-- ATENÇÃO: só usar se o projeto Supabase for privado (chave anon não pode ser pública na Internet).

-- Remover FKs para auth.users (senão não há utilizador real)
alter table public.profiles drop constraint if exists profiles_id_fkey;
alter table public.foods drop constraint if exists foods_user_id_fkey;
alter table public.composite_meals drop constraint if exists composite_meals_user_id_fkey;
alter table public.carb_entries drop constraint if exists carb_entries_user_id_fkey;

-- Políticas antigas (auth.uid())
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "foods_all_own" on public.foods;
drop policy if exists "composite_meals_all_own" on public.composite_meals;
drop policy if exists "composite_meal_items_select" on public.composite_meal_items;
drop policy if exists "composite_meal_items_insert" on public.composite_meal_items;
drop policy if exists "composite_meal_items_update" on public.composite_meal_items;
drop policy if exists "composite_meal_items_delete" on public.composite_meal_items;
drop policy if exists "carb_entries_all_own" on public.carb_entries;

-- Sem RLS: acesso total com a chave anon (uso familiar num único projeto)
alter table public.profiles disable row level security;
alter table public.foods disable row level security;
alter table public.composite_meals disable row level security;
alter table public.composite_meal_items disable row level security;
alter table public.carb_entries disable row level security;

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

-- Cria o perfil inicial com o MESMO UUID que colocaste em NEXT_PUBLIC_GLIERICA_USER_ID
-- (substitui o UUID abaixo antes de executar, ou executa manualmente depois)
-- insert into public.profiles (id, daily_carb_goal) values ('00000000-0000-4000-8000-000000000001', 200)
--   on conflict (id) do nothing;
