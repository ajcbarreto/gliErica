"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getLocalDateKey } from "@/lib/date";
import { formatLitersFromMl } from "@/lib/water-display";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import { Droplets, Undo2 } from "lucide-react";

const QUICK_ML = [200, 250, 500] as const;

export function DashboardWaterSection() {
  const supabase = createClient();
  const { userId, loading: authLoading } = useAuthUser();
  const [goalMl, setGoalMl] = useState(2000);
  const [totalMl, setTotalMl] = useState(0);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [customMl, setCustomMl] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setMsg(null);
    if (!userId) {
      setLoading(false);
      return;
    }

    const day = getLocalDateKey();

    const [{ data: profile }, { data: rows }] = await Promise.all([
      supabase
        .from("profiles")
        .select("daily_water_goal_ml")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("water_entries")
        .select("id, ml, created_at")
        .eq("user_id", userId)
        .eq("logged_on", day)
        .order("created_at", { ascending: false }),
    ]);

    const g = profile?.daily_water_goal_ml;
    if (typeof g === "number" && g > 0) setGoalMl(g);

    const list = rows ?? [];
    const sum = list.reduce((acc, r) => acc + Number(r.ml), 0);
    setTotalMl(Math.round(sum));
    setLastEntryId(list[0]?.id ?? null);
    setLoading(false);
  }, [supabase, userId]);

  usePullToRefresh(refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function addMl(ml: number) {
    if (ml <= 0) return;
    if (!userId) {
      setMsg("Inicia sessão.");
      return;
    }

    setAdding(true);
    setMsg(null);
    const { error } = await supabase.from("water_entries").insert({
      user_id: userId,
      logged_on: getLocalDateKey(),
      ml,
    });
    setAdding(false);

    if (error) {
      setMsg(
        error.message.includes("water_entries")
          ? "Corre a migração SQL 004_water_hydration no Supabase."
          : error.message
      );
      return;
    }
    void refresh();
  }

  async function undoLast() {
    if (!lastEntryId) return;
    setAdding(true);
    setMsg(null);
    const { error } = await supabase
      .from("water_entries")
      .delete()
      .eq("id", lastEntryId);
    setAdding(false);
    if (error) setMsg(error.message);
    else void refresh();
  }

  function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(customMl.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      setMsg("Indica ml válidos (> 0).");
      return;
    }
    setCustomMl("");
    void addMl(Math.round(v));
  }

  if (authLoading) {
    return null;
  }

  if (!userId) {
    return null;
  }

  const pct = goalMl > 0 ? Math.min(100, Math.round((totalMl / goalMl) * 100)) : 0;

  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <Droplets className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500">Hidratação hoje</p>
          {loading ? (
            <p className="mt-1 text-sm text-zinc-500">A carregar…</p>
          ) : (
            <>
              <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-900">
                {formatLitersFromMl(totalMl)} L
                <span className="text-sm font-normal text-zinc-500">
                  {" "}
                  / {formatLitersFromMl(goalMl)} L
                </span>
              </p>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-100"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso da meta de água"
              >
                <div
                  className="h-full rounded-full bg-accent/80 transition-[width] duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                Meta em Definições · toca para registar copos ou garrafas
              </p>
            </>
          )}
        </div>
      </div>

      {!loading && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_ML.map((ml) => (
              <button
                key={ml}
                type="button"
                disabled={adding}
                onClick={() => void addMl(ml)}
                className="rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-xs font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                +{ml} ml
              </button>
            ))}
            <button
              type="button"
              disabled={adding || !lastEntryId}
              onClick={() => void undoLast()}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
              title="Remove o último registo de hoje"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Anular último
            </button>
          </div>
          <form
            onSubmit={(e) => void submitCustom(e)}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="water-custom-ml"
                className="mb-1 block text-[11px] font-medium text-zinc-500"
              >
                Outro valor (ml)
              </label>
              <input
                id="water-custom-ml"
                inputMode="decimal"
                placeholder="ex: 330"
                value={customMl}
                onChange={(e) => setCustomMl(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
            >
              Adicionar
            </button>
          </form>
          {msg && (
            <p className="text-xs text-red-600" role="alert">
              {msg}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
