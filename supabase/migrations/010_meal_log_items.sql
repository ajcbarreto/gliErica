-- Detalhe por linha de refeição (snapshot); um único carb_entries agregado por meal_log.

create table if not exists public.meal_log_items (
  id uuid primary key default gen_random_uuid(),
  meal_log_id uuid not null references public.meal_logs (id) on delete cascade,
  food_id uuid references public.foods (id) on delete set null,
  composite_meal_id uuid references public.composite_meals (id) on delete set null,
  ingredient_label text not null,
  grams numeric not null check (grams > 0),
  grams_carbs_line numeric not null check (grams_carbs_line >= 0),
  sort_order int not null default 0
);

create index if not exists meal_log_items_meal_log_id_idx
  on public.meal_log_items (meal_log_id, sort_order);

alter table public.meal_log_items disable row level security;

-- Itens JSON: [{ "food_id": "uuid"|null, "composite_meal_id": "uuid"|null, "ingredient_label": "text", "grams": n, "grams_carbs_line": n }, ...]
-- Com array vazio: equivalente a create_meal_log_with_entries (só totais manuais).
create or replace function public.create_meal_log_from_items(
  p_user_id uuid,
  p_logged_on date,
  p_meal_slot text,
  p_items jsonb,
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
  v_total numeric := 0;
  v_item_count int;
  el jsonb;
  v_sort int := 0;
  v_label text;
  v_food uuid;
  v_comp uuid;
  v_grams numeric;
  v_line_carbs numeric;
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

  if p_rapid_insulin_units is not null and p_rapid_insulin_units <= 0 then
    raise exception 'invalid insulin units';
  end if;

  v_item_count := case
    when p_items is null then 0
    else jsonb_array_length(p_items)
  end;

  if v_item_count = 0 then
    if p_grams_carbs < 0 then
      raise exception 'invalid grams_carbs';
    end if;
    if p_grams_carbs = 0 and p_rapid_insulin_units is null then
      raise exception 'indica HC ou insulina';
    end if;

    return public.create_meal_log_with_entries(
      p_user_id,
      p_logged_on,
      p_meal_slot,
      p_grams_carbs,
      p_rapid_insulin_units,
      p_note
    );
  end if;

  for el in select * from jsonb_array_elements(p_items)
  loop
    v_line_carbs := (el->>'grams_carbs_line')::numeric;
    if v_line_carbs < 0 then
      raise exception 'invalid grams_carbs_line';
    end if;
    v_total := v_total + v_line_carbs;
  end loop;

  if v_total <= 0 and p_rapid_insulin_units is null then
    raise exception 'indica HC ou insulina';
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
    v_total,
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

  for el in select * from jsonb_array_elements(p_items)
  loop
    v_label := nullif(trim(el->>'ingredient_label'), '');
    if v_label is null then
      raise exception 'cada linha precisa de ingredient_label';
    end if;
    v_grams := (el->>'grams')::numeric;
    if v_grams is null or v_grams <= 0 then
      raise exception 'grams inválido numa linha';
    end if;
    v_line_carbs := (el->>'grams_carbs_line')::numeric;
    v_food := null;
    if el ? 'food_id' and el->>'food_id' is not null and el->>'food_id' <> '' then
      v_food := (el->>'food_id')::uuid;
    end if;
    v_comp := null;
    if el ? 'composite_meal_id' and el->>'composite_meal_id' is not null
      and el->>'composite_meal_id' <> ''
    then
      v_comp := (el->>'composite_meal_id')::uuid;
    end if;

    insert into public.meal_log_items (
      meal_log_id,
      food_id,
      composite_meal_id,
      ingredient_label,
      grams,
      grams_carbs_line,
      sort_order
    )
    values (
      v_id,
      v_food,
      v_comp,
      v_label,
      v_grams,
      v_line_carbs,
      v_sort
    );
    v_sort := v_sort + 1;
  end loop;

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
    v_total,
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

grant execute on function public.create_meal_log_from_items(
  uuid,
  date,
  text,
  jsonb,
  numeric,
  numeric,
  text
) to anon, authenticated, service_role;
