"use server";

import { requireServerUserId } from "@/lib/auth/server-user";
import { createClient } from "@/lib/supabase/server";
import {
  analyzeMealOutcome,
  DEFAULT_OUTCOME_THRESHOLDS,
  type GlucosePoint,
  type MealOutcomeAnalysis,
  type MealOutcomeKind,
} from "@/lib/analysis/meal-outcome";

const PRE_BUFFER_MIN = 30;
const POST_BUFFER_MIN = DEFAULT_OUTCOME_THRESHOLDS.hypoWindowMin;

function mealInstantMs(row: {
  logged_at: string | null;
  created_at: string;
}): number {
  const src = row.logged_at ?? row.created_at;
  return new Date(src).getTime();
}

type GlucoseRow = { measured_at: string; value_mg_dl: number };

function pointsInWindow(
  rows: GlucoseRow[],
  fromMs: number,
  toMs: number
): GlucosePoint[] {
  const out: GlucosePoint[] = [];
  for (const r of rows) {
    const t = new Date(r.measured_at).getTime();
    if (Number.isNaN(t)) continue;
    if (t < fromMs || t > toMs) continue;
    out.push({ atMs: t, mgDl: Number(r.value_mg_dl) });
  }
  return out;
}

export type MealResultPayload = {
  mealLogId: string;
  mealAtMs: number;
  gramsCarbs: number;
  rapidInsulinUnits: number | null;
  /** g HC por UI desta refeição (se ambos > 0). */
  impliedGramsPerUnit: number | null;
  /** Regra do utilizador (Definições), referência. */
  profileGramsPerUnit: number | null;
  outcome: MealOutcomeAnalysis;
  /** Pontos CGM (mg/dL) para o gráfico [T-30, T+returnByMin]. */
  miniSeries: GlucosePoint[];
  targetLowMgDl: number;
  targetHighMgDl: number;
};

export type MealResultActionResult =
  | { ok: true; data: MealResultPayload }
  | { ok: false; error: string };

/**
 * Analisa uma refeição: baseline, pico, Δ, tempo em alvo, hipo, ICR implícito.
 * Usa `libre_glucose_readings` (mg/dL) — funciona também para refeições antigas.
 */
export async function getMealResultAnalysis(
  mealLogId: string
): Promise<MealResultActionResult> {
  let appUserId: string;
  try {
    appUserId = await requireServerUserId();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sessão inválida.";
    return { ok: false, error: msg };
  }

  const supabase = await createClient();

  const { data: mealRow, error: mealErr } = await supabase
    .from("meal_logs")
    .select("id, logged_at, created_at, grams_carbs, rapid_insulin_units")
    .eq("id", mealLogId)
    .eq("user_id", appUserId)
    .maybeSingle();

  if (mealErr) return { ok: false, error: mealErr.message };
  if (!mealRow) return { ok: false, error: "Refeição não encontrada." };

  const mealAtMs = mealInstantMs(mealRow);
  const fromMs = mealAtMs - PRE_BUFFER_MIN * 60 * 1000;
  const toMs = mealAtMs + POST_BUFFER_MIN * 60 * 1000;

  const { data: readingRows, error: rErr } = await supabase
    .from("libre_glucose_readings")
    .select("measured_at, value_mg_dl")
    .eq("user_id", appUserId)
    .gte("measured_at", new Date(fromMs).toISOString())
    .lte("measured_at", new Date(toMs).toISOString())
    .order("measured_at", { ascending: true })
    .limit(2000);

  if (rErr) return { ok: false, error: rErr.message };

  const allPoints = pointsInWindow(
    (readingRows ?? []) as GlucoseRow[],
    fromMs,
    toMs
  );
  const analysisPoints = allPoints.filter((p) => p.atMs >= mealAtMs - 5 * 60 * 1000);
  const outcome = analyzeMealOutcome(mealAtMs, analysisPoints);

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("insulin_carb_grams_per_unit, libre_chart_zone_low_mg_dl, libre_chart_zone_high_mg_dl")
    .eq("id", appUserId)
    .maybeSingle();

  const profileGramsPerUnit =
    typeof profileRow?.insulin_carb_grams_per_unit === "number" &&
    profileRow.insulin_carb_grams_per_unit > 0
      ? profileRow.insulin_carb_grams_per_unit
      : null;

  const gramsCarbs = Number(mealRow.grams_carbs);
  const rapid =
    mealRow.rapid_insulin_units != null
      ? Number(mealRow.rapid_insulin_units)
      : null;
  const impliedGramsPerUnit =
    rapid !== null && rapid > 0 && gramsCarbs > 0
      ? Math.round((gramsCarbs / rapid) * 10) / 10
      : null;

  const targetLowMgDl =
    typeof profileRow?.libre_chart_zone_low_mg_dl === "number"
      ? profileRow.libre_chart_zone_low_mg_dl
      : DEFAULT_OUTCOME_THRESHOLDS.hypoMgDl;
  const targetHighMgDl =
    typeof profileRow?.libre_chart_zone_high_mg_dl === "number"
      ? profileRow.libre_chart_zone_high_mg_dl
      : DEFAULT_OUTCOME_THRESHOLDS.targetHighMgDl;

  return {
    ok: true,
    data: {
      mealLogId,
      mealAtMs,
      gramsCarbs,
      rapidInsulinUnits: rapid,
      impliedGramsPerUnit,
      profileGramsPerUnit,
      outcome,
      miniSeries: allPoints,
      targetLowMgDl,
      targetHighMgDl,
    },
  };
}

export type MealOutcomeBatchEntry = {
  mealLogId: string;
  kind: MealOutcomeKind;
  deltaPeakMgDl: number | null;
};

export type MealOutcomeBatchResult =
  | { ok: true; outcomes: Record<string, MealOutcomeBatchEntry> }
  | { ok: false; error: string };

/**
 * Calcula o tipo de outcome (badge) para vários `meal_log` em lote.
 * Faz UMA query a `libre_glucose_readings` cobrindo o min/max das refeições.
 */
export async function getMealOutcomes(
  mealLogIds: string[]
): Promise<MealOutcomeBatchResult> {
  if (mealLogIds.length === 0) {
    return { ok: true, outcomes: {} };
  }

  let appUserId: string;
  try {
    appUserId = await requireServerUserId();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sessão inválida.";
    return { ok: false, error: msg };
  }

  const supabase = await createClient();

  const safeIds = mealLogIds.slice(0, 60);

  const { data: mealRows, error: mealErr } = await supabase
    .from("meal_logs")
    .select("id, logged_at, created_at")
    .in("id", safeIds)
    .eq("user_id", appUserId);

  if (mealErr) return { ok: false, error: mealErr.message };

  const meals = (mealRows ?? []) as {
    id: string;
    logged_at: string | null;
    created_at: string;
  }[];

  if (meals.length === 0) return { ok: true, outcomes: {} };

  const instants = meals.map((m) => mealInstantMs(m));
  const fromMs = Math.min(...instants) - PRE_BUFFER_MIN * 60 * 1000;
  const toMs = Math.max(...instants) + POST_BUFFER_MIN * 60 * 1000;

  const { data: readingRows, error: rErr } = await supabase
    .from("libre_glucose_readings")
    .select("measured_at, value_mg_dl")
    .eq("user_id", appUserId)
    .gte("measured_at", new Date(fromMs).toISOString())
    .lte("measured_at", new Date(toMs).toISOString())
    .order("measured_at", { ascending: true })
    .limit(20_000);

  if (rErr) return { ok: false, error: rErr.message };

  const rows = (readingRows ?? []) as GlucoseRow[];

  const outcomes: Record<string, MealOutcomeBatchEntry> = {};
  for (const m of meals) {
    const at = mealInstantMs(m);
    const winFrom = at - PRE_BUFFER_MIN * 60 * 1000;
    const winTo = at + POST_BUFFER_MIN * 60 * 1000;
    const pts = pointsInWindow(rows, winFrom, winTo);
    const analysis = analyzeMealOutcome(at, pts);
    outcomes[m.id] = {
      mealLogId: m.id,
      kind: analysis.kind,
      deltaPeakMgDl: analysis.deltaPeakMgDl,
    };
  }

  return { ok: true, outcomes };
}
