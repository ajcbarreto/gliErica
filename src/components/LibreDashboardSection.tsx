"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type LibreGlucoseApiOk = {
  snapshot: LibreGlucoseSnapshot;
  stale?: boolean;
  staleHint?: string;
};

function isLibreGlucoseApiOk(json: unknown): json is LibreGlucoseApiOk {
  if (typeof json !== "object" || json === null) return false;
  const s = (json as LibreGlucoseApiOk).snapshot;
  return typeof s === "object" && s !== null && "current" in s && "chart24h" in s;
}

function cardStyles(range: LibreGlucoseSnapshot["rangeState"]) {
  switch (range) {
    case "hypo":
      return {
        border: "border-red-200",
        bg: "bg-red-50",
        accent: "text-red-700",
        label: "Hipoglicemia",
      };
    case "hyper":
      return {
        border: "border-amber-200",
        bg: "bg-amber-50",
        accent: "text-amber-800",
        label: "Acima do alvo",
      };
    default:
      return {
        border: "border-emerald-200",
        bg: "bg-emerald-50",
        accent: "text-emerald-800",
        label: "No alvo",
      };
  }
}

export function LibreDashboardSection() {
  const [data, setData] = useState<LibreGlucoseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleNote, setStaleNote] = useState<string | null>(null);
  const dataRef = useRef<LibreGlucoseSnapshot | null>(null);
  dataRef.current = data;

  const load = useCallback(async (useFresh = false) => {
    const hadData = dataRef.current !== null;
    if (useFresh && hadData) {
      setStaleNote(null);
    }
    if (!hadData) {
      setLoading(true);
      setError(null);
      setStaleNote(null);
    } else {
      setRefreshing(true);
    }
    try {
      const url = useFresh ? "/api/libre/glucose?fresh=1" : "/api/libre/glucose";
      const res = await fetch(url, { cache: "no-store" });
      const json: unknown = await res.json();

      if (!res.ok) {
        const msg =
          typeof json === "object" &&
          json !== null &&
          "error" in json &&
          typeof (json as { error: unknown }).error === "string"
            ? (json as { error: string }).error
            : `Erro ${res.status}`;
        if (hadData) {
          const limited =
            msg.includes("429") ||
            msg.includes("430") ||
            /limitou pedidos/i.test(msg);
          setStaleNote(
            limited
              ? "Último valor disponível. A API limitou novos pedidos (429/430)."
              : `Último valor disponível. ${msg}`
          );
          return;
        }
        setData(null);
        setStaleNote(null);
        setError(msg);
        return;
      }

      if (!isLibreGlucoseApiOk(json)) {
        if (hadData) {
          setStaleNote(
            "Último valor disponível. Resposta inválida do servidor."
          );
          return;
        }
        setError("Resposta inválida do servidor.");
        return;
      }

      setData(json.snapshot);
      setError(null);
      setStaleNote(
        json.stale
          ? (json.staleHint ??
              "Último valor disponível. O servidor não conseguiu obter dados novos.")
          : null
      );
    } catch {
      if (hadData) {
        setStaleNote(
          "Último valor disponível. Falha de rede ao atualizar."
        );
        return;
      }
      setError("Falha de rede ao obter dados LibreLinkUp.");
      setData(null);
      setStaleNote(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    /** 5 min, alinhado com cache no servidor (~5 min): menos 429/430. */
    const id = setInterval(() => void load(false), 300_000);
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
        <h2 className="text-sm font-medium text-zinc-600">
          FreeStyle Libre (LibreLinkUp)
        </h2>
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={loading || refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading || refreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          Atualizar
        </button>
      </div>

      {staleNote ? (
        <p
          role="status"
          className="border-b border-amber-200/90 bg-amber-50/90 px-3 py-2 text-center text-[11px] leading-snug text-amber-950"
        >
          {staleNote}
        </p>
      ) : null}

      {loading && !data ? (
        <div className="h-36 animate-pulse rounded-2xl bg-zinc-100/80" />
      ) : error && !data ? (
        <div className="rounded-2xl border border-zinc-200 bg-surface p-4 text-sm text-zinc-600">
          <p className="flex items-center gap-2 font-medium text-amber-800">
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
                  <span className="text-4xl font-semibold tabular-nums tracking-tight text-zinc-900">
                    {data.current.value}
                  </span>
                  <span
                    className="text-2xl font-light text-zinc-600"
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
                <p className="font-medium text-zinc-600">Últimas 3 h</p>
                <p className="tabular-nums">{data.history3h.length} leituras</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
            <p className="mb-1 text-xs font-medium text-zinc-600">
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
                      stroke="rgba(15, 23, 42, 0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(15, 23, 42, 0.12)" }}
                      interval="preserveStartEnd"
                      minTickGap={28}
                    />
                    <YAxis
                      domain={[yMin, yMax]}
                      width={36}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => String(Math.round(v))}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#ffffff",
                        border: "1px solid rgba(15, 23, 42, 0.12)",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#18181b",
                        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.1)",
                      }}
                      labelStyle={{ color: "#64748b" }}
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
