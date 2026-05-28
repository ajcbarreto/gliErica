"use server";

import { requireServerUserId } from "@/lib/auth/server-user";
import { createClient } from "@/lib/supabase/server";
import {
  buildDailySeries,
  impliedValues,
  mean,
  median,
  percentile,
  type DailyInsulinCarbPoint,
} from "@/lib/analysis/icr-stats";
import { getRecentDateKeys, minDateKeyInKeys } from "@/lib/date-range";
import { MEAL_SLOTS, mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";

export type SlotIcrStat = {
  slot: MealSlot;
  label: string;
  sampleCount: number;
  medianImpliedG: number | null;
  p25: number | null;
  p75: number | null;
  /** Diferença % vs regra do utilizador (se existir). */
  diffPctVsRule: number | null;
};

export type IcrAnalysisPayload = {
  series: DailyInsulinCarbPoint[];
  profileGramsPerUnit: number | null;
  stats: {
    daysWithCarbs: number;
    daysWithRapid: number;
    daysWithBoth: number;
    medianImplied: number | null;
    meanImplied: number | null;
    p25: number | null;
    p75: number | null;
  };
  /** Análise por momento do dia, baseada em refeições estruturadas. */
  perSlot: SlotIcrStat[];
};

export async function getInsulinCarbAnalysis(
  lastDays: 14 | 30 | 42 | 90 = 42
): Promise<
  | { ok: true; data: IcrAnalysisPayload }
  | { ok: false; error: string }
> {
  let appUserId: string;
  try {
    appUserId = await requireServerUserId();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sessão inválida.";
    return { ok: false, error: msg };
  }

  const supabase = await createClient();
  const keys = getRecentDateKeys(lastDays);
  const minKey = minDateKeyInKeys(keys);

  const [
    { data: profile, error: pErr },
    { data: carbRows, error: cErr },
    { data: insulinRows, error: iErr },
    { data: mealRows, error: mErr },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("insulin_carb_grams_per_unit")
      .eq("id", appUserId)
      .maybeSingle(),
    supabase
      .from("carb_entries")
      .select("logged_on, grams_carbs")
      .eq("user_id", appUserId)
      .gte("logged_on", minKey),
    supabase
      .from("insulin_entries")
      .select("logged_on, units, kind")
      .eq("user_id", appUserId)
      .eq("kind", "rapid")
      .gte("logged_on", minKey),
    supabase
      .from("meal_logs")
      .select("logged_on, meal_slot, grams_carbs, rapid_insulin_units")
      .eq("user_id", appUserId)
      .gte("logged_on", minKey),
  ]);

  if (pErr) return { ok: false, error: pErr.message };
  if (cErr) {
    if (cErr.message.includes("carb_entries")) {
      return { ok: false, error: "Tabela carb_entries inacessível." };
    }
    return { ok: false, error: cErr.message };
  }
  if (iErr) {
    if (iErr.message.includes("insulin_entries")) {
      return {
        ok: false,
        error:
          "Tabela insulin_entries inacessível. Corre as migrações 005_insulin e 008_clinical_context no Supabase.",
      };
    }
    return { ok: false, error: iErr.message };
  }
  if (mErr) return { ok: false, error: mErr.message };

  const keySet = new Set(keys);
  const carbsByDay = new Map<string, number>();
  const rapidByDay = new Map<string, number>();

  for (const row of carbRows ?? []) {
    const day = row.logged_on as string;
    if (!keySet.has(day)) continue;
    const g = Number(row.grams_carbs);
    carbsByDay.set(day, (carbsByDay.get(day) ?? 0) + g);
  }

  for (const row of insulinRows ?? []) {
    const day = row.logged_on as string;
    if (!keySet.has(day)) continue;
    const u = Number(row.units);
    rapidByDay.set(day, (rapidByDay.get(day) ?? 0) + u);
  }

  const series = buildDailySeries(keys, carbsByDay, rapidByDay);
  const implied = impliedValues(series);
  const sorted = [...implied].sort((a, b) => a - b);

  const g = profile?.insulin_carb_grams_per_unit;
  const profileGramsPerUnit =
    typeof g === "number" && g > 0 ? g : null;

  // Análise por slot — uma estimativa de g/UI por refeição que tenha ambos > 0
  const impliedBySlot: Map<MealSlot, number[]> = new Map();
  for (const row of mealRows ?? []) {
    const day = row.logged_on as string;
    if (!keySet.has(day)) continue;
    const carbs = Number(row.grams_carbs);
    const rapid =
      row.rapid_insulin_units != null
        ? Number(row.rapid_insulin_units)
        : null;
    if (!(carbs > 0) || !(rapid !== null && rapid > 0)) continue;
    const slot = row.meal_slot as MealSlot;
    const ratio = Math.round((carbs / rapid) * 10) / 10;
    const list = impliedBySlot.get(slot) ?? [];
    list.push(ratio);
    impliedBySlot.set(slot, list);
  }

  const perSlot: SlotIcrStat[] = MEAL_SLOTS.map((slot) => {
    const values = (impliedBySlot.get(slot) ?? []).slice().sort((a, b) => a - b);
    const med = median(values);
    const diffPctVsRule =
      med !== null && profileGramsPerUnit !== null
        ? Math.round(((med - profileGramsPerUnit) / profileGramsPerUnit) * 1000) / 10
        : null;
    return {
      slot,
      label: mealSlotLabelPt(slot),
      sampleCount: values.length,
      medianImpliedG: med,
      p25: percentile(values, 25),
      p75: percentile(values, 75),
      diffPctVsRule,
    };
  })
    .filter((s) => s.sampleCount > 0)
    .sort((a, b) => b.sampleCount - a.sampleCount);

  return {
    ok: true,
    data: {
      series,
      profileGramsPerUnit,
      stats: {
        daysWithCarbs: series.filter((d) => d.carbsG > 0).length,
        daysWithRapid: series.filter((d) => d.rapidUnits > 0).length,
        daysWithBoth: series.filter(
          (d) => d.carbsG > 0 && d.rapidUnits > 0
        ).length,
        medianImplied: median(implied),
        meanImplied: mean(implied),
        p25: percentile(sorted, 25),
        p75: percentile(sorted, 75),
      },
      perSlot,
    },
  };
}
