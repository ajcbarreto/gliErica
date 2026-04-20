"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getLocalDateKey } from "@/lib/date";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import { MealHistoryList } from "@/components/MealHistoryList";
import type { MealLog } from "@/types/database";

const PREVIEW_LIMIT = 6;

export function DashboardTodayMealsSection() {
  const supabase = createClient();
  const { userId, loading: authLoading } = useAuthUser();
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);

  const day = getLocalDateKey();

  const refresh = useCallback(async () => {
    if (!userId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("logged_on", day)
      .order("logged_at", { ascending: false })
      .order("created_at", { ascending: false });

    setLoading(false);
    if (error) {
      setLogs([]);
      return;
    }
    setLogs((data ?? []) as MealLog[]);
  }, [supabase, userId, day]);

  usePullToRefresh(refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (authLoading) {
    return null;
  }

  if (!userId) {
    return null;
  }

  const total = logs.length;

  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Refeições de hoje
          </p>
          {!loading && total > 0 ? (
            <p className="text-[11px] text-zinc-500">
              {total === 1 ? "1 registo" : `${total} registos`}
            </p>
          ) : null}
        </div>
        <Link
          href="/refeicoes/historico"
          className="shrink-0 text-xs font-medium text-accent transition hover:underline"
        >
          Ver tudo
        </Link>
      </div>

      <MealHistoryList
        logs={logs}
        loading={loading}
        onEdit={() => {}}
        onDelete={() => {}}
        deletingId={null}
        limit={PREVIEW_LIMIT}
        density="compact"
        hideActions
        omitDayHeaders
      />

    </section>
  );
}
