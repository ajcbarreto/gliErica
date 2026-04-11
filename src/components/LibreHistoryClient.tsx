"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

type RangeKey = "24h" | "7d" | "14d";

const RANGE_MS: Record<RangeKey, number> = {
  "24h": 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "14d": 14 * 24 * 60 * 60 * 1000,
};

type Row = { t: number; mgDl: number };

export function LibreHistoryClient() {
  const supabase = useMemo(() => createClient(), []);
  const { userId, loading: authLoading } = useAuthUser();
  const [range, setRange] = useState<RangeKey>("7d");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setRows([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const since = new Date(Date.now() - RANGE_MS[range]).toISOString();
    const { data, error: qErr } = await supabase
      .from("libre_glucose_readings")
      .select("measured_at, value_mg_dl")
      .eq("user_id", userId)
      .gte("measured_at", since)
      .order("measured_at", { ascending: true })
      .limit(50_000);

    setLoading(false);
    if (qErr) {
      setError(qErr.message);
      setRows([]);
      return;
    }
    const list = (data ?? []) as { measured_at: string; value_mg_dl: number }[];
    setRows(
      list.map((r) => ({
        t: new Date(r.measured_at).getTime(),
        mgDl: Number(r.value_mg_dl),
      }))
    );
  }, [supabase, userId, range]);

  useEffect(() => {
    void load();
  }, [load]);

  const chartData = useMemo(
    () => rows.map((r) => ({ t: r.t, glucose: r.mgDl })),
    [rows]
  );

  if (authLoading) {
    return (
      <p className="text-sm text-zinc-500">A carregar sessão…</p>
    );
  }

  if (!userId) {
    return (
      <p className="text-sm text-zinc-600">
        Inicia sessão para ver o histórico de glicemia guardado a partir das
        sincronizações Libre.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
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
            Libre
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Histórico de glicemia
          </h1>
          <p className="text-sm text-zinc-600">
            Pontos guardados quando sincronizas o sensor (sessão iniciada). Eixo
            em mg/dL.
          </p>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["24h", "24h"],
            ["7d", "7d"],
            ["14d", "14d"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setRange(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
              range === key
                ? "bg-accent text-white"
                : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
            }`}
          >
            {label === "24h" ? "24 h" : label === "7d" ? "7 dias" : "14 dias"}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar curva…</p>
      ) : chartData.length < 2 ? (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-surface/50 p-6 text-center">
          <p className="text-sm text-zinc-600">
            Ainda não há pontos suficientes neste intervalo. Abre o dashboard
            com sessão iniciada para sincronizar o Libre — os valores passam a
            ser guardados automaticamente.
          </p>
        </div>
      ) : (
        <div className="h-[320px] w-full rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis
                dataKey="t"
                type="number"
                domain={["dataMin", "dataMax"]}
                tickFormatter={(v) =>
                  new Date(v).toLocaleString("pt-PT", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }
                minTickGap={28}
                tick={{ fontSize: 10, fill: "#71717a" }}
              />
              <YAxis
                domain={["auto", "auto"]}
                width={44}
                tick={{ fontSize: 10, fill: "#71717a" }}
                label={{
                  value: "mg/dL",
                  angle: -90,
                  position: "insideLeft",
                  style: { fill: "#71717a", fontSize: 10 },
                }}
              />
              <Tooltip
                formatter={(v) => [
                  typeof v === "number" ? `${Math.round(v)} mg/dL` : "—",
                  "Glicemia",
                ]}
                labelFormatter={(t) =>
                  typeof t === "number"
                    ? new Date(t).toLocaleString("pt-PT")
                    : ""
                }
              />
              <Line
                type="monotone"
                dataKey="glucose"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
