-- Registos de refeição: momento do dia + HC + insulina rápida opcional.
-- Espelha HC e insulina em carb_entries / insulin_entries (com meal_log_id) para totais e gráficos.

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  logged_on date not null,
  meal_slot text not null
    check (meal_slot in ('breakfast', 'lunch', 'snack', 'dinner', 'other')),
  grams_carbs numeric not null check (grams_carbs >= 0),
  rapid_insulin_units numeric
    check (rapid_insulin_units is null or rapid_insulin_units > 0),
  note text,
  created_at timestamptz not null default now(),
  check (
    grams_carbs > 0
    or rapid_insulin_units is not null
  )
);

create index if not exists meal_logs_user_day_idx
  on public.meal_logs (user_id, logged_on desc, created_at desc);

alter table public.carb_entries
  add column if not exists meal_log_id uuid references public.meal_logs (id) on delete cascade;

create index if not exists carb_entries_meal_log_id_idx
  on public.carb_entries (meal_log_id)
  where meal_log_id is not null;

alter table public.insulin_entries
  add column if not exists meal_log_id uuid references public.meal_logs (id) on delete cascade;

create index if not exists insulin_entries_meal_log_id_idx
  on public.insulin_entries (meal_log_id)
  where meal_log_id is not null;

create or replace function public.create_meal_log_with_entries(
  p_user_id uuid,
  p_logged_on date,
  p_meal_slot text,
  p_grams_carbs numeric,
  p_rapid_insulin_units numeric,
  p_note text
) returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
  v_carb_note text;
  v_slot_label text;
begin
  if p_meal_slot not in ('breakfast', 'lunch', 'snack', 'dinner', 'other') then
    raise exception 'invalid meal_slot';
  end if;

  if p_grams_carbs < 0 then
    raise exception 'invalid grams_carbs';
  end if;

  if p_grams_carbs = 0 and p_rapid_insulin_units is null then
    raise exception 'indica HC ou insulina';
  end if;

  if p_rapid_insulin_units is not null and p_rapid_insulin_units <= 0 then
    raise exception 'invalid insulin units';
  end if;

  insert into public.meal_logs (
    user_id,
    logged_on,
    meal_slot,
    grams_carbs,
    rapid_insulin_units,
    note
  )
  values (
    p_user_id,
    p_logged_on,
    p_meal_slot,
    p_grams_carbs,
    p_rapid_insulin_units,
    nullif(trim(p_note), '')
  )
  returning id into v_id;

  v_slot_label := case p_meal_slot
    when 'breakfast' then 'Pequeno-almoço'
    when 'lunch' then 'Almoço'
    when 'snack' then 'Lanche'
    when 'dinner' then 'Jantar'
    else 'Outro'
  end;

  v_carb_note := v_slot_label
    || case
      when p_note is not null and trim(p_note) <> '' then ' · ' || trim(p_note)
      else ''
    end;

  insert into public.carb_entries (
    user_id,
    logged_on,
    grams_carbs,
    food_id,
    composite_meal_id,
    note,
    meal_log_id
  )
  values (
    p_user_id,
    p_logged_on,
    p_grams_carbs,
    null,
    null,
    v_carb_note,
    v_id
  );

  if p_rapid_insulin_units is not null then
    insert into public.insulin_entries (
      user_id,
      logged_on,
      units,
      kind,
      note,
      meal_log_id
    )
    values (
      p_user_id,
      p_logged_on,
      p_rapid_insulin_units,
      'rapid',
      v_slot_label,
      v_id
    );
  end if;

  return v_id;
end;
$$;

grant execute on function public.create_meal_log_with_entries(
  uuid,
  date,
  text,
  numeric,
  numeric,
  text
) to anon, authenticated, service_role;
