"use client";

import { useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { DashboardInsulinSection } from "@/components/DashboardInsulinSection";
import { DashboardWaterSection } from "@/components/DashboardWaterSection";
import { useAuthUser } from "@/hooks/useAuthUser";
import { useTodayHealthSummary } from "@/hooks/useTodayHealthSummary";
import { formatLitersFromMl } from "@/lib/water-display";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import { Droplets, Plus, Syringe } from "lucide-react";

export function DashboardQuickLogBar() {
  const { userId, loading: authLoading } = useAuthUser();
  const { loading, data, refresh } = useTodayHealthSummary(userId);
  const [open, setOpen] = useState(false);
  usePullToRefresh(refresh);

  if (authLoading || !userId) {
    return null;
  }

  function sync() {
    void refresh();
  }

  return (
    <>
      <div className="rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            {loading || !data ? (
              <p className="text-[13px] text-zinc-500">A carregar resumo…</p>
            ) : (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug text-zinc-700">
                <span className="inline-flex items-center gap-1">
                  <Droplets
                    className="h-3.5 w-3.5 shrink-0 text-accent"
                    aria-hidden
                  />
                  <span className="tabular-nums font-medium text-zinc-900">
                    {formatLitersFromMl(data.waterTotalMl)} L
                  </span>
                  <span className="text-zinc-500">
                    / {formatLitersFromMl(data.waterGoalMl)} L
                  </span>
                </span>
                <span className="text-zinc-300" aria-hidden>
                  ·
                </span>
                <span
                  className="inline-flex items-center gap-1"
                  title="Rápida + correção + basal (UI)"
                >
                  <Syringe
                    className="h-3.5 w-3.5 shrink-0 text-violet-600"
                    aria-hidden
                  />
                  <span className="tabular-nums text-zinc-800">
                    {data.mealRapid}+{data.correction}+{data.basal} UI
                  </span>
                </span>
              </div>
            )}
            <p className="mt-1 text-[10px] text-zinc-500">
              Regista água ou insulina com o +
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-md shadow-accent/25 transition active:scale-[0.96]"
            aria-label="Registar água ou insulina"
          >
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      </div>

      <Drawer
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) void refresh();
        }}
      >
        <DrawerContent>
          <div className="flex max-h-[min(88vh,640px)] flex-col overflow-hidden px-4 pb-4 pt-0">
            <p className="text-center text-sm font-semibold text-zinc-900">
              Água e insulina
            </p>
            <p className="mt-1 text-center text-[11px] text-zinc-500">
              Em insulina, toca numa linha para corrigir as unidades.
            </p>
            <div className="mt-3 flex flex-1 flex-col gap-4 overflow-y-auto pr-0.5">
              <DashboardInsulinSection embedded onAfterChange={sync} />
              <DashboardWaterSection embedded onAfterChange={sync} />
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
