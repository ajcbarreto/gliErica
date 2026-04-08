export type Food = {
  id: string;
  user_id: string;
  name: string;
  carbs_per_100g: number;
  is_favorite: boolean;
  created_at: string;
};

/** Referência TCA (INSA), tabela `tca_foods`. */
export type TcaFood = {
  cod: string;
  name: string;
  carbs_per_100g: number;
  foodex_level1: string | null;
  foodex_level2: string | null;
  foodex_level3: string | null;
  tca_version: string;
};

export type CompositeMeal = {
  id: string;
  user_id: string;
  name: string;
  is_favorite: boolean;
  created_at: string;
};

export type CompositeMealItem = {
  id: string;
  composite_meal_id: string;
  food_id: string;
  grams: number;
};

export type Profile = {
  id: string;
  daily_carb_goal: number;
  daily_water_goal_ml?: number;
  /** Gramas de HC que 1 UI rápida cobre (regra médica individual). */
  insulin_carb_grams_per_unit?: number | null;
};

export type WaterEntry = {
  id: string;
  user_id: string;
  logged_on: string;
  ml: number;
  created_at: string;
};

export type CarbEntry = {
  id: string;
  user_id: string;
  logged_on: string;
  grams_carbs: number;
  food_id: string | null;
  composite_meal_id: string | null;
  note: string | null;
  meal_log_id?: string | null;
};

export type InsulinKind = "rapid" | "basal";

export type InsulinEntry = {
  id: string;
  user_id: string;
  logged_on: string;
  units: number;
  kind: InsulinKind;
  note: string | null;
  created_at: string;
  meal_log_id?: string | null;
};

/** Valores: breakfast | lunch | snack | dinner | other — ver `meal-slots.ts` */
export type MealSlotDb =
  | "breakfast"
  | "lunch"
  | "snack"
  | "dinner"
  | "other";

export type MealLog = {
  id: string;
  user_id: string;
  logged_on: string;
  meal_slot: MealSlotDb;
  grams_carbs: number;
  rapid_insulin_units: number | null;
  note: string | null;
  created_at: string;
};
