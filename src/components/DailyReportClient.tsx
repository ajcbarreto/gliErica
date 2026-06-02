"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Syringe,
  UtensilsCrossed,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getLocalDateKey } from "@/lib/date";
import { mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";
import { fetchLibreGlucoseAction } from "@/app/actions/libre-glucose";
import type {
  GlycemicEvent,
  InsulinEntry,
  MealLog,
} from "@/types/database";

const TARGET_LOW_DEFAULT = 70;
const TARGET_HIGH_DEFAULT = 160;

type GlucosePoint = { tMs: number; mgDl: number };

type DayBundle = {
  glucose: GlucosePoint[];
  meals: MealLog[];
  insulin: InsulinEntry[];
  events: GlycemicEvent[];
  targetLowMgDl: number;
  targetHighMgDl: number;
};

function dayBounds(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d, 23, 59, 59, 999);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

function addDays(dateKey: string, deltaDays: number) {
  const [y, m, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + deltaDays);
  return getLocalDateKey(dt);
}

function isToday(dateKey: string) {
  return dateKey === getLocalDateKey();
}

function formatDayPt(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-PT", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatHm(tMs: number) {
  return new Date(tMs).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** GMI (%) = 3.31 + 0.02392 × média mg/dL (Bergenstal et al., 2018). */
function computeGmi(meanMgDl: number): number {
  return Math.round((3.31 + 0.02392 * meanMgDl) * 10) / 10;
}

/** TIR (%) = leituras dentro do alvo / total. */
function computeTir(
  points: GlucosePoint[],
  low: number,
  high: number
): number | null {
  if (points.length === 0) return null;
  const inTarget = points.filter((p) => p.mgDl >= low && p.mgDl <= high).length;
  return Math.round((inTarget / points.length) * 100);
}

function computeMean(points: GlucosePoint[]): number | null {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => acc + p.mgDl, 0);
  return Math.round(sum / points.length);
}

type TimelineItem =
  | { kind: "meal"; tMs: number; row: MealLog }
  | { kind: "insulin"; tMs: number; row: InsulinEntry }
  | { kind: "event"; tMs: number; row: GlycemicEvent };

export function DailyReportClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const { userId, loading: authLoading } = useAuthUser();

  const queryDay = searchParams.get("d");
  const [dateKey, setDateKey] = useState<string>(
    queryDay ?? getLocalDateKey()
  );
  const [bundle, setBundle] = useState<DayBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (queryDay && queryDay !== dateKey) setDateKey(queryDay);
  }, [queryDay, dateKey]);

  const changeDay = useCallback(
    (next: string) => {
      setDateKey(next);
      router.replace(`/graficos/dia?d=${next}`, { scroll: false });
    },
    [router]
  );

  const load = useCallback(async () => {
    if (!userId) {
      setBundle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    if (isToday(dateKey)) {
      try {
        await fetchLibreGlucoseAction();
      } catch {
        // silencioso — se falhar, mostra-se só o que estiver no BD
      }
    }

    const { startMs, endMs } = dayBounds(dateKey);
    const startIso = new Date(startMs).toISOString();
    const endIso = new Date(endMs).toISOString();

    const [
      glucoseRes,
      mealsRes,
      insulinRes,
      eventsRes,
      profileRes,
    ] = await Promise.all([
      supabase
        .from("libre_glucose_readings")
        .select("measured_at, value_mg_dl")
        .eq("user_id", userId)
        .gte("measured_at", startIso)
        .lte("measured_at", endIso)
        .order("measured_at", { ascending: true })
        .limit(20_000),
      supabase
        .from("meal_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("logged_on", dateKey)
        .order("logged_at", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("insulin_entries")
        .select("*")
        .eq("user_id", userId)
        .eq("logged_on", dateKey)
        .order("created_at", { ascending: true }),
      supabase
        .from("glycemic_events")
        .select("*")
        .eq("user_id", userId)
        .eq("logged_on", dateKey)
        .order("occurred_at", { ascending: true }),
      supabase
        .from("profiles")
        .select("libre_chart_zone_low_mg_dl, libre_chart_zone_high_mg_dl")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    if (glucoseRes.error) {
      setError(glucoseRes.error.message);
      setBundle(null);
      setLoading(false);
      return;
    }

    const glucose: GlucosePoint[] = (
      glucoseRes.data ?? []
    ).map((r: { measured_at: string; value_mg_dl: number }) => ({
      tMs: new Date(r.measured_at).getTime(),
      mgDl: Number(r.value_mg_dl),
    }));

    const lo = profileRes.data?.libre_chart_zone_low_mg_dl;
    const hi = profileRes.data?.libre_chart_zone_high_mg_dl;
    const targetLow =
      typeof lo === "number" && lo > 0 ? lo : TARGET_LOW_DEFAULT;
    const targetHigh =
      typeof hi === "number" && hi > targetLow ? hi : TARGET_HIGH_DEFAULT;

    setBundle({
      glucose,
      meals: (mealsRes.data ?? []) as MealLog[],
      insulin: (insulinRes.data ?? []) as InsulinEntry[],
      events: (eventsRes.data ?? []) as GlycemicEvent[],
      targetLowMgDl: targetLow,
      targetHighMgDl: targetHigh,
    });
    setLoading(false);
  }, [supabase, userId, dateKey]);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    if (!bundle) return null;
    const mean = computeMean(bundle.glucose);
    const tir = computeTir(
      bundle.glucose,
      bundle.targetLowMgDl,
      bundle.targetHighMgDl
    );
    const gmi = mean != null ? computeGmi(mean) : null;
    return { mean, tir, gmi, n: bundle.glucose.length };
  }, [bundle]);

  const timeline = useMemo<TimelineItem[]>(() => {
    if (!bundle) return [];
    const items: TimelineItem[] = [];
    for (const m of bundle.meals) {
      const tIso = m.logged_at ?? m.created_at;
      items.push({ kind: "meal", tMs: new Date(tIso).getTime(), row: m });
    }
    for (const i of bundle.insulin) {
      items.push({
        kind: "insulin",
        tMs: new Date(i.created_at).getTime(),
        row: i,
      });
    }
    for (const e of bundle.events) {
      items.push({
        kind: "event",
        tMs: new Date(e.occurred_at).getTime(),
        row: e,
      });
    }
    return items.sort((a, b) => a.tMs - b.tMs);
  }, [bundle]);

  if (authLoading) {
    return <p className="text-sm text-zinc-500">A carregar sessão…</p>;
  }

  if (!userId) {
    return (
      <p className="text-sm text-zinc-600">
        Inicia sessão para veres o relatório diário.
      </p>
    );
  }

  const { startMs, endMs } = dayBounds(dateKey);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header className="space-y-3">
        <Link
          href="/graficos"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Gráficos
        </Link>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Análise
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Relatório diário
          </h1>
          <p className="text-sm text-zinc-600">
            Curva Libre, refeições e insulina marcadas no eixo do tempo.
          </p>
        </div>
      </header>

      <div className="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200/90 bg-surface px-3 py-2 shadow-card">
        <button
          type="button"
          onClick={() => changeDay(addDays(dateKey, -1))}
          className="rounded-xl p-2 text-zinc-600 transition hover:bg-zinc-100"
          aria-label="Dia anterior"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center">
          <p className="text-sm font-semibold tabular-nums text-zinc-900">
            {formatDayPt(dateKey)}
          </p>
          <label className="mt-0.5 inline-flex cursor-pointer items-center gap-1 text-[10px] text-zinc-500 hover:text-accent">
            <CalendarDays className="h-3 w-3" aria-hidden />
            <span>escolher data</span>
            <input
              type="date"
              value={dateKey}
              max={getLocalDateKey()}
              onChange={(e) => changeDay(e.target.value)}
              className="sr-only"
            />
          </label>
        </div>
        <div className="flex items-center gap-1">
          {!isToday(dateKey) && (
            <button
              type="button"
              onClick={() => changeDay(getLocalDateKey())}
              className="rounded-xl px-2 py-1 text-[11px] font-medium text-accent transition hover:bg-accent/10"
            >
              hoje
            </button>
          )}
          <button
            type="button"
            onClick={() => changeDay(addDays(dateKey, 1))}
            disabled={isToday(dateKey)}
            className="rounded-xl p-2 text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-30"
            aria-label="Dia seguinte"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar dados do dia…</p>
      ) : !bundle ? null : (
        <>
          <KpisRow stats={stats} />
          <ChartCard bundle={bundle} startMs={startMs} endMs={endMs} />
          <TimelineCard items={timeline} bundle={bundle} />
        </>
      )}

      <p className="text-[10px] leading-relaxed text-zinc-400">
        Informação de referência baseada nas leituras Libre guardadas. Não
        substitui aconselhamento médico.
      </p>
    </div>
  );
}

function KpisRow({
  stats,
}: {
  stats: { mean: number | null; tir: number | null; gmi: number | null; n: number } | null;
}) {
  if (!stats) return null;
  const hasData = stats.n > 0;
  return (
    <section className="grid grid-cols-3 gap-2">
      <Kpi label="TIR" value={stats.tir != null ? `${stats.tir}%` : "—"} hint={`${stats.n} leituras`} />
      <Kpi label="Média" value={hasData ? `${stats.mean} mg/dL` : "—"} hint="24h" />
      <Kpi label="GMI" value={stats.gmi != null ? `${stats.gmi}%` : "—"} hint="HbA1c estimada" />
    </section>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card">
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold tabular-nums text-zinc-900">
        {value}
      </p>
      {hint && <p className="text-[10px] text-zinc-500">{hint}</p>}
    </div>
  );
}

function ChartCard({
  bundle,
  startMs,
  endMs,
}: {
  bundle: DayBundle;
  startMs: number;
  endMs: number;
}) {
  const chartData = bundle.glucose.map((p) => ({
    t: p.tMs,
    v: Math.round(p.mgDl),
  }));

  const allValues = chartData.map((d) => d.v);
  const yLo = Math.min(
    bundle.targetLowMgDl - 10,
    ...(allValues.length ? allValues : [bundle.targetLowMgDl])
  );
  const yHi = Math.max(
    bundle.targetHighMgDl + 20,
    ...(allValues.length ? allValues : [bundle.targetHighMgDl])
  );

  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card">
      {chartData.length < 2 ? (
        <div className="flex h-[220px] items-center justify-center rounded-xl bg-zinc-50/70 text-center text-xs text-zinc-500">
          Sem leituras Libre suficientes neste dia para desenhar a curva.
        </div>
      ) : (
        <div className="h-[260px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
            >
              <XAxis
                type="number"
                dataKey="t"
                domain={[startMs, endMs]}
                tickFormatter={(t) => formatHm(t)}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                minTickGap={36}
              />
              <YAxis
                domain={[Math.max(40, yLo), yHi]}
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <ReferenceArea
                y1={bundle.targetLowMgDl}
                y2={bundle.targetHighMgDl}
                fill="#10b981"
                fillOpacity={0.08}
                stroke="none"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid rgba(15, 23, 42, 0.12)",
                  borderRadius: "10px",
                  fontSize: "11px",
                }}
                labelFormatter={(t) => formatHm(Number(t))}
                formatter={(v) => [`${v} mg/dL`, "Glicemia"]}
              />
              <Line
                type="monotone"
                dataKey="v"
                stroke="#0f766e"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              {bundle.meals.map((m) => {
                const tMs = new Date(
                  m.logged_at ?? m.created_at
                ).getTime();
                return (
                  <ReferenceDot
                    key={`meal-${m.id}`}
                    x={tMs}
                    y={bundle.targetLowMgDl}
                    r={5}
                    fill="#ea580c"
                    stroke="#fff"
                    strokeWidth={2}
                    ifOverflow="extendDomain"
                  />
                );
              })}
              {bundle.insulin.map((i) => (
                <ReferenceDot
                  key={`ins-${i.id}`}
                  x={new Date(i.created_at).getTime()}
                  y={bundle.targetHighMgDl}
                  r={4}
                  fill={i.kind === "basal" ? "#94a3b8" : "#7c3aed"}
                  stroke="#fff"
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                />
              ))}
              {bundle.events.map((e) => (
                <ReferenceDot
                  key={`evt-${e.id}`}
                  x={new Date(e.occurred_at).getTime()}
                  y={
                    e.kind === "hypo"
                      ? bundle.targetLowMgDl
                      : bundle.targetHighMgDl
                  }
                  r={5}
                  fill={e.kind === "hypo" ? "#dc2626" : "#d97706"}
                  stroke="#fff"
                  strokeWidth={2}
                  ifOverflow="extendDomain"
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-zinc-500">
        <LegendDot color="#ea580c" label="Refeição" />
        <LegendDot color="#7c3aed" label="Rápida/Correção" />
        <LegendDot color="#94a3b8" label="Basal" />
        <LegendDot color="#dc2626" label="Hipo" />
        <LegendDot color="#d97706" label="Hiper" />
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-3 rounded-sm bg-emerald-500/20" />
          Alvo {bundle.targetLowMgDl}–{bundle.targetHighMgDl}
        </span>
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}

function TimelineCard({
  items,
  bundle,
}: {
  items: TimelineItem[];
  bundle: DayBundle;
}) {
  if (items.length === 0) {
    return (
      <section className="rounded-2xl border border-dashed border-zinc-200 bg-surface/50 p-6 text-center">
        <p className="text-sm text-zinc-500">
          Sem registos de refeições, insulina ou eventos neste dia.
        </p>
      </section>
    );
  }
  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card">
      <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Cronologia
      </h3>
      <ul className="mt-2 divide-y divide-zinc-100">
        {items.map((item, idx) => (
          <li
            key={`${item.kind}-${idx}-${item.tMs}`}
            className="flex items-start gap-2 py-2 text-sm"
          >
            <span className="w-12 shrink-0 text-[11px] tabular-nums text-zinc-500">
              {formatHm(item.tMs)}
            </span>
            <TimelineItemBody item={item} bundle={bundle} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TimelineItemBody({
  item,
  bundle,
}: {
  item: TimelineItem;
  bundle: DayBundle;
}) {
  if (item.kind === "meal") {
    const m = item.row;
    const slot = mealSlotLabelPt(m.meal_slot as MealSlot);
    return (
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
          <UtensilsCrossed className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-zinc-900">
            <span className="font-medium">{slot}</span>
            <span className="ml-1 text-zinc-500">
              · {m.grams_carbs} g HC
            </span>
            {m.rapid_insulin_units != null && m.rapid_insulin_units > 0 && (
              <span className="ml-1 text-violet-700">
                · {m.rapid_insulin_units} UI
              </span>
            )}
          </p>
          {m.note && (
            <p className="truncate text-[11px] text-zinc-500">{m.note}</p>
          )}
        </div>
      </div>
    );
  }
  if (item.kind === "insulin") {
    const i = item.row;
    const label =
      i.kind === "basal"
        ? "Basal"
        : i.kind === "correction"
          ? "Correção"
          : "Rápida";
    const colorBg =
      i.kind === "basal"
        ? "bg-zinc-100 text-zinc-700"
        : i.kind === "correction"
          ? "bg-amber-100 text-amber-800"
          : "bg-violet-100 text-violet-700";
    return (
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <span
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorBg}`}
        >
          <Syringe className="h-3.5 w-3.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-zinc-900">
            <span className="font-medium">{label}</span>
            <span className="ml-1 text-zinc-500">· {i.units} UI</span>
          </p>
          {i.note && (
            <p className="truncate text-[11px] text-zinc-500">{i.note}</p>
          )}
        </div>
      </div>
    );
  }
  const e = item.row;
  const kindLabel = e.kind === "hypo" ? "Hipoglicemia" : "Hiperglicemia";
  const colorBg =
    e.kind === "hypo" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
  const valueLabel =
    e.glucose_value != null
      ? `${Math.round(Number(e.glucose_value))} ${e.glucose_unit === "mmol_l" ? "mmol/L" : "mg/dL"}`
      : null;
  return (
    <div className="flex min-w-0 flex-1 items-start gap-2">
      <span
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${colorBg}`}
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-zinc-900">
          <span className="font-medium">{kindLabel}</span>
          {valueLabel && (
            <span className="ml-1 text-zinc-500">· {valueLabel}</span>
          )}
          {e.carbs_treatment_g != null && e.carbs_treatment_g > 0 && (
            <span className="ml-1 text-zinc-500">
              · {e.carbs_treatment_g} g HC tratamento
            </span>
          )}
        </p>
        {e.note && (
          <p className="truncate text-[11px] text-zinc-500">{e.note}</p>
        )}
        <p className="sr-only">
          Alvo {bundle.targetLowMgDl}–{bundle.targetHighMgDl} mg/dL
        </p>
      </div>
    </div>
  );
}
