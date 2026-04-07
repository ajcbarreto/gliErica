"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAppUserId, tryAppUserId } from "@/lib/app-user";
import { getLocalDateKey } from "@/lib/date";
import type { InsulinKind } from "@/types/database";
import { Syringe, Undo2 } from "lucide-react";

const QUICK_UNITS = [2, 4, 6, 8] as const;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kindLabelPt(k: InsulinKind) {
  return k === "rapid" ? "Rápida" : "Basal";
}

/** Sugestão orientativa: UI rápida ≈ HC do dia / gramas por UI. */
function suggestedRapidUnits(carbsDay: number, gramsPerUnit: number): number {
  if (gramsPerUnit <= 0 || carbsDay <= 0) return 0;
  return Math.round((carbsDay / gramsPerUnit) * 10) / 10;
}

function comparisonHint(
  rapidTotal: number,
  suggested: number,
  carbsDay: number
): string | null {
  if (suggested <= 0 || carbsDay <= 0) return null;
  const ratio = rapidTotal / suggested;
  if (ratio < 0.75) {
    return "Registaste menos insulina rápida do que a tua regra sugeriria para os HC de hoje. Se a glicemia subiu, fala com a equipa de saúde — isto não substitui aconselhamento médico.";
  }
  if (ratio > 1.25) {
    return "Registaste mais insulina rápida do que a regra sugeriria para os HC de hoje. Atenção a hipoglicemias — orientação apenas, não é prescrição.";
  }
  return "A insulina rápida registada está próxima do indicado pela tua regra e dos HC de hoje (só para reflexão).";
}

export function DashboardInsulinSection() {
  const supabase = createClient();
  const [kind, setKind] = useState<InsulinKind>("rapid");
  const [rapidSum, setRapidSum] = useState(0);
  const [basalSum, setBasalSum] = useState(0);
  const [carbsDay, setCarbsDay] = useState(0);
  const [gramsPerUnit, setGramsPerUnit] = useState<number | null>(null);
  const [entries, setEntries] = useState<
    { id: string; units: number; kind: InsulinKind; created_at: string }[]
  >([]);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [customUnits, setCustomUnits] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setMsg(null);
    const userId = tryAppUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    const day = getLocalDateKey();

    const [
      { data: profile },
      { data: insulinRows },
      { data: carbRows },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select("insulin_carb_grams_per_unit")
        .eq("id", userId)
        .maybeSingle(),
      supabase
        .from("insulin_entries")
        .select("id, units, kind, created_at")
        .eq("user_id", userId)
        .eq("logged_on", day)
        .order("created_at", { ascending: false }),
      supabase
        .from("carb_entries")
        .select("grams_carbs")
        .eq("user_id", userId)
        .eq("logged_on", day),
    ]);

    const g = profile?.insulin_carb_grams_per_unit;
    setGramsPerUnit(typeof g === "number" && g > 0 ? g : null);

    const list = (insulinRows ?? []) as {
      id: string;
      units: number;
      kind: InsulinKind;
      created_at: string;
    }[];

    let r = 0;
    let b = 0;
    for (const row of list) {
      const u = Number(row.units);
      if (row.kind === "basal") b += u;
      else r += u;
    }
    setRapidSum(Math.round(r * 10) / 10);
    setBasalSum(Math.round(b * 10) / 10);
    setEntries(list.slice(0, 8));
    setLastEntryId(list[0]?.id ?? null);

    const carbSum = (carbRows ?? []).reduce(
      (acc, row) => acc + Number(row.grams_carbs),
      0
    );
    setCarbsDay(Math.round(carbSum * 10) / 10);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => void refresh(), 90_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function addUnits(units: number) {
    if (units <= 0) return;
    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setMsg("Configura o UUID da app.");
      return;
    }

    setAdding(true);
    setMsg(null);
    const { error } = await supabase.from("insulin_entries").insert({
      user_id: userId,
      logged_on: getLocalDateKey(),
      units,
      kind,
      note: null,
    });
    setAdding(false);

    if (error) {
      setMsg(
        error.message.includes("insulin_entries")
          ? "Corre a migração SQL 005_insulin no Supabase."
          : error.message
      );
      return;
    }
    void refresh();
  }

  async function undoLast() {
    if (!lastEntryId) return;
    setAdding(true);
    setMsg(null);
    const { error } = await supabase
      .from("insulin_entries")
      .delete()
      .eq("id", lastEntryId);
    setAdding(false);
    if (error) setMsg(error.message);
    else void refresh();
  }

  function submitCustom(e: React.FormEvent) {
    e.preventDefault();
    const v = parseFloat(customUnits.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      setMsg("Indica unidades válidas (> 0).");
      return;
    }
    setCustomUnits("");
    void addUnits(Math.round(v * 10) / 10);
  }

  if (!tryAppUserId()) {
    return null;
  }

  const suggested =
    gramsPerUnit && carbsDay > 0
      ? suggestedRapidUnits(carbsDay, gramsPerUnit)
      : null;
  const hint =
    suggested && suggested > 0
      ? comparisonHint(rapidSum, suggested, carbsDay)
      : null;

  return (
    <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
          <Syringe className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500">Insulina hoje</p>
          {loading ? (
            <p className="mt-1 text-sm text-zinc-500">A carregar…</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-zinc-700">
                <span className="font-semibold tabular-nums text-zinc-900">
                  {rapidSum} UI
                </span>{" "}
                rápida
                <span className="mx-1.5 text-zinc-400">·</span>
                <span className="font-semibold tabular-nums text-zinc-900">
                  {basalSum} UI
                </span>{" "}
                basal
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Hidratos registados hoje:{" "}
                <span className="font-medium text-zinc-700">{carbsDay} g</span>
                {gramsPerUnit && carbsDay > 0 && suggested && suggested > 0 ? (
                  <>
                    {" "}
                    · regra ~{gramsPerUnit} g / UI →{" "}
                    <span className="font-medium text-zinc-700">
                      ~{suggested} UI
                    </span>{" "}
                    rápida (orientativo)
                  </>
                ) : gramsPerUnit ? null : (
                  <> · define a regra em Definições para ver sugestão</>
                )}
              </p>
              {hint && (
                <p className="mt-2 rounded-lg bg-zinc-50 px-2.5 py-2 text-[11px] leading-relaxed text-zinc-600">
                  {hint}
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {!loading && (
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <span className="w-full text-[11px] font-medium text-zinc-500">
              Tipo
            </span>
            {(
              [
                ["rapid", "Rápida (refeição / correção)"],
                ["basal", "Basal"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
                  kind === k
                    ? "border-violet-300 bg-violet-50 text-violet-900"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {QUICK_UNITS.map((u) => (
              <button
                key={u}
                type="button"
                disabled={adding}
                onClick={() => void addUnits(u)}
                className="rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-xs font-medium text-zinc-900 transition hover:bg-zinc-100 disabled:opacity-50"
              >
                +{u} UI
              </button>
            ))}
            <button
              type="button"
              disabled={adding || !lastEntryId}
              onClick={() => void undoLast()}
              className="inline-flex items-center gap-1 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 transition hover:bg-zinc-50 hover:text-zinc-900 disabled:opacity-40"
              title="Remove o último registo de hoje"
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Anular último
            </button>
          </div>

          <form
            onSubmit={(e) => void submitCustom(e)}
            className="flex flex-wrap items-end gap-2"
          >
            <div className="min-w-0 flex-1">
              <label
                htmlFor="insulin-custom"
                className="mb-1 block text-[11px] font-medium text-zinc-500"
              >
                Outro valor (UI)
              </label>
              <input
                id="insulin-custom"
                inputMode="decimal"
                placeholder="ex: 3,5"
                value={customUnits}
                onChange={(e) => setCustomUnits(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
            >
              Adicionar
            </button>
          </form>

          {entries.length > 0 && (
            <ul className="space-y-1 border-t border-zinc-100 pt-2 text-[11px] text-zinc-500">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex justify-between gap-2 tabular-nums"
                >
                  <span>
                    {formatTime(e.created_at)} · {kindLabelPt(e.kind)}
                  </span>
                  <span className="font-medium text-zinc-700">{e.units} UI</span>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[10px] leading-relaxed text-zinc-400">
            Informação não substitui ajustes médicos. Usa a curva Libre e sintomas
            em conjunto com a equipa de saúde.
          </p>

          {msg && (
            <p className="text-xs text-red-600" role="alert">
              {msg}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
