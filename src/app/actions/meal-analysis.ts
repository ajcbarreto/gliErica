"use server";

import { requireServerUserId } from "@/lib/auth/server-user";
import { createClient } from "@/lib/supabase/server";
import { getLibreGlucoseSnapshot } from "@/lib/libre/snapshot";
import type { GlucoseDisplayUnit, LibreGlucoseSnapshot } from "@/lib/libre/types";
import {
  RAPID_RISE_THRESHOLD_MG_DL_PER_MIN,
  slopeToMgDlPerMinute,
} from "@/lib/analysis/glucose-units";
import {
  analyzeGlucoseAfterMeal,
  slopeLastIntervalNativePerMin,
  toSortedSeries,
} from "@/lib/analysis/meal-glucose";
import { glucoseToMgDl } from "@/lib/glucose-bands";

/** Janela pós-refeição para o “score” de impacto (alinhado ao plano v2). */
const MEAL_IMPACT_WINDOW_MIN = 120;
/** Pico médio acima do qual sugerimos rever o rácio (mg/dL), se houver regra guardada. */
const RATIO_HINT_AVG_DELTA_MG_DL = 45;

type FoodJoin = { id: string; name: string; is_favorite: boolean } | null;
type CompJoin = { id: string; name: string; is_favorite: boolean } | null;

type EntryRow = {
  id: string;
  created_at: string;
  food_id: string | null;
  composite_meal_id: string | null;
  grams_carbs: number;
  foods: FoodJoin;
  composite_meals: CompJoin;
};

export type FavoriteImpactRow = {
  key: string;
  label: string;
  sampleCount: number;
  avgDelta: number;
  unit: GlucoseDisplayUnit;
  /** Texto opcional sobre rácio HC/UI (referência, não prescrição). */
  ratioHint?: string | null;
};

/**
 * Cruza registos de refeições favoritas (alimento ou composta) com a curva Libre
 * nas últimas ~48 h e calcula subida média de pico nas primeiras 2 h (deltaPeak).
 */
export async function getFavoriteMealImpactScores(): Promise<
  | { ok: true; unit: GlucoseDisplayUnit; items: FavoriteImpactRow[] }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  let appUserId: string;
  try {
    appUserId = await requireServerUserId();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sessão inválida.";
    return { ok: false, error: msg };
  }

  let snapshot: LibreGlucoseSnapshot;
  try {
    ({ snapshot } = await getLibreGlucoseSnapshot());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "LibreLinkUp indisponível.";
    return { ok: false, error: msg };
  }

  const series = toSortedSeries(snapshot.chart24h);
  if (series.length < 2) {
    return { ok: true, unit: snapshot.glucoseUnit, items: [] };
  }

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

  const { data: rawRows, error } = await supabase
    .from("carb_entries")
    .select(
      `
      id,
      created_at,
      food_id,
      composite_meal_id,
      grams_carbs,
      foods ( id, name, is_favorite ),
      composite_meals ( id, name, is_favorite )
    `
    )
    .eq("user_id", appUserId)
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  if (error) {
    return { ok: false, error: error.message };
  }

  const rows = (rawRows ?? []) as unknown as EntryRow[];
  const firstT = series[0].t;
  const lastT = series[series.length - 1].t;

  const buckets = new Map<string, { label: string; deltas: number[] }>();

  for (const row of rows) {
    const food = row.foods;
    const comp = row.composite_meals;

    const favFood =
      row.food_id && food && food.is_favorite === true ? food : null;
    const favComp =
      row.composite_meal_id && comp && comp.is_favorite === true
        ? comp
        : null;

    if (!favFood && !favComp) continue;

    const mealAtMs = new Date(row.created_at).getTime();
    if (mealAtMs < firstT || mealAtMs > lastT) continue;

    const analysis = analyzeGlucoseAfterMeal(
      mealAtMs,
      series,
      MEAL_IMPACT_WINDOW_MIN
    );
    if (!analysis?.hasWindowPoints) continue;

    const key = favFood
      ? `food:${favFood.id}`
      : `composite:${favComp!.id}`;
    const label = favFood ? favFood.name : favComp!.name;

    const acc = buckets.get(key) ?? { label, deltas: [] };
    acc.deltas.push(analysis.deltaPeak);
    buckets.set(key, acc);
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("insulin_carb_grams_per_unit")
    .eq("id", appUserId)
    .maybeSingle();
  const ruleGramsPerUi = profileRow?.insulin_carb_grams_per_unit;

  const items: FavoriteImpactRow[] = Array.from(buckets.entries()).map(
    ([key, v]) => {
      const avgDelta =
        Math.round(
          (v.deltas.reduce((a, b) => a + b, 0) / v.deltas.length) * 10
        ) / 10;
      const avgMgDl = glucoseToMgDl(avgDelta, snapshot.glucoseUnit);
      let ratioHint: string | null = null;
      if (
        typeof ruleGramsPerUi === "number" &&
        ruleGramsPerUi > 0 &&
        v.deltas.length >= 2 &&
        avgMgDl >= RATIO_HINT_AVG_DELTA_MG_DL
      ) {
        ratioHint = `Com picos médios elevados após esta refeição favorita, pode ser útil rever com a equipa se a regra orientativa de ~${ruleGramsPerUi} g de HC por 1 UI continua adequada. Informação de referência — não substitui acompanhamento médico.`;
      }
      return {
        key,
        label: v.label,
        sampleCount: v.deltas.length,
        avgDelta,
        unit: snapshot.glucoseUnit,
        ratioHint,
      };
    }
  );

  items.sort((a, b) => b.sampleCount - a.sampleCount);

  return { ok: true, unit: snapshot.glucoseUnit, items };
}

export type PostMealRisePayload = {
  alert: boolean;
  slopeMgDlPerMin: number | null;
  slopeNativePerMin: number | null;
  unit: GlucoseDisplayUnit;
  message: string;
  lastMealAt: string | null;
  entryId: string | null;
  /** Preenchido no cliente quando se usa aviso in-app em vez de Notification. */
  simulated?: boolean;
};

const POST_MEAL_MAX_AGE_MS = 3 * 60 * 60 * 1000;

/**
 * Após uma refeição recente, estima a subida entre os dois últimos pontos CGM
 * e compara com 2 mg/dL/min (equivalente se a unidade for mmol/L).
 */
export async function evaluatePostMealRapidRise(): Promise<PostMealRisePayload> {
  const none = (message: string): PostMealRisePayload => ({
    alert: false,
    slopeMgDlPerMin: null,
    slopeNativePerMin: null,
    unit: "mg/dL",
    message,
    lastMealAt: null,
    entryId: null,
  });

  const supabase = await createClient();
  let appUserId: string;
  try {
    appUserId = await requireServerUserId();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sessão inválida.";
    return none(msg);
  }

  let snapshot: LibreGlucoseSnapshot;
  try {
    ({ snapshot } = await getLibreGlucoseSnapshot());
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Libre indisponível.";
    return none(msg);
  }

  const series = toSortedSeries(snapshot.chart24h);
  if (series.length < 2) {
    return none("Curva Libre insuficiente para calcular inclinação.");
  }

  const { data: entries } = await supabase
    .from("carb_entries")
    .select("id, created_at, grams_carbs")
    .eq("user_id", appUserId)
    .gt("grams_carbs", 0)
    .order("created_at", { ascending: false })
    .limit(8);

  const now = Date.now();
  const recent = (entries ?? []).find((e) => {
    const t = new Date(e.created_at as string).getTime();
    return now - t <= POST_MEAL_MAX_AGE_MS;
  });

  if (!recent) {
    return none("Nenhuma refeição com HC nas últimas 3 h.");
  }

  const mealMs = new Date(recent.created_at as string).getTime();
  const slopeNative = slopeLastIntervalNativePerMin(series, mealMs);

  if (slopeNative === null || slopeNative <= 0) {
    return {
      alert: false,
      slopeMgDlPerMin: null,
      slopeNativePerMin: slopeNative,
      unit: snapshot.glucoseUnit,
      message: "Sem subida recente entre leituras CGM.",
      lastMealAt: recent.created_at as string,
      entryId: recent.id as string,
    };
  }

  const slopeMgDlPerMin = slopeToMgDlPerMinute(
    slopeNative,
    snapshot.glucoseUnit
  );
  const alert = slopeMgDlPerMin > RAPID_RISE_THRESHOLD_MG_DL_PER_MIN;

  const message = alert
    ? `Subida rápida após refeição: ~${slopeMgDlPerMin.toFixed(1)} mg/dL/min (último intervalo CGM).`
    : `Inclinação atual ~${slopeMgDlPerMin.toFixed(1)} mg/dL/min (abaixo do limiar de alerta).`;

  return {
    alert,
    slopeMgDlPerMin,
    slopeNativePerMin: slopeNative,
    unit: snapshot.glucoseUnit,
    message,
    lastMealAt: recent.created_at as string,
    entryId: recent.id as string,
  };
}
