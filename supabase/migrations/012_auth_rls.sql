-- Autenticação Supabase: FKs para auth.users, RLS por utilizador, perfil automático.
-- Aplica depois de 003 (sem login). Garante que não há user_id órfãos em relação a auth.users.

-- ——— Limpar dados do modo antigo (UUID em .env sem utilizador em auth.users) ———
-- Sem isto, o Postgres recusa as FKs: "Key (id)=(...) is not present in table users".
-- ATENÇÃO: apaga todos os registos cujo user_id não existe em auth.users.
-- Se quiseres migrar esses dados para uma conta real, faz backup/export antes.

do $$
declare
  orphan_count int;
begin
  select count(*) into orphan_count
  from public.profiles p
  where not exists (select 1 from auth.users u where u.id = p.id);

  if orphan_count > 0 then
    raise notice '012_auth_rls: a remover dados de % perfil(is) sem auth.users (modo sem login).', orphan_count;
  end if;
end $$;

delete from public.meal_log_items
where meal_log_id in (
  select id from public.meal_logs
  where user_id not in (select id from auth.users)
);

delete from public.carb_entries
where user_id not in (select id from auth.users);

delete from public.insulin_entries
where user_id not in (select id from auth.users);

delete from public.meal_logs
where user_id not in (select id from auth.users);

delete from public.water_entries
where user_id not in (select id from auth.users);

delete from public.glucose_manual_entries
where user_id not in (select id from auth.users);

delete from public.glycemic_events
where user_id not in (select id from auth.users);

delete from public.activity_entries
where user_id not in (select id from auth.users);

delete from public.composite_meal_items
where composite_meal_id in (
  select id from public.composite_meals
  where user_id not in (select id from auth.users)
);

delete from public.composite_meals
where user_id not in (select id from auth.users);

delete from public.foods
where user_id not in (select id from auth.users);

delete from public.profiles
where id not in (select id from auth.users);

-- ——— Foreign keys (idempotente) ———
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.foods
    ADD CONSTRAINT foods_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.composite_meals
    ADD CONSTRAINT composite_meals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.carb_entries
    ADD CONSTRAINT carb_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.water_entries
    ADD CONSTRAINT water_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.insulin_entries
    ADD CONSTRAINT insulin_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.meal_logs
    ADD CONSTRAINT meal_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.glucose_manual_entries
    ADD CONSTRAINT glucose_manual_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.glycemic_events
    ADD CONSTRAINT glycemic_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.activity_entries
    ADD CONSTRAINT activity_entries_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ——— Perfil ao criar utilizador em auth.users ———
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ——— RLS: tabelas base (recriar políticas) ———
alter table public.profiles enable row level security;
alter table public.foods enable row level security;
alter table public.composite_meals enable row level security;
alter table public.composite_meal_items enable row level security;
alter table public.carb_entries enable row level security;

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

-- ——— Água, insulina, refeições, contexto clínico ———
alter table public.water_entries enable row level security;
alter table public.insulin_entries enable row level security;
alter table public.meal_logs enable row level security;
alter table public.meal_log_items enable row level security;
alter table public.glucose_manual_entries enable row level security;
alter table public.glycemic_events enable row level security;
alter table public.activity_entries enable row level security;

drop policy if exists "water_entries_all_own" on public.water_entries;
drop policy if exists "insulin_entries_all_own" on public.insulin_entries;
drop policy if exists "meal_logs_all_own" on public.meal_logs;
drop policy if exists "meal_log_items_all_own" on public.meal_log_items;
drop policy if exists "glucose_manual_entries_all_own" on public.glucose_manual_entries;
drop policy if exists "glycemic_events_all_own" on public.glycemic_events;
drop policy if exists "activity_entries_all_own" on public.activity_entries;

create policy "water_entries_all_own"
  on public.water_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "insulin_entries_all_own"
  on public.insulin_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meal_logs_all_own"
  on public.meal_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "meal_log_items_all_own"
  on public.meal_log_items for all
  using (
    exists (
      select 1 from public.meal_logs m
      where m.id = meal_log_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meal_logs m
      where m.id = meal_log_id and m.user_id = auth.uid()
    )
  );

create policy "glucose_manual_entries_all_own"
  on public.glucose_manual_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "glycemic_events_all_own"
  on public.glycemic_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "activity_entries_all_own"
  on public.activity_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ——— TCA: só leitura para sessões autenticadas (import com service_role) ———
alter table public.tca_foods enable row level security;

drop policy if exists "tca_foods_select_authenticated" on public.tca_foods;

create policy "tca_foods_select_authenticated"
  on public.tca_foods for select
  to authenticated
  using (true);

revoke all on public.tca_foods from anon;
revoke insert, update, delete on public.tca_foods from authenticated;
grant select on public.tca_foods to authenticated;

-- ——— RPCs de refeição: só utilizadores autenticados (não anon) ———
revoke execute on function public.create_meal_log_with_entries(
  uuid, date, text, numeric, numeric, text, timestamptz
) from anon;

revoke execute on function public.create_meal_log_from_items(
  uuid, date, text, jsonb, numeric, numeric, text, timestamptz
) from anon;

revoke execute on function public.update_meal_log_bundle(
  uuid, uuid, date, timestamptz, text, jsonb, numeric, numeric, text
) from anon;

grant execute on function public.create_meal_log_with_entries(
  uuid, date, text, numeric, numeric, text, timestamptz
) to authenticated;

grant execute on function public.create_meal_log_from_items(
  uuid, date, text, jsonb, numeric, numeric, text, timestamptz
) to authenticated;

grant execute on function public.update_meal_log_bundle(
  uuid, uuid, date, timestamptz, text, jsonb, numeric, numeric, text
) to authenticated;
