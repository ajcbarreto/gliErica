"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { tryAppUserId } from "@/lib/app-user";
import { getLocalDateKey } from "@/lib/date";
import { CarbRing } from "@/components/CarbRing";
import { QuickLogModal } from "@/components/QuickLogModal";
import { Zap } from "lucide-react";

export function DashboardCarbSection() {
  const supabase = createClient();
  const [goal, setGoal] = useState(200);
  const [consumed, setConsumed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [quickOpen, setQuickOpen] = useState(false);

  const refresh = useCallback(async () => {
    const userId = tryAppUserId();
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
  }, [supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <div className="rounded-2xl border border-white/5 bg-surface p-5 shadow-card">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between sm:gap-6">
          {loading ? (
            <div
              className="flex h-[168px] w-[168px] items-center justify-center rounded-full bg-white/[0.03] text-sm text-zinc-500"
              aria-busy
            >
              A carregar…
            </div>
          ) : (
            <CarbRing consumed={consumed} goal={goal} />
          )}
          <div className="flex w-full max-w-[220px] flex-col gap-3 sm:items-stretch">
            <p className="text-center text-sm text-zinc-400 sm:text-left">
              Hidratos consumidos hoje face à tua meta diária.
            </p>
            <button
              type="button"
              onClick={() => setQuickOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition active:scale-[0.98] active:opacity-90"
            >
              <Zap className="h-4 w-4" aria-hidden />
              Registo rápido
            </button>
          </div>
        </div>
      </div>

      <QuickLogModal
        open={quickOpen}
        onClose={() => setQuickOpen(false)}
        onLogged={() => void refresh()}
      />
    </>
  );
}
