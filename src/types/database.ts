export type Food = {
  id: string;
  user_id: string;
  name: string;
  carbs_per_100g: number;
  is_favorite: boolean;
  /** Marca comercial (opcional). */
  brand: string | null;
  /** Loja ou cadeia, ex. Continente, Mercadona (opcional). */
  retailer: string | null;
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

/**
 * Tabela de equivalentes de HC (suporte clínico à contagem por porção).
 * `portion_kind = 'equivalent'`: porção é "portion_g g de alimento = 10 g HC".
 * `portion_kind = 'unit'`: porção é "1 unidade ~ portion_g g, com portion_carbs_g g HC".
 */
export type EquivFood = {
  id: string;
  category: string;
  name: string;
  portion_g: number;
  portion_carbs_g: number;
  household_measure: string | null;
  portion_kind: "equivalent" | "unit";
  sort_order: number;
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
  /** Contacto opcional para partilha manual / chamada (sem SMS pela app). */
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  /**
   * Fator de sensibilidade: mg/dL que 1 UI de rápida baixa (valor clínico individual).
   */
  isf_drop_mg_dl_per_unit?: number | null;
  /** Alvo de glicemia para correções, mg/dL. */
  correction_target_mg_dl?: number | null;
  /** Zona alvo no gráfico Libre (mg/dL); null = usar alvos do sensor na app. */
  libre_chart_zone_low_mg_dl?: number | null;
  libre_chart_zone_high_mg_dl?: number | null;
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

export type InsulinKind = "rapid" | "basal" | "correction";

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

/** Valores: breakfast | lunch | snack | dinner | supper | other — ver `meal-slots.ts` */
export type MealSlotDb =
  | "breakfast"
  | "lunch"
  | "snack"
  | "dinner"
  | "supper"
  | "other";

export type MealLogItem = {
  id: string;
  meal_log_id: string;
  food_id: string | null;
  composite_meal_id: string | null;
  ingredient_label: string;
  grams: number;
  grams_carbs_line: number;
  sort_order: number;
};

export type MealLog = {
  id: string;
  user_id: string;
  logged_on: string;
  /** Instante do registo (hora); ausente em BD muito antiga — usar created_at. */
  logged_at?: string | null;
  meal_slot: MealSlotDb;
  grams_carbs: number;
  rapid_insulin_units: number | null;
  note: string | null;
  created_at: string;
};

export type GlucoseManualUnit = "mg_dl" | "mmol_l";

export type GlucoseManualSource = "fingerstick" | "lab" | "other";

/** Pontos CGM ingeridos a partir de snapshots LibreLinkUp (valor em mg/dL). */
export type LibreGlucoseReading = {
  id: string;
  user_id: string;
  measured_at: string;
  value_mg_dl: number;
  created_at: string;
};

export type GlucoseManualEntry = {
  id: string;
  user_id: string;
  logged_on: string;
  measured_at: string;
  value: number;
  unit: GlucoseManualUnit;
  source: GlucoseManualSource;
  note: string | null;
  created_at: string;
};

export type GlycemicEventKind = "hypo" | "hyper";

export type GlycemicEvent = {
  id: string;
  user_id: string;
  logged_on: string;
  occurred_at: string;
  kind: GlycemicEventKind;
  glucose_value: number | null;
  glucose_unit: GlucoseManualUnit | null;
  carbs_treatment_g: number | null;
  note: string | null;
  created_at: string;
};

export type ActivityType =
  | "walk"
  | "run"
  | "cycle"
  | "sport"
  | "workout"
  | "other";

export type ActivityIntensity = "light" | "moderate" | "vigorous";

export type ActivityEntry = {
  id: string;
  user_id: string;
  logged_on: string;
  started_at: string;
  duration_minutes: number;
  activity_type: ActivityType;
  intensity: ActivityIntensity | null;
  note: string | null;
  created_at: string;
};
