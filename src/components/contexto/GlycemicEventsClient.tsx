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
import type { GlycemicEventKind, GlucoseManualUnit } from "@/types/database";
import { AlertTriangle, ChevronLeft, Trash2, TrendingUp } from "lucide-react";

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

export function GlycemicEventsClient() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [whenLocal, setWhenLocal] = useState(() =>
    toDatetimeLocalValue(new Date())
  );
  const [kind, setKind] = useState<GlycemicEventKind>("hypo");
  const [glucoseStr, setGlucoseStr] = useState("");
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseManualUnit | "">("");
  const [carbsStr, setCarbsStr] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<
    {
      id: string;
      occurred_at: string;
      kind: GlycemicEventKind;
      glucose_value: number | null;
      glucose_unit: GlucoseManualUnit | null;
      carbs_treatment_g: number | null;
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
      .from("glycemic_events")
      .select(
        "id, occurred_at, kind, glucose_value, glucose_unit, carbs_treatment_g, note"
      )
      .eq("user_id", userId)
      .order("occurred_at", { ascending: false })
      .limit(40);

    if (error) {
      setMsg(
        error.message.includes("glycemic_events")
          ? "Corre a migração 008_clinical_context (tabela glycemic_events)."
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

  useEffect(() => {
    if (kind === "hyper") setCarbsStr("");
  }, [kind]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    let glucoseVal: number | null = null;
    const gTrim = glucoseStr.trim();
    if (gTrim !== "") {
      const g = parseFloat(gTrim.replace(",", "."));
      if (Number.isNaN(g) || g <= 0) {
        setMsg("Valor de glicemia inválido ou deixa vazio.");
        return;
      }
      glucoseVal = Math.round(g * 100) / 100;
      if (!glucoseUnit) {
        setMsg("Escolhe a unidade da glicemia ou limpa o valor.");
        return;
      }
    } else if (glucoseUnit) {
      setMsg("Indica o valor de glicemia ou limpa a unidade.");
      return;
    }

    let carbsTreatment: number | null = null;
    const cTrim = carbsStr.trim();
    if (cTrim !== "") {
      const c = parseFloat(cTrim.replace(",", "."));
      if (Number.isNaN(c) || c < 0) {
        setMsg("HC de tratamento inválido (≥ 0).");
        return;
      }
      carbsTreatment = Math.round(c * 10) / 10;
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

    const occurredAt = datetimeLocalToIso(whenLocal);
    const loggedOn = loggedOnFromDatetimeLocal(whenLocal);

    setSaving(true);
    const { error } = await supabase.from("glycemic_events").insert({
      user_id: userId,
      logged_on: loggedOn,
      occurred_at: occurredAt,
      kind,
      glucose_value: glucoseVal,
      glucose_unit: glucoseVal != null ? glucoseUnit : null,
      carbs_treatment_g: carbsTreatment,
      note: note.trim() === "" ? null : note.trim(),
    });
    setSaving(false);

    if (error) {
      setMsg(
        error.message.includes("glycemic_events")
          ? "Migração 008 em falta ou tabela inacessível."
          : error.message
      );
      return;
    }

    setGlucoseStr("");
    setGlucoseUnit("");
    setCarbsStr("");
    setNote("");
    setWhenLocal(toDatetimeLocalValue(new Date()));
    void refresh();
  }

  async function remove(id: string) {
    setMsg(null);
    const { error } = await supabase.from("glycemic_events").delete().eq("id", id);
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
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <AlertTriangle className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">Novo episódio</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Hipoglicemia ou hiperglicemia — útil para relatórios e consultas.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="ge-when"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Data e hora
            </label>
            <input
              id="ge-when"
              type="datetime-local"
              value={whenLocal}
              onChange={(e) => setWhenLocal(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-medium text-zinc-500">
              Tipo
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setKind("hypo")}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  kind === "hypo"
                    ? "border-amber-400 bg-amber-50 text-amber-950"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                Hipoglicemia
              </button>
              <button
                type="button"
                onClick={() => setKind("hyper")}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition ${
                  kind === "hyper"
                    ? "border-orange-400 bg-orange-50 text-orange-950"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                }`}
              >
                <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                Hiperglicemia
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="min-w-[6rem] flex-1">
              <label
                htmlFor="ge-glucose"
                className="mb-1 block text-[11px] font-medium text-zinc-500"
              >
                Glicemia (opcional)
              </label>
              <input
                id="ge-glucose"
                inputMode="decimal"
                placeholder="—"
                value={glucoseStr}
                onChange={(e) => setGlucoseStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
              />
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-medium text-zinc-500">
                Unidade
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setGlucoseUnit("mg_dl")}
                  className={`rounded-xl border px-2.5 py-2 text-xs font-medium ${
                    glucoseUnit === "mg_dl"
                      ? "border-zinc-400 bg-zinc-100 text-zinc-900"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600"
                  }`}
                >
                  mg/dL
                </button>
                <button
                  type="button"
                  onClick={() => setGlucoseUnit("mmol_l")}
                  className={`rounded-xl border px-2.5 py-2 text-xs font-medium ${
                    glucoseUnit === "mmol_l"
                      ? "border-zinc-400 bg-zinc-100 text-zinc-900"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600"
                  }`}
                >
                  mmol/L
                </button>
              </div>
            </div>
          </div>
          {kind === "hypo" && (
            <div>
              <label
                htmlFor="ge-carbs"
                className="mb-1 block text-[11px] font-medium text-zinc-500"
              >
                HC de recuperação (g), opcional
              </label>
              <input
                id="ge-carbs"
                inputMode="decimal"
                placeholder="ex: 15"
                value={carbsStr}
                onChange={(e) => setCarbsStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
              />
            </div>
          )}
          <div>
            <label
              htmlFor="ge-note"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Nota (opcional)
            </label>
            <input
              id="ge-note"
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
            {saving ? "A guardar…" : "Guardar episódio"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <p className="text-sm font-medium text-zinc-900">Histórico recente</p>
        <p className="mt-0.5 text-xs text-zinc-500">Até 40 episódios.</p>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">A carregar…</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Sem episódios registados.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-2 py-2.5 first:pt-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {r.kind === "hypo" ? "Hipo" : "Hiper"}
                    {r.glucose_value != null && r.glucose_unit
                      ? ` · ${r.glucose_value} ${unitLabel(r.glucose_unit)}`
                      : ""}
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatWhen(r.occurred_at)}
                    {r.carbs_treatment_g != null && r.kind === "hypo"
                      ? ` · ${r.carbs_treatment_g} g HC`
                      : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(r.id)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                  aria-label="Apagar episódio"
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
    </div>
  );
}
