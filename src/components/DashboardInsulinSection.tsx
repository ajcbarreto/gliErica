"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getLocalDateKey } from "@/lib/date";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import { computeCorrectionDose } from "@/lib/insulin-calc";
import type { InsulinKind } from "@/types/database";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Syringe, Undo2 } from "lucide-react";

const QUICK_UNITS = [2, 4, 6, 8] as const;

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function kindLabelPt(k: InsulinKind) {
  if (k === "rapid") return "Rápida";
  if (k === "correction") return "Correção";
  return "Basal";
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

type DashboardInsulinSectionProps = {
  /** Dentro do painel “+” (sem cartão duplo) */
  embedded?: boolean;
  onAfterChange?: () => void;
};

export function DashboardInsulinSection({
  embedded = false,
  onAfterChange,
}: DashboardInsulinSectionProps) {
  const supabase = createClient();
  const { userId, loading: authLoading } = useAuthUser();
  const [kind, setKind] = useState<InsulinKind>("rapid");
  /** Bolus de refeição (exclui correções — usado na comparação com HC). */
  const [mealRapidSum, setMealRapidSum] = useState(0);
  const [correctionSum, setCorrectionSum] = useState(0);
  const [basalSum, setBasalSum] = useState(0);
  const [carbsDay, setCarbsDay] = useState(0);
  const [gramsPerUnit, setGramsPerUnit] = useState<number | null>(null);
  const [isfMgDlPerUnit, setIsfMgDlPerUnit] = useState<number | null>(null);
  const [correctionTargetMgDl, setCorrectionTargetMgDl] = useState<
    number | null
  >(null);
  const [currentGlucoseMgDl, setCurrentGlucoseMgDl] = useState<number | null>(
    null
  );
  const [currentGlucoseAt, setCurrentGlucoseAt] = useState<string | null>(null);
  const [entries, setEntries] = useState<
    { id: string; units: number; kind: InsulinKind; created_at: string }[]
  >([]);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [customUnits, setCustomUnits] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<{
    id: string;
    units: number;
    kind: InsulinKind;
    created_at: string;
  } | null>(null);
  const [editUnitsStr, setEditUnitsStr] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setMsg(null);
    if (!userId) {
      setLoading(false);
      return;
    }

    const day = getLocalDateKey();

    const [
      { data: profile },
      { data: insulinRows },
      { data: carbRows },
      { data: glucoseRow },
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "insulin_carb_grams_per_unit, isf_drop_mg_dl_per_unit, correction_target_mg_dl"
        )
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
      supabase
        .from("libre_glucose_readings")
        .select("measured_at, value_mg_dl")
        .eq("user_id", userId)
        .order("measured_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const g = profile?.insulin_carb_grams_per_unit;
    setGramsPerUnit(typeof g === "number" && g > 0 ? g : null);
    const isf = profile?.isf_drop_mg_dl_per_unit;
    setIsfMgDlPerUnit(typeof isf === "number" && isf > 0 ? isf : null);
    const tgt = profile?.correction_target_mg_dl;
    setCorrectionTargetMgDl(typeof tgt === "number" && tgt > 0 ? tgt : null);

    const gv = glucoseRow?.value_mg_dl;
    setCurrentGlucoseMgDl(typeof gv === "number" && gv > 0 ? Number(gv) : null);
    setCurrentGlucoseAt(
      typeof glucoseRow?.measured_at === "string"
        ? glucoseRow.measured_at
        : null
    );

    const list = (insulinRows ?? []) as {
      id: string;
      units: number;
      kind: InsulinKind;
      created_at: string;
    }[];

    let mealRapid = 0;
    let correction = 0;
    let b = 0;
    for (const row of list) {
      const u = Number(row.units);
      if (row.kind === "basal") b += u;
      else if (row.kind === "correction") correction += u;
      else mealRapid += u;
    }
    setMealRapidSum(Math.round(mealRapid * 10) / 10);
    setCorrectionSum(Math.round(correction * 10) / 10);
    setBasalSum(Math.round(b * 10) / 10);
    setEntries(list);
    setLastEntryId(list[0]?.id ?? null);

    const carbSum = (carbRows ?? []).reduce(
      (acc, row) => acc + Number(row.grams_carbs),
      0
    );
    setCarbsDay(Math.round(carbSum * 10) / 10);

    setLoading(false);
  }, [supabase, userId]);

  usePullToRefresh(refresh);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = setInterval(() => void refresh(), 90_000);
    return () => clearInterval(id);
  }, [refresh]);

  async function addUnits(units: number) {
    if (units <= 0) return;
    if (!userId) {
      setMsg("Inicia sessão.");
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
          ? "Corre as migrações SQL 005_insulin e 008_clinical_context no Supabase."
          : error.message
      );
      return;
    }
    void refresh();
    onAfterChange?.();
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
    else {
      void refresh();
      onAfterChange?.();
    }
  }

  function openEdit(e: {
    id: string;
    units: number;
    kind: InsulinKind;
    created_at: string;
  }) {
    setEditRow(e);
    setEditUnitsStr(String(e.units).replace(".", ","));
    setEditOpen(true);
    setEditMsg(null);
    setMsg(null);
  }

  async function saveEdit() {
    if (!userId || !editRow) return;
    const v = parseFloat(editUnitsStr.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      setEditMsg("Indica unidades válidas (> 0).");
      return;
    }
    const rounded = Math.round(v * 10) / 10;
    setEditSaving(true);
    setEditMsg(null);
    const { error } = await supabase
      .from("insulin_entries")
      .update({ units: rounded })
      .eq("id", editRow.id)
      .eq("user_id", userId);
    setEditSaving(false);
    if (error) {
      setEditMsg(error.message);
      return;
    }
    setEditOpen(false);
    setEditRow(null);
    void refresh();
    onAfterChange?.();
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

  if (authLoading) {
    return null;
  }

  if (!userId) {
    return null;
  }

  const suggested =
    gramsPerUnit && carbsDay > 0
      ? suggestedRapidUnits(carbsDay, gramsPerUnit)
      : null;
  const hint =
    suggested && suggested > 0
      ? comparisonHint(mealRapidSum, suggested, carbsDay)
      : null;

  const correctionDose = computeCorrectionDose({
    currentMgDl: currentGlucoseMgDl,
    targetMgDl: correctionTargetMgDl,
    isfMgDlPerUnit,
  });
  const correctionSettingsMissing =
    isfMgDlPerUnit == null || correctionTargetMgDl == null;
  const glucoseStaleMin =
    currentGlucoseAt != null
      ? Math.round((Date.now() - new Date(currentGlucoseAt).getTime()) / 60000)
      : null;

  const shownEntries = embedded ? entries : entries.slice(0, 8);

  const shellClass = embedded
    ? "rounded-xl border border-zinc-100 bg-zinc-50/50 p-3"
    : "rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card";

  return (
    <section className={shellClass}>
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
                  {mealRapidSum} UI
                </span>{" "}
                rápida (refeição)
                <span className="mx-1.5 text-zinc-400">·</span>
                <span className="font-semibold tabular-nums text-zinc-900">
                  {correctionSum} UI
                </span>{" "}
                correção
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
                ["rapid", "Rápida (refeição)"],
                ["correction", "Correção"],
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

          {kind === "correction" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-2.5">
              {correctionSettingsMissing ? (
                <p className="text-[11px] leading-relaxed text-amber-900">
                  Define o <strong>ISF</strong> e o <strong>alvo</strong> em
                  Definições → Correção e sensibilidade para veres a dose
                  sugerida.
                </p>
              ) : currentGlucoseMgDl == null ? (
                <p className="text-[11px] leading-relaxed text-amber-900">
                  Sem leitura Libre recente para calcular a correção. Atualiza o
                  Libre no dashboard ou usa o teu medidor.
                </p>
              ) : correctionDose.deltaAboveTargetMgDl != null &&
                correctionDose.deltaAboveTargetMgDl <= 0 ? (
                <p className="text-[11px] leading-relaxed text-amber-900">
                  Glicemia atual{" "}
                  <span className="font-semibold tabular-nums">
                    {Math.round(currentGlucoseMgDl)} mg/dL
                  </span>{" "}
                  já está no alvo ({correctionTargetMgDl}) ou abaixo — sem
                  correção sugerida.
                </p>
              ) : (
                <>
                  <p className="text-[11px] text-amber-900">
                    Para baixar até{" "}
                    <span className="font-semibold tabular-nums">
                      {correctionTargetMgDl} mg/dL
                    </span>
                    :
                  </p>
                  <p className="mt-0.5 text-amber-950">
                    <span className="text-xl font-semibold tabular-nums text-amber-900">
                      ~{correctionDose.unitsHalf} UI
                    </span>{" "}
                    <span className="text-[11px] text-amber-800">
                      de correção
                    </span>
                  </p>
                  <p className="mt-0.5 text-[11px] tabular-nums text-amber-800">
                    {Math.round(currentGlucoseMgDl)} − {correctionTargetMgDl} ={" "}
                    {correctionDose.deltaAboveTargetMgDl} mg/dL ÷ ISF{" "}
                    {isfMgDlPerUnit} = {correctionDose.units} UI
                    {glucoseStaleMin != null && glucoseStaleMin > 20 && (
                      <span className="text-amber-700">
                        {" "}
                        · leitura tem {glucoseStaleMin} min, confirma
                      </span>
                    )}
                  </p>
                  {correctionDose.unitsHalf != null &&
                    correctionDose.unitsHalf > 0 && (
                      <button
                        type="button"
                        disabled={adding}
                        onClick={() =>
                          void addUnits(correctionDose.unitsHalf!)
                        }
                        className="mt-2 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:opacity-50"
                      >
                        Registar ~{correctionDose.unitsHalf} UI correção
                      </button>
                    )}
                  <p className="mt-1.5 text-[10px] leading-relaxed text-amber-700">
                    Orientação — confirma com a equipa de saúde antes de
                    injetar.
                  </p>
                </>
              )}
            </div>
          )}

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

          {shownEntries.length > 0 && (
            <ul className="space-y-1 border-t border-zinc-100 pt-2 text-[11px] text-zinc-500">
              {shownEntries.map((e) => (
                <li key={e.id} className="tabular-nums">
                  <button
                    type="button"
                    title="Corrigir unidades"
                    onClick={() => openEdit(e)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left transition hover:bg-zinc-100/80"
                  >
                    <span className="min-w-0 truncate">
                      {formatTime(e.created_at)} · {kindLabelPt(e.kind)}
                    </span>
                    <span className="shrink-0 font-medium text-zinc-700">
                      {e.units} UI
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="text-[10px] leading-relaxed text-zinc-400">
            {embedded
              ? "Orientação informativa — não substitui a equipa de saúde."
              : "Informação não substitui ajustes médicos. Usa a curva Libre e sintomas em conjunto com a equipa de saúde."}
          </p>

          {msg && (
            <p className="text-xs text-red-600" role="alert">
              {msg}
            </p>
          )}
        </div>
      )}

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          if (!o) {
            setEditOpen(false);
            setEditMsg(null);
          }
        }}
      >
        <DialogContent className="max-w-[min(calc(100vw-1.5rem),22rem)]">
          <DialogTitle className="text-base">Ajustar unidades</DialogTitle>
          <DialogDescription className="text-xs text-zinc-600">
            {editRow
              ? `${kindLabelPt(editRow.kind)} · ${formatTime(editRow.created_at)}`
              : ""}
          </DialogDescription>
          <div className="mt-2 space-y-2">
            <label
              htmlFor="insulin-edit-units"
              className="text-[11px] font-medium text-zinc-500"
            >
              Unidades (UI)
            </label>
            <input
              id="insulin-edit-units"
              inputMode="decimal"
              value={editUnitsStr}
              onChange={(e) => setEditUnitsStr(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
            {editMsg ? (
              <p className="text-xs text-red-600" role="alert">
                {editMsg}
              </p>
            ) : null}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-100"
                onClick={() => setEditOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={editSaving}
                className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
                onClick={() => void saveEdit()}
              >
                Guardar
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
