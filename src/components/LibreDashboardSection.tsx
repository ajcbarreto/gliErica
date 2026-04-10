"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { LibreGlucoseSnapshot, LibreTrend } from "@/lib/libre/types";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import type { MealLog } from "@/types/database";
import { Activity, RefreshCw, X } from "lucide-react";
import { Drawer as VaulDrawer } from "vaul";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { LibreDashboardSkeleton } from "@/components/ui/skeleton";
import { AnimatedGlucoseValue } from "@/components/AnimatedGlucoseValue";
import {
  bandBorderClasses,
  bandFromMgDl,
  bandGradientClasses,
  glucoseToMgDl,
} from "@/lib/glucose-bands";

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

type ChartRow = { t: number; glucose: number };

type MealChartMarker = {
  id: string;
  /** Posição X no gráfico (limitada à janela das leituras Libre). */
  t: number;
  glucose: number;
  /** Texto para <title> / acessibilidade */
  hint: string;
  slotLabel: string;
  gramsCarbs: number;
  rapidInsulinUnits: number | null;
  note: string | null;
  /** Instant real da refeição (para data/hora no painel). */
  tActualMs: number;
  clampedToEdge: boolean;
};

/**
 * Incluir refeições até X antes da 1.ª / depois da última leitura do gráfico.
 * Sem isto, um lanche registado p.ex. 15 min antes da 1.ª leitura Libre caía fora e não desenhava ponto.
 */
const MEAL_CHART_SLACK_MS = 4 * 60 * 60 * 1000;

function mealInstantMs(row: Pick<MealLog, "logged_at" | "created_at">): number {
  const src = row.logged_at ?? row.created_at;
  return new Date(src).getTime();
}

/** Glicemia interpolada na curva Libre no instante da refeição. */
function glucoseAtTime(rows: ChartRow[], tMeal: number): number {
  if (rows.length === 0) return 0;
  if (tMeal <= rows[0].t) return rows[0].glucose;
  const last = rows[rows.length - 1];
  if (tMeal >= last.t) return last.glucose;
  for (let i = 0; i < rows.length - 1; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (tMeal >= a.t && tMeal <= b.t) {
      const span = b.t - a.t;
      const f = span === 0 ? 0 : (tMeal - a.t) / span;
      return a.glucose + f * (b.glucose - a.glucose);
    }
  }
  return last.glucose;
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

function GlucoseHeroCard({ data }: { data: LibreGlucoseSnapshot }) {
  const mgDl = glucoseToMgDl(data.current.value, data.glucoseUnit);
  const band = bandFromMgDl(mgDl);
  const cs = cardStyles(data.rangeState);

  return (
    <div
      className={`rounded-2xl border p-4 shadow-card transition-colors ${bandBorderClasses(band)} ${bandGradientClasses(band)}`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Estado atual
          </p>
          <p className={`mt-1 text-xs font-medium ${cs.accent}`}>{cs.label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <AnimatedGlucoseValue
              value={data.current.value}
              unit={data.glucoseUnit}
              className="text-4xl font-semibold text-zinc-900"
            />
            <span
              className="text-2xl font-light text-zinc-700"
              title={trendLabelPt[data.current.trend]}
              aria-label={`Tendência: ${trendLabelPt[data.current.trend]}`}
            >
              {trendSymbol[data.current.trend]}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-600">
            Alvo {data.targetLow} – {data.targetHigh} ·{" "}
            {new Date(data.current.at).toLocaleString("pt-PT", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <div className="text-right text-[11px] text-zinc-600">
          <p className="font-medium text-zinc-700">Últimas 3 h</p>
          <p className="tabular-nums">{data.history3h.length} leituras</p>
        </div>
      </div>
    </div>
  );
}

export function LibreDashboardSection() {
  const supabase = useMemo(() => createClient(), []);
  const { userId } = useAuthUser();
  const [data, setData] = useState<LibreGlucoseSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [staleNote, setStaleNote] = useState<string | null>(null);
  const [mealMarkers, setMealMarkers] = useState<MealChartMarker[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<MealChartMarker | null>(
    null
  );
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

  const onPullRefresh = useCallback(() => void load(true), [load]);
  usePullToRefresh(onPullRefresh);

  useEffect(() => {
    void load(false);
    /** 5 min, alinhado com cache no servidor (~5 min): menos 429/430. */
    const id = setInterval(() => void load(false), 300_000);
    return () => clearInterval(id);
  }, [load]);

  const chartRows: ChartRow[] =
    data?.chart24h.map((p) => ({
      t: new Date(p.at).getTime(),
      glucose: p.value,
    })) ?? [];

  useEffect(() => {
    if (!data?.chart24h || data.chart24h.length < 2) {
      setMealMarkers([]);
      return;
    }
    const series: ChartRow[] = data.chart24h.map((p) => ({
      t: new Date(p.at).getTime(),
      glucose: p.value,
    }));
    const tMin = series[0].t;
    const tMax = series[series.length - 1].t;

    if (!userId) {
      setMealMarkers([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data: rows, error: qErr } = await supabase
        .from("meal_logs")
        .select(
          "id, logged_at, created_at, meal_slot, grams_carbs, rapid_insulin_units, note"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(120);

      if (cancelled || qErr || !rows) {
        if (!cancelled && qErr) setMealMarkers([]);
        return;
      }

      const markers: MealChartMarker[] = [];
      for (const raw of rows as MealLog[]) {
        const tActual = mealInstantMs(raw);
        if (
          tActual < tMin - MEAL_CHART_SLACK_MS ||
          tActual > tMax + MEAL_CHART_SLACK_MS
        ) {
          continue;
        }
        const tPlot = Math.min(Math.max(tActual, tMin), tMax);
        const slotPt = mealSlotLabelPt(raw.meal_slot as MealSlot);
        const ins =
          raw.rapid_insulin_units != null && raw.rapid_insulin_units > 0
            ? ` · ${raw.rapid_insulin_units} UI`
            : "";
        const note = raw.note?.trim() ?? "";
        const noteBit =
          note !== ""
            ? ` — ${note.slice(0, 48)}${note.length > 48 ? "…" : ""}`
            : "";
        const timeLabel = new Date(tActual).toLocaleTimeString("pt-PT", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const clampedToEdge = tActual < tMin || tActual > tMax;
        const edgeNote = clampedToEdge
          ? " (hora à beira da janela Libre — ponto no limite do gráfico)"
          : "";
        markers.push({
          id: raw.id,
          t: tPlot,
          glucose: glucoseAtTime(series, tPlot),
          hint: `${slotPt} · ${raw.grams_carbs} g HC${ins} · ${timeLabel}${noteBit}${edgeNote}`,
          slotLabel: slotPt,
          gramsCarbs: raw.grams_carbs,
          rapidInsulinUnits:
            raw.rapid_insulin_units != null && raw.rapid_insulin_units > 0
              ? raw.rapid_insulin_units
              : null,
          note: note !== "" ? note : null,
          tActualMs: tActual,
          clampedToEdge,
        });
      }
      markers.sort((a, b) => a.t - b.t);
      if (!cancelled) setMealMarkers(markers);
    })();

    return () => {
      cancelled = true;
    };
  }, [data, supabase, userId]);

  useEffect(() => {
    if (!data) setSelectedMeal(null);
  }, [data]);

  useEffect(() => {
    setSelectedMeal((prev) =>
      prev && !mealMarkers.some((m) => m.id === prev.id) ? null : prev
    );
  }, [mealMarkers]);

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
        <LibreDashboardSkeleton />
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
          <GlucoseHeroCard data={data} />

          <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
            <p className="mb-1 text-xs font-medium text-zinc-600">
              Evolução (24 h)
            </p>
            <p className="mb-2 text-[11px] leading-snug text-zinc-500">
              Pontos violeta = refeições registadas. Toca no ponto para ver o que
              foi (HC, insulina, nota). Se a hora estiver à beira da janela Libre, o
              ponto assenta no limite do gráfico.
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
                    margin={{ top: 12, right: 8, left: -18, bottom: 4 }}
                  >
                    <CartesianGrid
                      stroke="rgba(15, 23, 42, 0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="t"
                      type="number"
                      domain={["dataMin", "dataMax"]}
                      tick={{ fill: "#64748b", fontSize: 10 }}
                      tickLine={false}
                      axisLine={{ stroke: "rgba(15, 23, 42, 0.12)" }}
                      interval="preserveStartEnd"
                      minTickGap={28}
                      tickFormatter={(v) =>
                        typeof v === "number"
                          ? new Date(v).toLocaleTimeString("pt-PT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""
                      }
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
                      labelFormatter={(v) =>
                        typeof v === "number"
                          ? new Date(v).toLocaleString("pt-PT", {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : String(v)
                      }
                      formatter={(value) => [
                        `${value != null ? Math.round(Number(value)) : "—"}`,
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
                    {mealMarkers.map((m) => (
                      <ReferenceDot
                        key={m.id}
                        x={m.t}
                        y={m.glucose}
                        zIndex={80}
                        shape={(dotProps) => {
                          const { cx, cy } = dotProps;
                          if (cx == null || cy == null) return <g />;
                          const r = 8;
                          return (
                            <g
                              style={{ cursor: "pointer" }}
                              role="button"
                              tabIndex={0}
                              aria-label={`Refeição: ${m.slotLabel}, tocar para detalhes`}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  setSelectedMeal(m);
                                }
                              }}
                            >
                              <title>{m.hint}</title>
                              <circle
                                cx={cx}
                                cy={cy}
                                r={r}
                                fill="#7c3aed"
                                stroke="#f5f3ff"
                                strokeWidth={2}
                                className="transition-opacity hover:opacity-90 active:opacity-100"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMeal(m);
                                }}
                              />
                            </g>
                          );
                        }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <Drawer
              open={selectedMeal !== null}
              onOpenChange={(open) => {
                if (!open) setSelectedMeal(null);
              }}
            >
              <DrawerContent
                showHandle
                className="max-h-[min(85vh,560px)] overflow-y-auto px-4 pt-0"
              >
                {selectedMeal ? (
                  <>
                    <VaulDrawer.Title className="sr-only">
                      Detalhe da refeição no gráfico
                    </VaulDrawer.Title>
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p
                          id="meal-chart-detail-title"
                          className="text-base font-semibold text-zinc-900"
                        >
                          {selectedMeal.slotLabel}
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {new Date(selectedMeal.tActualMs).toLocaleString(
                            "pt-PT",
                            {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedMeal(null)}
                        className="shrink-0 rounded-full p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
                      >
                        <X className="h-5 w-5" aria-hidden />
                      </button>
                    </div>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">Hidratos</dt>
                        <dd className="font-medium tabular-nums text-zinc-900">
                          {selectedMeal.gramsCarbs} g
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-zinc-500">Insulina rápida</dt>
                        <dd className="font-medium tabular-nums text-zinc-900">
                          {selectedMeal.rapidInsulinUnits != null
                            ? `${selectedMeal.rapidInsulinUnits} UI`
                            : "—"}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="shrink-0 text-zinc-500">
                          Glicemia (curva)
                        </dt>
                        <dd className="text-right font-medium tabular-nums text-zinc-900">
                          ~{Math.round(selectedMeal.glucose)} mg/dL
                        </dd>
                      </div>
                      {selectedMeal.note && (
                        <div>
                          <dt className="text-zinc-500">Nota</dt>
                          <dd className="mt-1 whitespace-pre-wrap text-zinc-800">
                            {selectedMeal.note}
                          </dd>
                        </div>
                      )}
                    </dl>
                    {selectedMeal.clampedToEdge && (
                      <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] text-amber-950">
                        A hora do registo ficou à beira da janela das leituras
                        Libre; o ponto foi desenhado no limite do gráfico.
                      </p>
                    )}
                  </>
                ) : null}
              </DrawerContent>
            </Drawer>
          </div>
        </>
      ) : null}
    </section>
  );
}
