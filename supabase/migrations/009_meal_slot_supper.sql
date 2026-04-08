-- Slot "Ceia" (chave canónica: supper)

alter table public.meal_logs drop constraint if exists meal_logs_meal_slot_check;

alter table public.meal_logs add constraint meal_logs_meal_slot_check
  check (
    meal_slot in (
      'breakfast',
      'lunch',
      'snack',
      'dinner',
      'supper',
      'other'
    )
  );

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
  if p_meal_slot not in (
    'breakfast',
    'lunch',
    'snack',
    'dinner',
    'supper',
    'other'
  ) then
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
    when 'supper' then 'Ceia'
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
