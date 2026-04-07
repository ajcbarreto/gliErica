export type Food = {
  id: string;
  user_id: string;
  name: string;
  carbs_per_100g: number;
  is_favorite: boolean;
  created_at: string;
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
};
