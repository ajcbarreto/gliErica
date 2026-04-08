"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAppUserId, tryAppUserId } from "@/lib/app-user";
import { getLocalDateKey } from "@/lib/date";
import { MEAL_SLOTS, mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";
import type { MealLog } from "@/types/database";
import { CalendarDays, Trash2 } from "lucide-react";

function formatDayPt(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatTimePt(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MealJournalClient() {
  const supabase = createClient();
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [slot, setSlot] = useState<MealSlot>("breakfast");
  const [loggedOn, setLoggedOn] = useState(() => getLocalDateKey());
  const [gramsStr, setGramsStr] = useState("");
  const [insulinStr, setInsulinStr] = useState("");
  const [note, setNote] = useState("");

  const load = useCallback(async () => {
    const userId = tryAppUserId();
    if (!userId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    setLoading(false);
    if (error) {
      setLogs([]);
      return;
    }
    setLogs((data ?? []) as MealLog[]);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const gRaw = gramsStr.trim();
    const iRaw = insulinStr.trim();
    const carbsParsed = parseFloat(gRaw.replace(",", "."));
    const carbs =
      gRaw === "" ? 0 : Math.round(carbsParsed * 10) / 10;

    let insulin: number | null = null;
    if (iRaw !== "") {
      const iu = Math.round(parseFloat(iRaw.replace(",", ".")) * 10) / 10;
      if (Number.isNaN(iu) || iu <= 0) {
        setFormError("Unidades de insulina inválidas.");
        return;
      }
      insulin = iu;
    }

    if (gRaw !== "" && (Number.isNaN(carbsParsed) || carbs < 0)) {
      setFormError("Gramas de HC inválidas.");
      return;
    }
    if (carbs <= 0 && insulin == null) {
      setFormError("Indica hidratos (g) ou insulina rápida (UI), ou ambos.");
      return;
    }

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setFormError("Configura NEXT_PUBLIC_GLIERICA_USER_ID no .env.local.");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setFormError("Sem rede — o registo de refeições precisa de ligação.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.rpc("create_meal_log_with_entries", {
      p_user_id: userId,
      p_logged_on: loggedOn,
      p_meal_slot: slot,
      p_grams_carbs: carbs,
      p_rapid_insulin_units: insulin,
      p_note: note.trim() === "" ? null : note.trim(),
    });
    setSaving(false);

    if (error) {
      setFormError(
        error.message.includes("create_meal_log_with_entries") ||
          error.message.includes("meal_logs")
          ? "Corre a migração 007_meal_logs.sql no Supabase (tabela meal_logs e função)."
          : error.message
      );
      return;
    }

    setGramsStr("");
    setInsulinStr("");
    setNote("");
    void load();
  }

  async function removeLog(id: string) {
    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      return;
    }
    setDeletingId(id);
    const { error } = await supabase
      .from("meal_logs")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    setDeletingId(null);
    if (!error) void load();
  }

  if (!tryAppUserId()) {
    return (
      <p className="text-sm text-zinc-600">
        Configura o UUID da app para veres e registares refeições.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
      >
        <h2 className="text-sm font-semibold text-zinc-900">
          Novo registo
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Fica guardado aqui e entra nos totais de HC e insulina do dia
          (biblioteca e dashboard).
        </p>

        <div className="mt-4 grid gap-3">
          <div>
            <label
              htmlFor="meal-slot"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Refeição
            </label>
            <select
              id="meal-slot"
              value={slot}
              onChange={(e) => setSlot(e.target.value as MealSlot)}
              className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            >
              {MEAL_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {mealSlotLabelPt(s)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="meal-day"
              className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-500"
            >
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              Dia
            </label>
            <input
              id="meal-day"
              type="date"
              value={loggedOn}
              onChange={(e) => setLoggedOn(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label
                htmlFor="meal-carbs"
                className="mb-1 block text-[11px] font-medium text-zinc-500"
              >
                Hidratos (g)
              </label>
              <input
                id="meal-carbs"
                inputMode="decimal"
                placeholder="ex: 45"
                value={gramsStr}
                onChange={(e) => setGramsStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
              />
            </div>
            <div>
              <label
                htmlFor="meal-insulin"
                className="mb-1 block text-[11px] font-medium text-zinc-500"
              >
                Insulina rápida (UI)
              </label>
              <input
                id="meal-insulin"
                inputMode="decimal"
                placeholder="opcional"
                value={insulinStr}
                onChange={(e) => setInsulinStr(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="meal-note"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              O que comeste (opcional)
            </label>
            <textarea
              id="meal-note"
              rows={2}
              placeholder="ex: pão integral com queijo e maçã"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full resize-none rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
          </div>
        </div>

        {formError && (
          <p className="mt-3 text-xs text-red-600" role="alert">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition active:scale-[0.99] disabled:opacity-50"
        >
          {saving ? "A guardar…" : "Guardar refeição"}
        </button>
      </form>

      <section>
        <h2 className="text-sm font-semibold text-zinc-900">
          Refeições anteriores
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          Apagar remove também o HC e a insulina ligados a este registo.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">A carregar…</p>
        ) : logs.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-500">
            Ainda não há registos. Usa o formulário acima.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {logs.map((row, i) => {
              const prev = logs[i - 1];
              const showDayHeader =
                i === 0 || row.logged_on !== prev?.logged_on;
              return (
                <li key={row.id} className="space-y-2">
                  {showDayHeader && (
                    <p className="pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 first:pt-0">
                      {formatDayPt(row.logged_on)}
                    </p>
                  )}
                  <div className="flex gap-3 rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {mealSlotLabelPt(row.meal_slot as MealSlot)}
                        <span className="ml-2 font-normal tabular-nums text-zinc-500">
                          {formatTimePt(row.created_at)}
                        </span>
                      </p>
                      <p className="text-sm tabular-nums text-zinc-700">
                        <span className="font-semibold text-zinc-900">
                          {row.grams_carbs} g
                        </span>
                        {" · HC"}
                        {row.rapid_insulin_units != null && (
                          <>
                            <span className="mx-1 text-zinc-300">·</span>
                            <span className="font-semibold text-violet-800">
                              {row.rapid_insulin_units} UI
                            </span>
                            {" rápida"}
                          </>
                        )}
                      </p>
                      {row.note && (
                        <p className="text-xs leading-relaxed text-zinc-600">
                          {row.note}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      title="Apagar registo"
                      disabled={deletingId === row.id}
                      onClick={() => void removeLog(row.id)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
