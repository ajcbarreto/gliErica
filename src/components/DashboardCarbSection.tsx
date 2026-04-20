"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getLocalDateKey } from "@/lib/date";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import { CarbRing } from "@/components/CarbRing";

export function DashboardCarbSection() {
  const supabase = createClient();
  const { userId } = useAuthUser();
  const [goal, setGoal] = useState(200);
  const [consumed, setConsumed] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const day = getLocalDateKey();

    const [{ data: profile }, { data: entries }] = await Promise.all([
      supabase
        .from("profiles")
        .select("daily_carb_goal")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("carb_entries")
        .select("grams_carbs")
        .eq("user_id", userId)
        .eq("logged_on", day),
    ]);

    if (profile?.daily_carb_goal != null) {
      setGoal(Number(profile.daily_carb_goal));
    }

    const sum =
      entries?.reduce((acc, row) => acc + Number(row.grams_carbs), 0) ?? 0;
    setConsumed(Math.round(sum * 10) / 10);
    setLoading(false);
  }, [supabase, userId]);

  usePullToRefresh(refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!userId) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card">
      <div className="flex items-center gap-3">
        {loading ? (
          <div
            className="flex h-[104px] w-[104px] shrink-0 items-center justify-center rounded-full bg-zinc-50 text-xs text-zinc-500"
            aria-busy
          >
            …
          </div>
        ) : (
          <CarbRing consumed={consumed} goal={goal} size={104} stroke={10} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500">Hidratos hoje</p>
          <p className="mt-0.5 text-sm leading-snug text-zinc-600">
            Total face à meta diária — também nas refeições abaixo.
          </p>
        </div>
      </div>
    </div>
  );
}
