"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useMealLogs } from "@/hooks/useMealLogs";
import { MealHistoryList } from "@/components/MealHistoryList";
import type { MealLog } from "@/types/database";
import { getMealOutcomes } from "@/app/actions/meal-outcome";
import type { MealOutcomeKind } from "@/lib/analysis/meal-outcome";

export function MealHistoryPageClient() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { userId, loading: authLoading } = useAuthUser();
  const { logs, loading, reload } = useMealLogs(userId);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<
    Record<string, { kind: MealOutcomeKind }>
  >({});

  useEffect(() => {
    if (loading) return;
    if (logs.length === 0) {
      setOutcomes({});
      return;
    }
    const ids = logs.slice(0, 40).map((l) => l.id);
    let alive = true;
    void (async () => {
      const res = await getMealOutcomes(ids);
      if (!alive || !res.ok) return;
      const map: Record<string, { kind: MealOutcomeKind }> = {};
      for (const id of Object.keys(res.outcomes)) {
        map[id] = { kind: res.outcomes[id]!.kind };
      }
      setOutcomes(map);
    })();
    return () => {
      alive = false;
    };
  }, [logs, loading]);

  async function removeLog(id: string) {
    if (!userId) return;
    setDeletingId(id);
    const { error } = await supabase
      .from("meal_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    setDeletingId(null);
    if (!error) void reload();
  }

  function goEdit(row: MealLog) {
    router.push(`/refeicoes/registos?edit=${row.id}`);
  }

  if (authLoading) {
    return <p className="text-sm text-zinc-500">A carregar sessão…</p>;
  }

  if (!userId) {
    return (
      <p className="text-sm text-zinc-600">
        Inicia sessão para veres o histórico de refeições.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <p className="text-xs text-zinc-500">
        Toca num registo para ver ingredientes e linhas. Apagar remove também o
        HC e a insulina ligados. Editar abre o formulário de registo.
      </p>
      <MealHistoryList
        logs={logs}
        loading={loading}
        onEdit={goEdit}
        onDelete={(id) => void removeLog(id)}
        deletingId={deletingId}
        density="comfortable"
        outcomes={outcomes}
      />
    </div>
  );
}
