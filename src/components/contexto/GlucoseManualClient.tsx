"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAppUserId, tryAppUserId } from "@/lib/app-user";
import {
  datetimeLocalToIso,
  loggedOnFromDatetimeLocal,
  toDatetimeLocalValue,
} from "@/lib/datetime-local";
import type { GlucoseManualSource, GlucoseManualUnit } from "@/types/database";
import { ChevronLeft, Gauge, Trash2 } from "lucide-react";

const SOURCES: { value: GlucoseManualSource; label: string }[] = [
  { value: "fingerstick", label: "Tira / medidor" },
  { value: "lab", label: "Laboratório" },
  { value: "other", label: "Outro" },
];

function unitLabel(u: GlucoseManualUnit) {
  return u === "mg_dl" ? "mg/dL" : "mmol/L";
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GlucoseManualClient() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [whenLocal, setWhenLocal] = useState(() =>
    toDatetimeLocalValue(new Date())
  );
  const [valueStr, setValueStr] = useState("");
  const [unit, setUnit] = useState<GlucoseManualUnit>("mg_dl");
  const [source, setSource] = useState<GlucoseManualSource>("fingerstick");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<
    {
      id: string;
      measured_at: string;
      value: number;
      unit: GlucoseManualUnit;
      source: GlucoseManualSource;
      note: string | null;
    }[]
  >([]);

  const refresh = useCallback(async () => {
    setMsg(null);
    const userId = tryAppUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("glucose_manual_entries")
      .select("id, measured_at, value, unit, source, note")
      .eq("user_id", userId)
      .order("measured_at", { ascending: false })
      .limit(40);

    if (error) {
      setMsg(
        error.message.includes("glucose_manual_entries")
          ? "Corre a migração 008_clinical_context no Supabase (tabela glucose_manual_entries)."
          : error.message
      );
      setRows([]);
    } else {
      setRows((data ?? []) as typeof rows);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const v = parseFloat(valueStr.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      setMsg("Indica um valor de glicemia válido (> 0).");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setMsg("Sem rede — este registo precisa de ligação.");
      return;
    }

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setMsg("Configura NEXT_PUBLIC_GLIERICA_USER_ID no .env.local.");
      return;
    }

    const measuredAt = datetimeLocalToIso(whenLocal);
    const loggedOn = loggedOnFromDatetimeLocal(whenLocal);

    setSaving(true);
    const { error } = await supabase.from("glucose_manual_entries").insert({
      user_id: userId,
      logged_on: loggedOn,
      measured_at: measuredAt,
      value: Math.round(v * 100) / 100,
      unit,
      source,
      note: note.trim() === "" ? null : note.trim(),
    });
    setSaving(false);

    if (error) {
      setMsg(
        error.message.includes("glucose_manual_entries")
          ? "Migração 008 em falta ou tabela inacessível."
          : error.message
      );
      return;
    }

    setValueStr("");
    setNote("");
    setWhenLocal(toDatetimeLocalValue(new Date()));
    void refresh();
  }

  async function remove(id: string) {
    setMsg(null);
    const { error } = await supabase
      .from("glucose_manual_entries")
      .delete()
      .eq("id", id);
    if (error) setMsg(error.message);
    else void refresh();
  }

  if (!tryAppUserId()) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Configura o UUID da app para usar este ecrã.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/contexto"
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Contexto clínico
      </Link>

      <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <Gauge className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">
              Nova leitura manual
            </p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Fora do Libre — tira, laboratório, etc.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="gm-when"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Data e hora
            </label>
            <input
              id="gm-when"
              type="datetime-local"
              value={whenLocal}
              onChange={(e) => setWhenLocal(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[7rem] flex-1">
              <label
                htmlFor="gm-value"
                className="mb-1 block text-[11px] font-medium text-zinc-500"
              >
                Valor
              </label>
              <input
                id="gm-value"
                inputMode="decimal"
                placeholder={unit === "mg_dl" ? "ex: 120" : "ex: 6,7"}
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
              />
            </div>
            <div className="w-full sm:w-auto">
              <span className="mb-1 block text-[11px] font-medium text-zinc-500">
                Unidade
              </span>
              <div className="flex gap-2">
                {(
                  [
                    ["mg_dl", "mg/dL"],
                    ["mmol_l", "mmol/L"],
                  ] as const
                ).map(([u, label]) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUnit(u)}
                    className={`rounded-xl border px-3 py-2 text-xs font-medium transition ${
                      unit === u
                        ? "border-rose-300 bg-rose-50 text-rose-900"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-medium text-zinc-500">
              Origem
            </span>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(({ value: sv, label }) => (
                <button
                  key={sv}
                  type="button"
                  onClick={() => setSource(sv)}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                    source === sv
                      ? "border-rose-300 bg-rose-50 text-rose-900"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="gm-note"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Nota (opcional)
            </label>
            <input
              id="gm-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "A guardar…" : "Guardar leitura"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <p className="text-sm font-medium text-zinc-900">Últimas leituras</p>
        <p className="mt-0.5 text-xs text-zinc-500">Até 40 registos recentes.</p>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">A carregar…</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Ainda não há leituras manuais.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-2 py-2.5 first:pt-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold tabular-nums text-zinc-900">
                    {r.value} {unitLabel(r.unit)}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatWhen(r.measured_at)} ·{" "}
                    {SOURCES.find((s) => s.value === r.source)?.label ?? r.source}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(r.id)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                  aria-label="Apagar leitura"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {msg && (
        <p className="text-xs text-red-600" role="alert">
          {msg}
        </p>
      )}

      <p className="text-[10px] leading-relaxed text-zinc-400">
        Não substitui ajustes médicos. Usa as mesmas unidades que na consulta para
        comparar com o Libre.
      </p>
    </div>
  );
}
