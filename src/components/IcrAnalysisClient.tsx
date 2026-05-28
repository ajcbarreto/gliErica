"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getInsulinCarbAnalysis,
  type IcrAnalysisPayload,
  type SlotIcrStat,
} from "@/app/actions/icr-analysis";
import { Activity, RefreshCw } from "lucide-react";
import { usePullToRefresh } from "@/lib/use-pull-refresh";

type RangeDays = 14 | 30 | 42 | 90;

function labelDdMm(dateKey: string) {
  const [, m, d] = dateKey.split("-");
  return `${d}/${m}`;
}

function insightText(data: IcrAnalysisPayload): string | null {
  const { medianImplied, meanImplied } = data.stats;
  const rule = data.profileGramsPerUnit;
  if (medianImplied === null || data.stats.daysWithBoth < 5) {
    return null;
  }
  const parts: string[] = [];
  parts.push(
    `Com base em ${data.stats.daysWithBoth} dias com HC e insulina rápida, a mediana implícita é ~${medianImplied} g por UI`
  );
  if (meanImplied !== null && Math.abs(meanImplied - medianImplied) > 2) {
    parts.push(`(média ~${meanImplied.toFixed(1)} g/UI — há dias atípicos)`);
  }
  parts.push(".");
  if (rule !== null) {
    const diffPct = ((medianImplied - rule) / rule) * 100;
    if (Math.abs(diffPct) < 12) {
      parts.push(
        ` Está próximo da regra que guardaste (${rule} g/UI). Continua a cruzar com a Libre e com a equipa de saúde.`
      );
    } else if (medianImplied > rule) {
      parts.push(
        ` É superior à tua regra (${rule} g/UI): nos dados, há menos UI rápida por grama de HC registada do que essa regra implicaria — ou falta registar HC, ou a dose real foi mais baixa. Valida com glicemias e médico.`
      );
    } else {
      parts.push(
        ` É inferior à tua regra (${rule} g/UI): nos dados há mais UI rápida por grama de HC registada. Pode indicar correções, basal ou HC subestimados. Valida com a equipa.`
      );
    }
  } else {
    parts.push(
      " Define a regra em Definições para comparar automaticamente com esta mediana."
    );
  }
  return parts.join("");
}

export function IcrAnalysisClient() {
  const [range, setRange] = useState<RangeDays>(42);
  const [data, setData] = useState<IcrAnalysisPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await getInsulinCarbAnalysis(range);
    if (!res.ok) {
      setData(null);
      setError(res.error);
    } else {
      setData(res.data);
    }
    setLoading(false);
  }, [range]);

  usePullToRefresh(load);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-5">
      <header className="space-y-3">
        <LinkBack />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Insulina & hidratos
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Ajustar g / UI
            </h1>
            <p className="mt-1 text-sm text-zinc-600">
              Cruza dias completos: hidratos registados vs insulina rápida. A
              linha pontilhada é a regra das Definições (se existir).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs text-zinc-500">
              <span className="mr-2">Período</span>
              <select
                value={range}
                onChange={(e) => setRange(Number(e.target.value) as RangeDays)}
                className="rounded-lg border border-zinc-200 bg-canvas px-2 py-1.5 text-sm text-zinc-900"
              >
                <option value={14}>14 dias</option>
                <option value={30}>30 dias</option>
                <option value={42}>6 semanas</option>
                <option value={90}>90 dias</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              Atualizar
            </button>
          </div>
        </div>
      </header>

      {loading && !data ? (
        <div className="h-48 animate-pulse rounded-2xl bg-zinc-100/80" />
      ) : error ? (
        <div className="rounded-2xl border border-zinc-200 bg-surface p-4 text-sm text-red-600">
          {error}
        </div>
      ) : data ? (
        <IcrBody data={data} />
      ) : null}
    </div>
  );
}

function IcrBody({ data }: { data: IcrAnalysisPayload }) {
  const insight = insightText(data);
  const chartMain = data.series.map((d) => ({
    label: labelDdMm(d.dateKey),
    carbs: d.carbsG,
    rapid: d.rapidUnits,
  }));

  const chartImplied = data.series.map((d) => ({
    label: labelDdMm(d.dateKey),
    implied: d.impliedGramsPerUnit,
  }));

  return (
    <>
          <section className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Mediana implícita
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-zinc-900">
                {data.stats.medianImplied != null
                  ? `${data.stats.medianImplied} g/UI`
                  : "—"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                Dias com HC + rápida: {data.stats.daysWithBoth}
              </p>
            </div>
            <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
              <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                Regra nas Definições
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-violet-700">
                {data.profileGramsPerUnit != null
                  ? `${data.profileGramsPerUnit} g/UI`
                  : "Não definida"}
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                P25–P75 implícito:{" "}
                {data.stats.p25 != null && data.stats.p75 != null
                  ? `${data.stats.p25} – ${data.stats.p75} g/UI`
                  : "—"}
              </p>
            </div>
          </section>

          {data.stats.daysWithBoth > 0 && data.stats.daysWithBoth < 5 && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Com {data.stats.daysWithBoth} dia(s) com HC e rápida, o resumo automático
              fica mais fiável com pelo menos 5 dias — continua a registar.
            </p>
          )}

          <SlotIcrSection
            perSlot={data.perSlot}
            rule={data.profileGramsPerUnit}
          />

          {insight && (
            <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 text-sm leading-relaxed text-violet-950">
              <p className="flex items-center gap-2 font-medium text-violet-900">
                <Activity className="h-4 w-4 shrink-0" aria-hidden />
                Leitura dos dados
              </p>
              <p className="mt-2 text-xs text-violet-900/90">{insight}</p>
            </div>
          )}

          <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
            <p className="text-sm font-medium text-zinc-900">
              Hidratos e insulina rápida por dia
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              Barras = gramas de HC · Linha = UI rápidas
            </p>
            <div className="mt-4 h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartMain} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                  <CartesianGrid
                    stroke="rgba(15, 23, 42, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(15, 23, 42, 0.12)" }}
                    interval="preserveStartEnd"
                    minTickGap={8}
                  />
                  <YAxis
                    yAxisId="left"
                    width={36}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "g HC",
                      angle: -90,
                      position: "insideLeft",
                      fill: "#94a3b8",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    width={36}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "UI",
                      angle: 90,
                      position: "insideRight",
                      fill: "#94a3b8",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid rgba(15, 23, 42, 0.12)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar
                    yAxisId="left"
                    dataKey="carbs"
                    name="HC (g)"
                    fill="#34d399"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rapid"
                    name="Rápida (UI)"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
            <p className="text-sm font-medium text-zinc-900">
              Gramas por UI implícitas por dia
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              HC do dia ÷ UI rápida do dia (só dias com insulina rápida registada)
            </p>
            <div className="mt-4 h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartImplied}
                  margin={{ top: 8, right: 8, left: -12, bottom: 4 }}
                >
                  <CartesianGrid
                    stroke="rgba(15, 23, 42, 0.08)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: "#64748b", fontSize: 9 }}
                    tickLine={false}
                    axisLine={{ stroke: "rgba(15, 23, 42, 0.12)" }}
                    interval="preserveStartEnd"
                    minTickGap={8}
                  />
                  <YAxis
                    width={40}
                    tick={{ fill: "#64748b", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid rgba(15, 23, 42, 0.12)",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  {data.profileGramsPerUnit != null && (
                    <ReferenceLine
                      y={data.profileGramsPerUnit}
                      stroke="#7c3aed"
                      strokeDasharray="6 4"
                      label={{
                        value: `Regra ${data.profileGramsPerUnit}`,
                        fill: "#6d28d9",
                        fontSize: 10,
                        position: "insideTopRight",
                      }}
                    />
                  )}
                  <Line
                    type="monotone"
                    dataKey="implied"
                    name="g/UI implícito"
                    stroke="#0d9488"
                    strokeWidth={2}
                    connectNulls={false}
                    dot={{ r: 3, fill: "#0d9488" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="text-[11px] leading-relaxed text-zinc-400">
            Limitações: não separa bolus de correção, ignora basal, depende de
            registos completos de HC e insulina, e não substitui ajuste clínico
            nem a Libre.
          </p>
    </>
  );
}

function LinkBack() {
  return (
    <Link
      href="/graficos"
      className="inline-flex text-sm text-zinc-500 transition hover:text-accent"
    >
      ← Gráficos
    </Link>
  );
}

function slotInsight(stat: SlotIcrStat, rule: number | null): string | null {
  if (stat.medianImpliedG === null || stat.sampleCount < 3) return null;
  if (rule === null) {
    return `Mediana de ${stat.medianImpliedG} g/UI ao ${stat.label.toLowerCase()} (${stat.sampleCount} refeições). Define a regra em Definições para comparação automática.`;
  }
  const diff = stat.diffPctVsRule ?? 0;
  if (Math.abs(diff) < 10) {
    return `${stat.label}: mediana ${stat.medianImpliedG} g/UI ≈ regra (${rule} g/UI).`;
  }
  if (stat.medianImpliedG > rule) {
    return `${stat.label}: a mediana é ${stat.medianImpliedG} g/UI (${diff > 0 ? "+" : ""}${diff}% vs regra). Há menos UI por grama do que a regra implica — pode indicar que neste momento do dia há mais sensibilidade à insulina. Conversa com a equipa clínica.`;
  }
  return `${stat.label}: a mediana é ${stat.medianImpliedG} g/UI (${diff}% vs regra). Há mais UI por grama do que a regra implica — pode indicar que neste momento do dia há mais resistência à insulina. Conversa com a equipa clínica.`;
}

function SlotIcrSection({
  perSlot,
  rule,
}: {
  perSlot: SlotIcrStat[];
  rule: number | null;
}) {
  if (perSlot.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <p className="text-sm font-medium text-zinc-900">
          Análise por momento do dia
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Ainda não há refeições estruturadas (com HC e insulina rápida)
          suficientes para separar por slot.
        </p>
      </div>
    );
  }

  const insights = perSlot
    .map((s) => slotInsight(s, rule))
    .filter((s): s is string => s !== null);

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
      <p className="text-sm font-medium text-zinc-900">
        Análise por momento do dia
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Mediana de g/UI por slot, baseada apenas em refeições com HC e insulina
        rápida registadas.
      </p>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-zinc-500">
              <th className="py-1 pr-2 font-medium">Slot</th>
              <th className="py-1 px-2 text-right font-medium">Refeições</th>
              <th className="py-1 px-2 text-right font-medium">Mediana</th>
              <th className="py-1 px-2 text-right font-medium">P25–P75</th>
              <th className="py-1 pl-2 text-right font-medium">vs regra</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {perSlot.map((s) => {
              const diff = s.diffPctVsRule;
              const diffClass =
                diff === null
                  ? "text-zinc-500"
                  : Math.abs(diff) < 10
                    ? "text-emerald-700"
                    : diff > 0
                      ? "text-sky-700"
                      : "text-amber-700";
              return (
                <tr key={s.slot} className="tabular-nums text-zinc-800">
                  <td className="py-2 pr-2 font-medium text-zinc-900">
                    {s.label}
                  </td>
                  <td className="py-2 px-2 text-right text-zinc-700">
                    {s.sampleCount}
                  </td>
                  <td className="py-2 px-2 text-right font-semibold">
                    {s.medianImpliedG != null
                      ? `${s.medianImpliedG} g/UI`
                      : "—"}
                  </td>
                  <td className="py-2 px-2 text-right text-zinc-600">
                    {s.p25 != null && s.p75 != null
                      ? `${s.p25} – ${s.p75}`
                      : "—"}
                  </td>
                  <td className={`py-2 pl-2 text-right ${diffClass}`}>
                    {diff === null
                      ? "—"
                      : `${diff > 0 ? "+" : ""}${diff}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {insights.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-zinc-700">
          {insights.map((t, i) => (
            <li
              key={i}
              className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-2.5 py-1.5"
            >
              {t}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-zinc-400">
        Informação de referência — não substitui ajuste clínico. Slots com
        poucas amostras (&lt; 3) não geram comentário automático.
      </p>
    </div>
  );
}
