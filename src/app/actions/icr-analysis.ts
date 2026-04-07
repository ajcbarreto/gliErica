"use server";

import { createClient } from "@/lib/supabase/server";
import { getAppUserId } from "@/lib/app-user";
import {
  buildDailySeries,
  impliedValues,
  mean,
  median,
  percentile,
  type DailyInsulinCarbPoint,
} from "@/lib/analysis/icr-stats";
import { getRecentDateKeys, minDateKeyInKeys } from "@/lib/date-range";

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
};

export async function getInsulinCarbAnalysis(
  lastDays: 14 | 30 | 42 | 90 = 42
): Promise<
  | { ok: true; data: IcrAnalysisPayload }
  | { ok: false; error: string }
> {
  let appUserId: string;
  try {
    appUserId = getAppUserId();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "UUID da app não configurado.";
    return { ok: false, error: msg };
  }

  const supabase = await createClient();
  const keys = getRecentDateKeys(lastDays);
  const minKey = minDateKeyInKeys(keys);

  const [
    { data: profile, error: pErr },
    { data: carbRows, error: cErr },
    { data: insulinRows, error: iErr },
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
          "Tabela insulin_entries em falta. Corre a migração 005_insulin no Supabase.",
      };
    }
    return { ok: false, error: iErr.message };
  }

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
    },
  };
}
