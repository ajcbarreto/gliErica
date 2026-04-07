"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LibreGlucoseSnapshot, LibreTrend } from "@/lib/libre/types";
import { Activity, RefreshCw } from "lucide-react";

const trendSymbol: Record<LibreTrend, string> = {
  SingleDown: "↓",
  FortyFiveDown: "↘",
  Flat: "→",
  FortyFiveUp: "↗",
  SingleUp: "↑",
  NotComputable: "—",
};

const trendLabelPt: Record<LibreTrend, string> = {
  SingleDown: "Queda forte",
  FortyFiveDown: "Queda",
  Flat: "Estável",
  FortyFiveUp: "Subida",
  SingleUp: "Subida forte",
  NotComputable: "Sem tendência",
};

function cardStyles(range: LibreGlucoseSnapshot["rangeState"]) {
  switch (range) {
    case "hypo":
      return {
        border: "border-red-500/45",
        bg: "bg-red-950/35",
        accent: "text-red-300",
        label: "Hipoglicemia",
      };
    case "hyper":
      return {
        border: "border-amber-400/45",
        bg: "bg-amber-950/30",
        accent: "text-amber-200",
        label: "Acima do alvo",
      };
    default:
      return {
        border: "border-emerald-500/40",
        bg: "bg-emerald-950/25",
        accent: "text-emerald-300",
        label: "No alvo",
      };
  }
}

export function LibreDashboardSection() {
  const [data, setData] = useState<LibreGlucoseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (useFresh = false) => {
    setError(null);
    setLoading(true);
    try {
      const url = useFresh ? "/api/libre/glucose?fresh=1" : "/api/libre/glucose";
      const res = await fetch(url, { cache: "no-store" });
      const json = (await res.json()) as
        | LibreGlucoseSnapshot
        | { error?: string };
      if (!res.ok) {
        setData(null);
        setError(
          "error" in json && json.error
            ? json.error
            : `Erro ${res.status}`
        );
        return;
      }
      setData(json as LibreGlucoseSnapshot);
    } catch {
      setError("Falha de rede ao obter dados LibreLinkUp.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    /** ~3 min: a API Abbott limita pedidos (429) se atualizar demasiado. */
    const id = setInterval(() => void load(false), 180_000);
    return () => clearInterval(id);
  }, [load]);

  const chartRows =
    data?.chart24h.map((p) => ({
      t: new Date(p.at).getTime(),
      label: new Date(p.at).toLocaleTimeString("pt-PT", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      glucose: p.value,
    })) ?? [];

  const yMin =
    chartRows.length > 0
      ? Math.min(...chartRows.map((r) => r.glucose)) * 0.92
      : 0;
  const yMax =
    chartRows.length > 0
      ? Math.max(...chartRows.map((r) => r.glucose)) * 1.08
      : 200;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-zinc-400">
          FreeStyle Libre (LibreLinkUp)
        </h2>
        <button
          type="button"
          onClick={() => void load(true)}
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

      {loading && !data ? (
        <div className="h-36 animate-pulse rounded-2xl bg-white/[0.04]" />
      ) : error ? (
        <div className="rounded-2xl border border-white/10 bg-surface p-4 text-sm text-zinc-400">
          <p className="flex items-center gap-2 font-medium text-amber-200/90">
            <Activity className="h-4 w-4 shrink-0" aria-hidden />
            LibreLinkUp indisponível
          </p>
          <p className="mt-2 text-xs leading-relaxed text-zinc-500">{error}</p>
        </div>
      ) : data ? (
        <>
          <div
            className={`rounded-2xl border p-4 shadow-card transition-colors ${cardStyles(data.rangeState).border} ${cardStyles(data.rangeState).bg}`}
          >
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  Estado atual
                </p>
                <p
                  className={`mt-1 text-xs font-medium ${cardStyles(data.rangeState).accent}`}
                >
                  {cardStyles(data.rangeState).label}
                </p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-4xl font-semibold tabular-nums tracking-tight text-white">
                    {data.current.value}
                  </span>
                  <span
                    className="text-2xl font-light text-zinc-300"
                    title={trendLabelPt[data.current.trend]}
                    aria-label={`Tendência: ${trendLabelPt[data.current.trend]}`}
                  >
                    {trendSymbol[data.current.trend]}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Alvo {data.targetLow} – {data.targetHigh} ·{" "}
                  {new Date(data.current.at).toLocaleString("pt-PT", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="text-right text-[11px] text-zinc-500">
                <p className="font-medium text-zinc-400">Últimas 3 h</p>
                <p className="tabular-nums">{data.history3h.length} leituras</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-surface p-4 shadow-card">
            <p className="mb-1 text-xs font-medium text-zinc-400">
              Evolução (24 h)
            </p>
            {chartRows.length < 2 ? (
              <p className="py-10 text-center text-xs text-zinc-500">
                Dados insuficientes para o gráfico.
              </p>
            ) : (
              <div className="h-[220px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartRows}
                    margin={{ top: 8, right: 8, left: -18, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke="rgba(255,255,255,0.06)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
                      interval="preserveStartEnd"
                      minTickGap={28}
                    />
                    <YAxis
                      domain={[yMin, yMax]}
                      width={36}
                      tick={{ fill: "#71717a", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => String(Math.round(v))}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#18181b",
                        border: "1px solid rgba(255,255,255,0.08)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#fafafa",
                      }}
                      labelStyle={{ color: "#a1a1aa" }}
                      formatter={(value) => [
                        `${value ?? "—"}`,
                        "Glicemia",
                      ]}
                    />
                    <Line
                      type="monotone"
                      dataKey="glucose"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{
                        r: 4,
                        fill: "#10b981",
                        stroke: "#ecfdf5",
                        strokeWidth: 1,
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}
