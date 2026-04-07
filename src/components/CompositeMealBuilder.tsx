"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAppUserId, tryAppUserId } from "@/lib/app-user";
import { getLocalDateKey } from "@/lib/date";
import { carbsFromFoodGrams, roundCarbs } from "@/lib/carb-math";
import type { CompositeMeal, Food } from "@/types/database";
import { ArrowLeft, Layers, Plus, Star } from "lucide-react";

type ItemDraft = { food_id: string; grams: number };

export function CompositeMealBuilder() {
  const supabase = createClient();
  const [foods, setFoods] = useState<Food[]>([]);
  const [meals, setMeals] = useState<CompositeMeal[]>([]);
  const [itemsByMeal, setItemsByMeal] = useState<
    Record<string, ItemDraft[]>
  >({});
  const [loading, setLoading] = useState(true);

  const [selected, setSelected] = useState<Record<string, number>>({});
  const [mealName, setMealName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const foodsById = useMemo(
    () => Object.fromEntries(foods.map((f) => [f.id, f])),
    [foods]
  );

  const loadAll = useCallback(async () => {
    const userId = tryAppUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

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
      const list = (mealRows as CompositeMeal[]).map((m) => ({
        ...m,
        is_favorite: m.is_favorite === true,
      }));
      setMeals(list);

      const map: Record<string, ItemDraft[]> = {};
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
      setItemsByMeal(map);
    }

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  function toggleFood(id: string) {
    setSelected((prev) => {
      const next = { ...prev };
      if (id in next) {
        delete next[id];
      } else {
        next[id] = 100;
      }
      return next;
    });
  }

  function setGrams(id: string, grams: number) {
    setSelected((prev) => ({ ...prev, [id]: grams }));
  }

  const draftTotal = useMemo(() => {
    let t = 0;
    for (const [fid, g] of Object.entries(selected)) {
      const f = foodsById[fid];
      if (f) t += carbsFromFoodGrams(g, f.carbs_per_100g);
    }
    return roundCarbs(t);
  }, [selected, foodsById]);

  async function saveComposite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!mealName.trim()) {
      setError("Dá um nome à refeição composta.");
      return;
    }
    const entries = Object.entries(selected);
    if (entries.length < 2) {
      setError("Seleciona pelo menos dois alimentos.");
      return;
    }

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setError("Configura NEXT_PUBLIC_GLIERICA_USER_ID no .env.local.");
      return;
    }

    setSaving(true);
    const { data: meal, error: mErr } = await supabase
      .from("composite_meals")
      .insert({
        user_id: userId,
        name: mealName.trim(),
        is_favorite: false,
      })
      .select("id")
      .single();

    if (mErr || !meal) {
      setSaving(false);
      setError(mErr?.message ?? "Erro ao criar refeição.");
      return;
    }

    const mealId = meal.id as string;
    const rows = entries.map(([food_id, grams]) => ({
      composite_meal_id: mealId,
      food_id,
      grams,
    }));

    const { error: iErr } = await supabase
      .from("composite_meal_items")
      .insert(rows);

    setSaving(false);

    if (iErr) {
      setError(iErr.message);
      return;
    }

    setMealName("");
    setSelected({});
    void loadAll();
  }

  function totalStoredForMeal(mealId: string): number {
    const items = itemsByMeal[mealId] ?? [];
    let t = 0;
    for (const i of items) {
      const f = foodsById[i.food_id];
      if (f) t += carbsFromFoodGrams(i.grams, f.carbs_per_100g);
    }
    return roundCarbs(t);
  }

  async function toggleCompositeFavorite(meal: CompositeMeal) {
    const next = !meal.is_favorite;
    const { error } = await supabase
      .from("composite_meals")
      .update({ is_favorite: next })
      .eq("id", meal.id);
    if (!error) {
      setMeals((prev) =>
        prev.map((m) => (m.id === meal.id ? { ...m, is_favorite: next } : m))
      );
    }
  }

  async function logCompositeToday(meal: CompositeMeal) {
    const grams = totalStoredForMeal(meal.id);
    if (grams <= 0) return;

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      return;
    }

    const { error: err } = await supabase.from("carb_entries").insert({
      user_id: userId,
      logged_on: getLocalDateKey(),
      grams_carbs: grams,
      food_id: null,
      composite_meal_id: meal.id,
      note: meal.name,
    });

    if (!err) {
      void loadAll();
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-3">
        <Link
          href="/refeicoes"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Refeições
        </Link>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <Layers className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Composer
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Refeições compostas
            </h1>
            <p className="text-sm text-zinc-600">
              Vários alimentos numa refeição guardada (ex.: Pequeno Almoço VIP).
            </p>
          </div>
        </div>
      </header>

      <form
        onSubmit={(e) => void saveComposite(e)}
        className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
      >
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900">
          <Plus className="h-4 w-4 text-accent" aria-hidden />
          Criar nova
        </p>
        <input
          placeholder="Nome da refeição"
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
          className="mb-3 w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
        />
        <p className="mb-2 text-xs text-zinc-500">
          Seleciona alimentos na biblioteca e ajusta as gramas. Mínimo 2.
        </p>

        {foods.length === 0 ? (
          <p className="py-4 text-sm text-zinc-500">
            Precisas de alimentos na{" "}
            <Link href="/biblioteca" className="text-accent underline">
              biblioteca
            </Link>
            .
          </p>
        ) : (
          <ul className="mb-4 max-h-60 space-y-2 overflow-y-auto pr-1">
            {foods.map((f) => {
              const on = f.id in selected;
              const g = selected[f.id] ?? 100;
              return (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-canvas/80 px-3 py-2"
                >
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleFood(f.id)}
                      className="rounded border-zinc-300 bg-white text-accent focus:ring-accent"
                    />
                    <span className="truncate text-sm text-zinc-900">{f.name}</span>
                  </label>
                  {on && (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={g}
                        onChange={(e) =>
                          setGrams(f.id, Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-20 rounded-lg border border-zinc-200 bg-surface px-2 py-1 text-xs tabular-nums text-zinc-900"
                      />
                      <span className="text-[11px] text-zinc-500">g</span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="text-zinc-500">Total estimado</span>
          <span className="font-semibold tabular-nums text-accent">
            {draftTotal} g HC
          </span>
        </div>

        {error && (
          <p className="mb-3 text-xs text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving || Object.keys(selected).length < 2}
          className="w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-40"
        >
          {saving ? "A guardar…" : "Guardar refeição composta"}
        </button>
      </form>

      <section>
        <h2 className="mb-2 text-sm font-medium text-zinc-600">
          Guardadas ({meals.length})
        </h2>
        {loading ? (
          <p className="text-sm text-zinc-500">A carregar…</p>
        ) : meals.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-zinc-200 py-8 text-center text-sm text-zinc-500">
            Ainda não tens refeições compostas.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {meals.map((m) => {
              const total = totalStoredForMeal(m.id);
              const itemList = itemsByMeal[m.id] ?? [];
              return (
                <li
                  key={m.id}
                  className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="flex min-w-0 items-start gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleCompositeFavorite(m)}
                        className="mt-0.5 shrink-0 rounded-lg p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-amber-400"
                        aria-label={
                          m.is_favorite
                            ? "Remover dos favoritos para análise"
                            : "Marcar favorita para análise"
                        }
                      >
                        <Star
                          className={`h-5 w-5 ${m.is_favorite ? "fill-amber-400 text-amber-400" : ""}`}
                          aria-hidden
                        />
                      </button>
                      <div className="min-w-0">
                        <p className="font-medium text-zinc-900">{m.name}</p>
                        <p className="text-xs text-zinc-500">
                          {itemList.length} ingrediente(s) · {total} g HC
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void logCompositeToday(m)}
                      className="shrink-0 rounded-lg bg-accent/15 px-3 py-2 text-xs font-semibold text-accent"
                    >
                      Registar hoje
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1 border-t border-zinc-200 pt-2 text-xs text-zinc-500">
                    {itemList.map((i) => {
                      const f = foodsById[i.food_id];
                      return (
                        <li key={`${m.id}-${i.food_id}`}>
                          {f?.name ?? "Alimento"} — {i.grams} g
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
