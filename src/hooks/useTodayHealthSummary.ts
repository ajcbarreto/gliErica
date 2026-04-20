"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLocalDateKey } from "@/lib/date";
import type { InsulinKind } from "@/types/database";

export type TodayHealthSummary = {
  waterTotalMl: number;
  waterGoalMl: number;
  mealRapid: number;
  correction: number;
  basal: number;
};

export function useTodayHealthSummary(userId: string | null) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TodayHealthSummary | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData(null);
      setLoading(false);
      return;
    }

    const day = getLocalDateKey();

    const [
      { data: profile },
      { data: waterRows },
      { data: insulinRows },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("daily_water_goal_ml")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("water_entries")
        .select("ml")
        .eq("user_id", userId)
        .eq("logged_on", day),
      supabase
        .from("insulin_entries")
        .select("units, kind")
        .eq("user_id", userId)
        .eq("logged_on", day),
    ]);

    const g = profile?.daily_water_goal_ml;
    const waterGoalMl =
      typeof g === "number" && g > 0 ? g : 2000;

    const waterTotalMl = Math.round(
      (waterRows ?? []).reduce((a, r) => a + Number(r.ml), 0)
    );

    let mealRapid = 0;
    let correction = 0;
    let basal = 0;
    for (const row of insulinRows ?? []) {
      const u = Number(row.units);
      const k = row.kind as InsulinKind;
      if (k === "basal") basal += u;
      else if (k === "correction") correction += u;
      else mealRapid += u;
    }

    setData({
      waterTotalMl,
      waterGoalMl,
      mealRapid: Math.round(mealRapid * 10) / 10,
      correction: Math.round(correction * 10) / 10,
      basal: Math.round(basal * 10) / 10,
    });
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { loading, data, refresh };
}
