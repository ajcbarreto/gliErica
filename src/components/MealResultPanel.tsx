"use client";

import { useEffect, useState } from "react";
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
  getMealResultAnalysis,
  type MealResultPayload,
} from "@/app/actions/meal-outcome";
import { outcomeLabelPt, type MealOutcomeKind } from "@/lib/analysis/meal-outcome";
import { Activity, AlertTriangle, CheckCircle2, Clock, Info } from "lucide-react";

type Props = {
  mealLogId: string;
};

function formatTimePt(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function minutesBetween(aMs: number, bMs: number): number {
  return Math.round((bMs - aMs) / 60_000);
}

function outcomeBadgeClasses(kind: MealOutcomeKind): string {
  switch (kind) {
    case "in_target":
      return "bg-emerald-50 text-emerald-900 border-emerald-200";
    case "spike":
      return "bg-amber-50 text-amber-900 border-amber-200";
    case "slow_recovery":
      return "bg-orange-50 text-orange-900 border-orange-200";
    case "hypo_after":
      return "bg-rose-50 text-rose-900 border-rose-200";
    case "insufficient_data":
      return "bg-zinc-100 text-zinc-700 border-zinc-200";
  }
}

function OutcomeIcon({ kind }: { kind: MealOutcomeKind }) {
  switch (kind) {
    case "in_target":
      return <CheckCircle2 className="h-4 w-4" aria-hidden />;
    case "spike":
      return <Activity className="h-4 w-4" aria-hidden />;
    case "slow_recovery":
      return <Clock className="h-4 w-4" aria-hidden />;
    case "hypo_after":
      return <AlertTriangle className="h-4 w-4" aria-hidden />;
    case "insufficient_data":
      return <Info className="h-4 w-4" aria-hidden />;
  }
}

function ratioHint(
  implied: number | null,
  rule: number | null,
  kind: MealOutcomeKind
): string | null {
  if (implied === null || rule === null) return null;
  const diffPct = ((implied - rule) / rule) * 100;
  if (kind === "spike" && diffPct > 10) {
    return `O ICR desta refeição (~${implied} g/UI) ficou acima da tua regra (${rule} g/UI). Combinado com o pico alto, pode indicar que a dose foi insuficiente para este perfil de refeição. Conversa com a equipa clínica.`;
  }
  if (kind === "hypo_after" && diffPct < -10) {
    return `O ICR desta refeição (~${implied} g/UI) ficou abaixo da tua regra (${rule} g/UI). Com a hipo posterior, pode indicar que a dose foi excessiva. Conversa com a equipa clínica.`;
  }
  if (Math.abs(diffPct) < 10) {
    return `ICR desta refeição (~${implied} g/UI) próximo da tua regra (${rule} g/UI).`;
  }
  return null;
}

export function MealResultPanel({ mealLogId }: Props) {
  const [data, setData] = useState<MealResultPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void (async () => {
      setLoading(true);
      const res = await getMealResultAnalysis(mealLogId);
      if (!alive) return;
      if (!res.ok) {
        setError(res.error);
        setData(null);
      } else {
        setData(res.data);
        setError(null);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [mealLogId]);

  if (loading) {
    return (
      <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Resultado pós-refeição
        </h3>
        <div className="mt-3 h-32 animate-pulse rounded-xl bg-zinc-100/80" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Resultado pós-refeição
        </h3>
        <p className="mt-3 text-xs text-amber-800" role="status">
          {error}
        </p>
      </section>
    );
  }

  if (!data) return null;

  const { outcome, mealAtMs, miniSeries, targetLowMgDl, targetHighMgDl } = data;
  const chartData = miniSeries.map((p) => ({ t: p.atMs, v: Math.round(p.mgDl) }));
  const xMin = mealAtMs - 30 * 60 * 1000;
  const xMax = mealAtMs + 180 * 60 * 1000;
  const allValues = chartData.map((d) => d.v);
  const yLo = Math.min(targetLowMgDl - 10, ...(allValues.length ? allValues : [targetLowMgDl]));
  const yHi = Math.max(targetHighMgDl + 20, ...(allValues.length ? allValues : [targetHighMgDl]));
  const hasEnough = outcome.kind !== "insufficient_data";

  const hint = ratioHint(
    data.impliedGramsPerUnit,
    data.profileGramsPerUnit,
    outcome.kind
  );

  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Resultado pós-refeição
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${outcomeBadgeClasses(outcome.kind)}`}
        >
          <OutcomeIcon kind={outcome.kind} />
          {outcomeLabelPt(outcome.kind)}
        </span>
      </div>

      {!hasEnough ? (
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          Não há leituras Libre suficientes nas 2h após esta refeição para
          analisar. Pode acontecer se o sensor não estava ligado ou se a
          ingestão do snapshot ainda não cobriu este intervalo.
        </p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-[11px] text-zinc-500">Antes</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">
                {outcome.baselineMgDl != null
                  ? `${Math.round(outcome.baselineMgDl)} mg/dL`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-zinc-500">Pico</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">
                {outcome.peakMgDl != null
                  ? `${Math.round(outcome.peakMgDl)} mg/dL`
                  : "—"}
                {outcome.peakAtMs != null && (
                  <span className="ml-1 text-[10px] font-normal text-zinc-500">
                    +{minutesBetween(mealAtMs, outcome.peakAtMs)} min
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-zinc-500">Δ pico</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">
                {outcome.deltaPeakMgDl != null
                  ? `${outcome.deltaPeakMgDl > 0 ? "+" : ""}${Math.round(outcome.deltaPeakMgDl)} mg/dL`
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-zinc-500">Em alvo (3h)</dt>
              <dd className="font-semibold tabular-nums text-zinc-900">
                {outcome.tirPct != null ? `${outcome.tirPct}%` : "—"}
              </dd>
            </div>
          </dl>

          <div className="mt-4 h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 8, left: -16, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  dataKey="t"
                  domain={[xMin, xMax]}
                  tickFormatter={(t) => formatTimePt(new Date(t).toISOString())}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={32}
                />
                <YAxis
                  domain={[Math.max(40, yLo), yHi]}
                  tick={{ fill: "#94a3b8", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <ReferenceArea
                  y1={targetLowMgDl}
                  y2={targetHighMgDl}
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
                  labelFormatter={(t) =>
                    formatTimePt(new Date(Number(t)).toISOString())
                  }
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
                <ReferenceDot
                  x={mealAtMs}
                  y={outcome.baselineMgDl ?? targetLowMgDl}
                  r={4}
                  fill="#ea580c"
                  stroke="#fff"
                  strokeWidth={2}
                />
                {outcome.peakAtMs != null && outcome.peakMgDl != null && (
                  <ReferenceDot
                    x={outcome.peakAtMs}
                    y={outcome.peakMgDl}
                    r={3}
                    fill="#7c3aed"
                    stroke="#fff"
                    strokeWidth={2}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                ICR desta refeição
              </p>
              <p className="mt-0.5 font-semibold tabular-nums text-zinc-900">
                {data.impliedGramsPerUnit != null
                  ? `${data.impliedGramsPerUnit} g/UI`
                  : "—"}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                {data.gramsCarbs} g HC
                {data.rapidInsulinUnits != null
                  ? ` ÷ ${data.rapidInsulinUnits} UI`
                  : " — sem insulina rápida registada"}
              </p>
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                Regra (Definições)
              </p>
              <p className="mt-0.5 font-semibold tabular-nums text-violet-700">
                {data.profileGramsPerUnit != null
                  ? `${data.profileGramsPerUnit} g/UI`
                  : "Não definida"}
              </p>
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Hipo &lt; {targetLowMgDl} · Alvo até {targetHighMgDl} mg/dL
              </p>
            </div>
          </div>

          {hint && (
            <p className="mt-3 rounded-lg border border-violet-200 bg-violet-50/80 px-3 py-2 text-[11px] leading-relaxed text-violet-950">
              {hint}
            </p>
          )}

          <p className="mt-2 text-[10px] leading-relaxed text-zinc-400">
            Informação de referência baseada na curva Libre — não substitui
            ajuste clínico nem prescreve doses.
          </p>
        </>
      )}
    </section>
  );
}
