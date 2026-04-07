"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getFavoriteMealImpactScores,
  type FavoriteImpactRow,
} from "@/app/actions/meal-analysis";
import type { GlucoseDisplayUnit } from "@/lib/libre/types";
import { BarChart3, RefreshCw } from "lucide-react";

function formatDeltaSentence(row: FavoriteImpactRow): string {
  const u = row.unit === "mmol/L" ? "mmol/L" : "mg/dL";
  const abs = Math.abs(row.avgDelta);
  const rounded = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  const verb = row.avgDelta >= 0 ? "subir" : "descer";
  return `Esta refeição costuma ${verb} a tua glicemia cerca de ${rounded} ${u} (pico na 1ª hora, média de ${row.sampleCount} registo(s)).`;
}

export function MealImpactAnalysisSection() {
  const [unit, setUnit] = useState<GlucoseDisplayUnit>("mg/dL");
  const [items, setItems] = useState<FavoriteImpactRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getFavoriteMealImpactScores();
    if (!res.ok) {
      setError(res.error);
      setItems([]);
    } else {
      setUnit(res.unit);
      setItems(res.items);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-400">
          Score de impacto (favoritos)
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/[0.08] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            aria-hidden
          />
          Atualizar
        </button>
      </div>

      <p className="text-xs leading-relaxed text-zinc-500">
        Compara o horário de cada registo com a curva Libre da hora seguinte
        (pico vs glicemia no momento da refeição). Só entram alimentos e refeições
        compostas marcadas como{" "}
        <span className="text-zinc-400">favoritas</span>, com dados CGM nas
        últimas 48 h. Unidade:{" "}
        <span className="font-medium text-zinc-400">{unit}</span>.
      </p>

      {loading && items.length === 0 && !error ? (
        <div className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
      ) : error ? (
        <div className="rounded-2xl border border-white/10 bg-surface p-4 text-sm text-zinc-400">
          {error}
        </div>
      ) : items.length === 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-dashed border-white/10 bg-surface/50 p-4">
          <BarChart3 className="h-5 w-5 shrink-0 text-zinc-600" aria-hidden />
          <p className="text-sm text-zinc-500">
            Ainda não há amostras: marca favoritos na biblioteca ou nas refeições
            compostas e regista refeições enquanto a curva de 24 h cobrir esses
            momentos.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((row) => (
            <li
              key={row.key}
              className="rounded-2xl border border-white/5 bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-white">{row.label}</p>
                <span className="shrink-0 rounded-lg bg-accent/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                  n = {row.sampleCount}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {formatDeltaSentence(row)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
