"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getAppUserId, tryAppUserId } from "@/lib/app-user";
import {
  formatLocalTimeHm,
  getLocalDateKey,
  localDateAndTimeToUtcIso,
  parseIsoToLocalTimeHm,
} from "@/lib/date";
import { MEAL_SLOTS, mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";
import { carbsFromFoodGrams, roundCarbs } from "@/lib/carb-math";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import type {
  CompositeMeal,
  Food,
  MealLog,
  MealLogItem,
} from "@/types/database";
import {
  CalendarDays,
  ChevronDown,
  Layers,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

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

function normNote(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

type MealLine = {
  key: string;
  foodId: string | null;
  compositeMealId: string | null;
  label: string;
  grams: number;
  carbsLine: number;
};

function lineKey() {
  return crypto.randomUUID();
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
  const [loggedTime, setLoggedTime] = useState(() => formatLocalTimeHm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [gramsStr, setGramsStr] = useState("");
  const [insulinStr, setInsulinStr] = useState("");
  const [note, setNote] = useState("");

  const [lines, setLines] = useState<MealLine[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [composites, setComposites] = useState<CompositeMeal[]>([]);
  const [itemsByComposite, setItemsByComposite] = useState<
    Record<string, { food_id: string; grams: number }[]>
  >({});

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [compositeOpen, setCompositeOpen] = useState(false);

  const [suggestionLogs, setSuggestionLogs] = useState<MealLog[]>([]);
  const [icrGramsPerUnit, setIcrGramsPerUnit] = useState<number | null>(null);

  const foodsById = useMemo(
    () => Object.fromEntries(foods.map((f) => [f.id, f])),
    [foods]
  );

  const totalFromLines = useMemo(
    () => roundCarbs(lines.reduce((s, l) => s + l.carbsLine, 0)),
    [lines]
  );

  const suggestedInsulin =
    icrGramsPerUnit != null &&
    icrGramsPerUnit > 0 &&
    (lines.length > 0 ? totalFromLines : parseFloat(gramsStr.replace(",", ".")) || 0) >
      0
      ? roundCarbs(
          (lines.length > 0
            ? totalFromLines
            : Math.max(
                0,
                Math.round(
                  (parseFloat(gramsStr.replace(",", ".")) || 0) * 10
                ) / 10
              )) / icrGramsPerUnit
        )
      : null;

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
      .order("logged_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    setLoading(false);
    if (error) {
      setLogs([]);
      return;
    }
    setLogs((data ?? []) as MealLog[]);
  }, [supabase]);

  const loadFoodsAndComposites = useCallback(async () => {
    const userId = tryAppUserId();
    if (!userId) return;

    const [{ data: foodRows }, { data: mealRows }] = await Promise.all([
      supabase
        .from("foods")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true }),
      supabase
        .from("composite_meals")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);

    if (foodRows) setFoods(foodRows as Food[]);
    if (mealRows) {
      const list = mealRows as CompositeMeal[];
      setComposites(list);
      const map: Record<string, { food_id: string; grams: number }[]> = {};
      await Promise.all(
        list.map(async (m) => {
          const { data: items } = await supabase
            .from("composite_meal_items")
            .select("food_id, grams")
            .eq("composite_meal_id", m.id);
          map[m.id] =
            items?.map((i) => ({
              food_id: i.food_id as string,
              grams: Number(i.grams),
            })) ?? [];
        })
      );
      setItemsByComposite(map);
    }
  }, [supabase]);

  const loadSuggestions = useCallback(async () => {
    const userId = tryAppUserId();
    if (!userId) {
      setSuggestionLogs([]);
      return;
    }
    const { data } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("meal_slot", slot)
      .order("logged_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50);
    setSuggestionLogs((data ?? []) as MealLog[]);
  }, [supabase, slot]);

  const loadProfileIcr = useCallback(async () => {
    const userId = tryAppUserId();
    if (!userId) {
      setIcrGramsPerUnit(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("insulin_carb_grams_per_unit")
      .eq("id", userId)
      .maybeSingle();
    const g = data?.insulin_carb_grams_per_unit;
    setIcrGramsPerUnit(
      typeof g === "number" && g > 0 ? g : null
    );
  }, [supabase]);

  usePullToRefresh(() => {
    void load();
    void loadFoodsAndComposites();
    void loadSuggestions();
    void loadProfileIcr();
  });

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadFoodsAndComposites();
    void loadProfileIcr();
  }, [loadFoodsAndComposites, loadProfileIcr]);

  useEffect(() => {
    void loadSuggestions();
  }, [loadSuggestions]);

  const noteSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const row of suggestionLogs) {
      const n = row.note?.trim();
      if (!n) continue;
      const k = normNote(n);
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(n);
      if (out.length >= 6) break;
    }
    return out;
  }, [suggestionLogs]);

  const carbChips = useMemo(() => {
    type Chip = { carbs: number; insulin: number | null; key: string };
    const seen = new Set<string>();
    const out: Chip[] = [];
    for (const row of suggestionLogs) {
      if (row.grams_carbs <= 0) continue;
      const k = `${row.grams_carbs}|${row.rapid_insulin_units ?? ""}`;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push({
        carbs: row.grams_carbs,
        insulin: row.rapid_insulin_units,
        key: k,
      });
      if (out.length >= 8) break;
    }
    return out;
  }, [suggestionLogs]);

  function applyCarbSuggestion(carbs: number, insulin: number | null) {
    const apply = () => {
      setLines([]);
      setGramsStr(carbs > 0 ? String(carbs) : "");
      setInsulinStr(insulin != null && insulin > 0 ? String(insulin) : "");
    };

    if (lines.length > 0) {
      const ok = window.confirm(
        "Substituir as linhas actuais e os totais pelos valores desta sugestão?"
      );
      if (!ok) return;
    }
    apply();
  }

  function applyNoteSuggestion(text: string) {
    if (lines.length > 0) {
      const ok = window.confirm(
        "Manter as linhas e só actualizar a nota?"
      );
      if (!ok) return;
    }
    setNote(text);
  }

  function addFoodLine(food: Food, grams = 100) {
    const g = Math.max(1, grams);
    const carbsLine = roundCarbs(carbsFromFoodGrams(g, food.carbs_per_100g));
    setLines((prev) => [
      ...prev,
      {
        key: lineKey(),
        foodId: food.id.startsWith("temp-") ? null : food.id,
        compositeMealId: null,
        label: food.name,
        grams: g,
        carbsLine,
      },
    ]);
    setPickerOpen(false);
    setPickerSearch("");
  }

  function expandComposite(meal: CompositeMeal) {
    const items = itemsByComposite[meal.id] ?? [];
    const newLines: MealLine[] = [];
    for (const it of items) {
      const f = foodsById[it.food_id];
      const label = f?.name ?? "Alimento";
      const g = Math.max(1, it.grams);
      const cpg = f?.carbs_per_100g ?? 0;
      const carbsLine = roundCarbs(carbsFromFoodGrams(g, cpg));
      newLines.push({
        key: lineKey(),
        foodId: f && !f.id.startsWith("temp-") ? f.id : null,
        compositeMealId: meal.id,
        label,
        grams: g,
        carbsLine,
      });
    }
    if (newLines.length === 0) return;
    setLines((prev) => [...prev, ...newLines]);
    setCompositeOpen(false);
  }

  function updateLineGrams(key: string, gramsRaw: string) {
    const g = Math.max(1, Math.round(parseFloat(gramsRaw.replace(",", ".")) || 1));
    setLines((prev) =>
      prev.map((l) => {
        if (l.key !== key) return l;
        if (l.foodId && foodsById[l.foodId]) {
          const f = foodsById[l.foodId];
          return {
            ...l,
            grams: g,
            carbsLine: roundCarbs(carbsFromFoodGrams(g, f.carbs_per_100g)),
          };
        }
        const ratio = l.grams > 0 ? l.carbsLine / l.grams : 0;
        return {
          ...l,
          grams: g,
          carbsLine: roundCarbs(ratio * g),
        };
      })
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function resetAfterSave() {
    setEditingId(null);
    setLines([]);
    setGramsStr("");
    setInsulinStr("");
    setNote("");
    setLoggedOn(getLocalDateKey());
    setLoggedTime(formatLocalTimeHm());
    setFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setLines([]);
    setGramsStr("");
    setInsulinStr("");
    setNote("");
    setSlot("breakfast");
    setLoggedOn(getLocalDateKey());
    setLoggedTime(formatLocalTimeHm());
    setFormError(null);
  }

  async function startEdit(row: MealLog) {
    setFormError(null);
    setEditingId(row.id);
    setSlot(row.meal_slot as MealSlot);
    setLoggedOn(row.logged_on);
    setLoggedTime(parseIsoToLocalTimeHm(row.logged_at ?? row.created_at));
    setNote(row.note ?? "");
    setInsulinStr(
      row.rapid_insulin_units != null && row.rapid_insulin_units > 0
        ? String(row.rapid_insulin_units)
        : ""
    );
    setLoadingEdit(true);
    const { data: itemRows } = await supabase
      .from("meal_log_items")
      .select("*")
      .eq("meal_log_id", row.id)
      .order("sort_order", { ascending: true });
    setLoadingEdit(false);

    const items = (itemRows ?? []) as MealLogItem[];
    if (items.length > 0) {
      setLines(
        items.map((it) => ({
          key: it.id,
          foodId: it.food_id,
          compositeMealId: it.composite_meal_id,
          label: it.ingredient_label,
          grams: it.grams,
          carbsLine: it.grams_carbs_line,
        }))
      );
      setGramsStr("");
    } else {
      setLines([]);
      setGramsStr(row.grams_carbs > 0 ? String(row.grams_carbs) : "");
    }

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const filteredPickerFoods = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter((f) => f.name.toLowerCase().includes(q));
  }, [foods, pickerSearch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const iRaw = insulinStr.trim();
    let insulin: number | null = null;
    if (iRaw !== "") {
      const iu = Math.round(parseFloat(iRaw.replace(",", ".")) * 10) / 10;
      if (Number.isNaN(iu) || iu <= 0) {
        setFormError("Unidades de insulina inválidas.");
        return;
      }
      insulin = iu;
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

    const loggedAtIso = localDateAndTimeToUtcIso(loggedOn, loggedTime);

    if (lines.length > 0) {
      const total = totalFromLines;
      if (total <= 0 && insulin == null) {
        setFormError("Indica hidratos nas linhas ou insulina rápida.");
        return;
      }

      const payload = lines.map((l) => ({
        food_id: l.foodId,
        composite_meal_id: l.compositeMealId,
        ingredient_label: l.label,
        grams: l.grams,
        grams_carbs_line: l.carbsLine,
      }));

      setSaving(true);
      const { error } = editingId
        ? await supabase.rpc("update_meal_log_bundle", {
            p_meal_log_id: editingId,
            p_user_id: userId,
            p_logged_on: loggedOn,
            p_logged_at: loggedAtIso,
            p_meal_slot: slot,
            p_items: payload,
            p_grams_carbs: total,
            p_rapid_insulin_units: insulin,
            p_note: note.trim() === "" ? null : note.trim(),
          })
        : await supabase.rpc("create_meal_log_from_items", {
            p_user_id: userId,
            p_logged_on: loggedOn,
            p_meal_slot: slot,
            p_items: payload,
            p_grams_carbs: total,
            p_rapid_insulin_units: insulin,
            p_note: note.trim() === "" ? null : note.trim(),
            p_logged_at: loggedAtIso,
          });
      setSaving(false);

      if (error) {
        setFormError(migrationHint(error.message));
        return;
      }

      resetAfterSave();
      void load();
      void loadSuggestions();
      return;
    }

    const gRaw = gramsStr.trim();
    const carbsParsed = parseFloat(gRaw.replace(",", "."));
    const carbs =
      gRaw === "" ? 0 : Math.round(carbsParsed * 10) / 10;

    if (gRaw !== "" && (Number.isNaN(carbsParsed) || carbs < 0)) {
      setFormError("Gramas de HC inválidas.");
      return;
    }
    if (carbs <= 0 && insulin == null) {
      setFormError("Indica hidratos (g) ou insulina rápida (UI), ou adiciona linhas.");
      return;
    }

    setSaving(true);
    const { error } = editingId
      ? await supabase.rpc("update_meal_log_bundle", {
          p_meal_log_id: editingId,
          p_user_id: userId,
          p_logged_on: loggedOn,
          p_logged_at: loggedAtIso,
          p_meal_slot: slot,
          p_items: [],
          p_grams_carbs: carbs,
          p_rapid_insulin_units: insulin,
          p_note: note.trim() === "" ? null : note.trim(),
        })
      : await supabase.rpc("create_meal_log_with_entries", {
          p_user_id: userId,
          p_logged_on: loggedOn,
          p_meal_slot: slot,
          p_grams_carbs: carbs,
          p_rapid_insulin_units: insulin,
          p_note: note.trim() === "" ? null : note.trim(),
          p_logged_at: loggedAtIso,
        });
    setSaving(false);

    if (error) {
      setFormError(migrationHint(error.message));
      return;
    }

    resetAfterSave();
    void load();
    void loadSuggestions();
  }

  function migrationHint(msg: string) {
    const m = msg.toLowerCase();
    if (
      msg.includes("update_meal_log_bundle") ||
      (m.includes("logged_at") &&
        (m.includes("does not exist") || m.includes("column")))
    ) {
      return "Corre a migração 011_meal_log_logged_at_update.sql no Supabase.";
    }
    if (
      msg.includes("create_meal_log_from_items") ||
      msg.includes("meal_log_items")
    ) {
      return "Corre a migração 010_meal_log_items.sql no Supabase (tabela e função).";
    }
    if (
      msg.includes("create_meal_log_with_entries") ||
      msg.includes("meal_logs")
    ) {
      return "Corre as migrações de meal_logs no Supabase (007 e, se aplicável, 009 Ceia).";
    }
    if (msg.includes("invalid meal_slot")) {
      return "Slot de refeição inválido — aplica a migração 009 (Ceia) no Supabase.";
    }
    return msg;
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
    if (!error) {
      if (editingId === id) cancelEdit();
      void load();
      void loadSuggestions();
    }
  }

  if (!tryAppUserId()) {
    return (
      <p className="text-sm text-zinc-600">
        Configura o UUID da app para veres e registares refeições.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="min-w-0 max-w-full rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
      >
        <h2 className="text-sm font-semibold text-zinc-900">
          {editingId ? "Editar refeição" : "Registar refeição"}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {editingId
            ? "Altera dia, hora, slot, linhas ou totais; os gráficos do dia actualizam-se em conformidade."
            : "Monta linhas com alimentos ou refeições compostas; o total entra nos gráficos como um único HC por registo. Orientação sobre insulina, não prescrição — ajusta sempre ao teu plano clínico."}
        </p>

        {(noteSuggestions.length > 0 || carbChips.length > 0) && (
          <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
            <p className="text-[11px] font-medium text-zinc-500">
              Sugestões com base no teu histórico ({mealSlotLabelPt(slot)})
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {carbChips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => applyCarbSuggestion(c.carbs, c.insulin)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium tabular-nums text-zinc-800 transition hover:border-accent/40 hover:bg-accent/5"
                >
                  ~{c.carbs} g HC
                  {c.insulin != null && c.insulin > 0 && (
                    <span className="text-violet-700"> · {c.insulin} UI</span>
                  )}
                </button>
              ))}
              {noteSuggestions.map((n) => (
                <button
                  key={normNote(n)}
                  type="button"
                  onClick={() => applyNoteSuggestion(n)}
                  className="max-w-full truncate rounded-full border border-zinc-200 bg-white px-3 py-1 text-left text-xs text-zinc-700 transition hover:border-accent/40 hover:bg-accent/5"
                  title={n}
                >
                  {n.length > 42 ? `${n.slice(0, 40)}…` : n}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 grid min-w-0 gap-3">
          <div className="min-w-0">
            <label
              htmlFor="meal-slot"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Momento do dia
            </label>
            <select
              id="meal-slot"
              value={slot}
              onChange={(e) => setSlot(e.target.value as MealSlot)}
              className="w-full min-w-0 max-w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            >
              {MEAL_SLOTS.map((s) => (
                <option key={s} value={s}>
                  {mealSlotLabelPt(s)}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-0">
            <label
              htmlFor="meal-day"
              className="mb-1 flex items-center gap-1 text-[11px] font-medium text-zinc-500"
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Dia
            </label>
            <input
              id="meal-day"
              type="date"
              value={loggedOn}
              onChange={(e) => setLoggedOn(e.target.value)}
              className="box-border w-full min-w-0 max-w-full rounded-xl border border-zinc-200 bg-canvas px-2 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2 [color-scheme:light]"
            />
          </div>

          <div className="min-w-0">
            <label
              htmlFor="meal-time"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Hora
            </label>
            <input
              id="meal-time"
              type="time"
              value={loggedTime}
              onChange={(e) => setLoggedTime(e.target.value)}
              className="box-border w-full min-w-0 max-w-full rounded-xl border border-zinc-200 bg-canvas px-2 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2 [color-scheme:light]"
            />
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-medium text-zinc-500">
              Linhas da refeição
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden />
                Adicionar alimento
              </button>
              <button
                type="button"
                onClick={() => setCompositeOpen(true)}
                disabled={composites.length === 0}
                className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Layers className="h-3.5 w-3.5" aria-hidden />
                Refeição composta
              </button>
            </div>

            {lines.length > 0 ? (
              <ul className="mt-2 space-y-2">
                {lines.map((l) => (
                  <li
                    key={l.key}
                    className="flex flex-wrap items-end gap-2 rounded-xl border border-zinc-200 bg-canvas/80 p-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900">
                        {l.label}
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        {l.carbsLine} g HC
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <input
                        inputMode="numeric"
                        value={String(l.grams)}
                        onChange={(e) => updateLineGrams(l.key, e.target.value)}
                        className="w-16 rounded-lg border border-zinc-200 bg-surface px-2 py-1 text-xs tabular-nums"
                      />
                      <span className="text-[11px] text-zinc-500">g</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(l.key)}
                      className="rounded-lg p-1.5 text-zinc-500 hover:bg-red-50 hover:text-red-700"
                      aria-label="Remover linha"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-zinc-500">
                Sem linhas — usa o total manual abaixo ou adiciona alimentos.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
            <p className="text-sm tabular-nums text-zinc-900">
              <span className="font-semibold">
                {lines.length > 0 ? totalFromLines : "—"}
              </span>
              {lines.length > 0 && (
                <span className="font-normal text-zinc-600"> g HC total</span>
              )}
            </p>
            {lines.length === 0 && (
              <div className="mt-2">
                <label
                  htmlFor="meal-carbs"
                  className="mb-1 block text-[11px] font-medium text-zinc-500"
                >
                  Hidratos totais (g), manual
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
            )}
            {suggestedInsulin != null && suggestedInsulin > 0 && (
              <p className="mt-2 text-xs text-zinc-600">
                Sugestão (regra nas definições: {icrGramsPerUnit} g HC / 1 UI): ~{" "}
                <span className="font-semibold tabular-nums text-violet-800">
                  {suggestedInsulin} UI
                </span>
                {" — "}
                confirma com o teu médico e ajusta o campo abaixo.
              </p>
            )}
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

          <div>
            <label
              htmlFor="meal-note"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Nota (opcional)
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

        <div className="mt-4 flex flex-col gap-2">
          {editingId && (
            <button
              type="button"
              onClick={() => cancelEdit()}
              disabled={saving}
              className="w-full rounded-xl border border-zinc-200 bg-surface py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Cancelar edição
            </button>
          )}
          <button
            type="submit"
            disabled={saving || loadingEdit}
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition active:scale-[0.99] disabled:opacity-50"
          >
            {saving
              ? "A guardar…"
              : editingId
                ? "Guardar alterações"
                : "Guardar refeição"}
          </button>
        </div>
      </form>

      <details className="group rounded-2xl border border-zinc-200/90 bg-surface shadow-card">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-4 text-sm font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
          <span>Refeições anteriores</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500 transition group-open:rotate-180" />
        </summary>
        <div className="border-t border-zinc-100 px-4 pb-4 pt-2">
          <p className="text-xs text-zinc-500">
            Apagar remove também o HC e a insulina ligados a este registo.
          </p>
          {loading ? (
            <p className="mt-4 text-sm text-zinc-500">A carregar…</p>
          ) : logs.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-6 text-center text-sm text-zinc-500">
              Ainda não há registos.
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
                            {formatTimePt(row.logged_at ?? row.created_at)}
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
                      <div className="flex shrink-0 gap-1">
                        <button
                          type="button"
                          title="Editar registo"
                          disabled={loadingEdit || deletingId === row.id}
                          onClick={() => void startEdit(row)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent disabled:opacity-40"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Apagar registo"
                          disabled={deletingId === row.id}
                          onClick={() => void removeLog(row.id)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </details>

      <AnimatePresence>
        {pickerOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Fechar"
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPickerOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pick-food-title"
              className="fixed bottom-0 left-0 right-0 z-[61] mx-auto flex max-h-[min(85vh,520px)] max-w-md flex-col rounded-t-3xl border border-zinc-200 bg-surface shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="flex items-center justify-between border-b border-zinc-100 p-4 pb-3">
                <h2
                  id="pick-food-title"
                  className="text-lg font-semibold text-zinc-900"
                >
                  Escolher alimento
                </h2>
                <button
                  type="button"
                  onClick={() => setPickerOpen(false)}
                  className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="relative border-b border-zinc-100 px-4 py-2">
                <Search className="pointer-events-none absolute left-7 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  placeholder="Pesquisar…"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-3 text-sm outline-none ring-accent/30 focus:ring-2"
                />
              </div>
              <ul className="flex-1 overflow-y-auto p-2">
                {filteredPickerFoods.length === 0 ? (
                  <li className="px-3 py-8 text-center text-sm text-zinc-500">
                    {foods.length === 0
                      ? "Adiciona alimentos em Biblioteca → Explorar."
                      : "Nada encontrado."}
                  </li>
                ) : (
                  filteredPickerFoods.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => addFoodLine(f, 100)}
                        className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-900 hover:bg-zinc-100"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {f.name}
                        </span>
                        <span className="shrink-0 text-xs text-zinc-500">
                          {f.carbs_per_100g} g/100g
                        </span>
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {compositeOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Fechar"
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setCompositeOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="pick-composite-title"
              className="fixed bottom-0 left-0 right-0 z-[61] mx-auto flex max-h-[min(70vh,420px)] max-w-md flex-col rounded-t-3xl border border-zinc-200 bg-surface shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="flex items-center justify-between border-b border-zinc-100 p-4">
                <h2
                  id="pick-composite-title"
                  className="text-lg font-semibold text-zinc-900"
                >
                  Refeição composta
                </h2>
                <button
                  type="button"
                  onClick={() => setCompositeOpen(false)}
                  className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ul className="flex-1 overflow-y-auto p-2">
                {composites.map((m) => {
                  const its = itemsByComposite[m.id] ?? [];
                  let t = 0;
                  for (const it of its) {
                    const f = foodsById[it.food_id];
                    if (f)
                      t += carbsFromFoodGrams(it.grams, f.carbs_per_100g);
                  }
                  const total = roundCarbs(t);
                  return (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => expandComposite(m)}
                        className="flex w-full flex-col items-start gap-0.5 rounded-xl px-3 py-3 text-left hover:bg-zinc-100"
                      >
                        <span className="font-medium text-zinc-900">
                          {m.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {its.length} ingrediente(s) · ~{total} g HC
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
