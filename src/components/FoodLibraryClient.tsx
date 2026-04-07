"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAppUserId, tryAppUserId } from "@/lib/app-user";
import { getLocalDateKey } from "@/lib/date";
import { carbsFromFoodGrams, roundCarbs } from "@/lib/carb-math";
import { saveFoodsCache, loadFoodsCache } from "@/lib/offline/foods-cache";
import {
  enqueueOp,
  makeTempFoodId,
  newOpId,
  optimisticFood,
} from "@/lib/offline/queue-types";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import type { Food } from "@/types/database";
import {
  ArrowLeft,
  Plus,
  Search,
  Star,
  UtensilsCrossed,
  WifiOff,
  X,
} from "lucide-react";

function sortFoods(list: Food[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export function FoodLibraryClient() {
  const supabase = createClient();
  const online = useOnlineStatus();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [newName, setNewName] = useState("");
  const [newCarbs, setNewCarbs] = useState("");
  const [newFavorite, setNewFavorite] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [logFood, setLogFood] = useState<Food | null>(null);
  const [logGrams, setLogGrams] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const loadFoods = useCallback(async () => {
    const userId = tryAppUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    if (!navigator.onLine) {
      const cached = loadFoodsCache(userId);
      if (cached) setFoods(cached);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("foods")
      .select("*")
      .eq("user_id", userId)
      .order("name", { ascending: true });

    if (!error && data) {
      const list = data as Food[];
      setFoods(list);
      saveFoodsCache(userId, list);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void loadFoods();
  }, [loadFoods]);

  useEffect(() => {
    const onSynced = () => {
      if (typeof navigator !== "undefined" && navigator.onLine) {
        void loadFoods();
      }
    };
    window.addEventListener("glierica-sync-complete", onSynced);
    return () => window.removeEventListener("glierica-sync-complete", onSynced);
  }, [loadFoods]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter((f) => {
      if (favoritesOnly && !f.is_favorite) return false;
      if (!q) return true;
      return f.name.toLowerCase().includes(q);
    });
  }, [foods, search, favoritesOnly]);

  async function handleAddFood(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const carbs = parseFloat(newCarbs.replace(",", "."));
    if (!newName.trim()) {
      setFormError("Indica o nome do alimento.");
      return;
    }
    if (Number.isNaN(carbs) || carbs < 0) {
      setFormError("HC por 100 g inválido.");
      return;
    }

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setFormError("Configura NEXT_PUBLIC_GLIERICA_USER_ID no .env.local.");
      return;
    }

    if (!navigator.onLine) {
      const clientId = makeTempFoodId();
      const temp = optimisticFood(
        userId,
        clientId,
        newName.trim(),
        carbs,
        newFavorite
      );
      const next = sortFoods([...foods, temp]);
      setFoods(next);
      saveFoodsCache(userId, next);
      enqueueOp({
        type: "food_insert",
        id: newOpId(),
        payload: {
          userId,
          clientId,
          name: newName.trim(),
          carbs_per_100g: carbs,
          is_favorite: newFavorite,
        },
      });
      setNewName("");
      setNewCarbs("");
      setNewFavorite(false);
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("foods").insert({
      user_id: userId,
      name: newName.trim(),
      carbs_per_100g: carbs,
      is_favorite: newFavorite,
    });
    setAdding(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setNewName("");
    setNewCarbs("");
    setNewFavorite(false);
    void loadFoods();
  }

  async function toggleFavorite(food: Food) {
    if (food.id.startsWith("temp-")) return;

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      return;
    }

    const nextVal = !food.is_favorite;

    if (!navigator.onLine) {
      setFoods((prev) => {
        const next = prev.map((f) =>
          f.id === food.id ? { ...f, is_favorite: nextVal } : f
        );
        saveFoodsCache(userId, next);
        return next;
      });
      enqueueOp({
        type: "food_favorite",
        id: newOpId(),
        payload: {
          userId,
          food_id: food.id,
          is_favorite: nextVal,
        },
      });
      return;
    }

    const { error } = await supabase
      .from("foods")
      .update({ is_favorite: nextVal })
      .eq("id", food.id);

    if (!error) {
      setFoods((prev) =>
        prev.map((f) =>
          f.id === food.id ? { ...f, is_favorite: nextVal } : f
        )
      );
      void loadFoods();
    }
  }

  async function submitLogFood(e: React.FormEvent) {
    e.preventDefault();
    if (!logFood) return;
    setLogError(null);
    const g = parseFloat(logGrams.replace(",", "."));
    if (Number.isNaN(g) || g <= 0) {
      setLogError("Indica gramas de alimento (> 0).");
      return;
    }

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setLogError("Configura NEXT_PUBLIC_GLIERICA_USER_ID no .env.local.");
      return;
    }

    const hc = roundCarbs(carbsFromFoodGrams(g, logFood.carbs_per_100g));
    const tempFood = logFood.id.startsWith("temp-");

    if (!navigator.onLine) {
      enqueueOp({
        type: "carb_insert",
        id: newOpId(),
        payload: {
          userId,
          logged_on: getLocalDateKey(),
          grams_carbs: hc,
          food_id: tempFood ? null : logFood.id,
          composite_meal_id: null,
          note: `${logFood.name} (${g} g)${tempFood ? " · pendente sync" : ""}`,
        },
      });
      setLogFood(null);
      setLogGrams("");
      return;
    }

    setLogSaving(true);
    const { error } = await supabase.from("carb_entries").insert({
      user_id: userId,
      logged_on: getLocalDateKey(),
      grams_carbs: hc,
      food_id: tempFood ? null : logFood.id,
      composite_meal_id: null,
      note: `${logFood.name} (${g} g)`,
    });
    setLogSaving(false);

    if (error) {
      setLogError(error.message);
      return;
    }

    setLogFood(null);
    setLogGrams("");
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
            <UtensilsCrossed className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Biblioteca
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Alimentos
            </h1>
            <p className="text-sm text-zinc-600">
              Pesquisa, favoritos e registo a partir da tua lista.
            </p>
            {!online && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                <WifiOff className="h-3.5 w-3.5" aria-hidden />
                Modo offline — dados em cache e fila de sincronização
              </p>
            )}
          </div>
        </div>
      </header>

      <form
        onSubmit={(e) => void handleAddFood(e)}
        className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
      >
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900">
          <Plus className="h-4 w-4 text-accent" aria-hidden />
          Novo alimento
        </p>
        <div className="grid gap-3">
          <input
            placeholder="Nome (ex: Pão integral)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
          />
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                HC (g) / 100 g
              </label>
              <input
                inputMode="decimal"
                placeholder="ex: 42"
                value={newCarbs}
                onChange={(e) => setNewCarbs(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={newFavorite}
                onChange={(e) => setNewFavorite(e.target.checked)}
                className="rounded border-zinc-300 bg-white text-accent focus:ring-accent"
              />
              Favorito
            </label>
          </div>
          {formError && (
            <p className="text-xs text-red-600" role="alert">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={adding}
            className="rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {adding ? "A guardar…" : "Adicionar à biblioteca"}
          </button>
        </div>
      </form>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Pesquisar…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-surface py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
          />
        </div>
        <button
          type="button"
          onClick={() => setFavoritesOnly((v) => !v)}
          className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
            favoritesOnly
              ? "border-accent/40 bg-accent/15 text-accent"
              : "border-zinc-200 bg-surface text-zinc-600"
          }`}
        >
          <Star
            className={`h-4 w-4 ${favoritesOnly ? "fill-accent text-accent" : ""}`}
            aria-hidden
          />
          Só favoritos
        </button>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-zinc-500">A carregar…</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500">
          {foods.length === 0
            ? "Ainda não tens alimentos. Adiciona o primeiro acima."
            : "Nada corresponde aos filtros."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((food) => (
            <li
              key={food.id}
              className="flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card"
            >
              <button
                type="button"
                onClick={() => void toggleFavorite(food)}
                disabled={food.id.startsWith("temp-")}
                title={
                  food.id.startsWith("temp-")
                    ? "Sincroniza o alimento para alterar favorito"
                    : undefined
                }
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-600 transition hover:text-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={
                  food.is_favorite ? "Remover dos favoritos" : "Marcar favorito"
                }
              >
                <Star
                  className={`h-5 w-5 ${food.is_favorite ? "fill-amber-400 text-amber-400" : ""}`}
                  aria-hidden
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-zinc-900">
                  {food.name}
                  {food.id.startsWith("temp-") && (
                    <span className="ml-1.5 text-[10px] font-normal text-amber-400/90">
                      pendente
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  {food.carbs_per_100g} g HC / 100 g
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setLogFood(food);
                  setLogGrams("100");
                  setLogError(null);
                }}
                className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold text-accent"
              >
                Registar hoje
              </button>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {logFood && (
          <>
            <motion.button
              type="button"
              aria-label="Fechar"
              className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLogFood(null)}
            />
            <motion.div
              key={logFood.id}
              role="dialog"
              aria-modal="true"
              aria-labelledby="food-log-title"
              className="fixed bottom-0 left-0 right-0 z-[61] mx-auto max-w-md rounded-t-3xl border border-zinc-200 bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h2
                  id="food-log-title"
                  className="pr-8 text-lg font-semibold text-zinc-900"
                >
                  Registar alimento
                </h2>
                <button
                  type="button"
                  onClick={() => setLogFood(null)}
                  className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-3 text-sm text-zinc-600">{logFood.name}</p>
              <form
                onSubmit={(e) => void submitLogFood(e)}
                className="space-y-4"
              >
                <div>
                  <label
                    htmlFor="food-grams"
                    className="mb-1.5 block text-xs font-medium text-zinc-500"
                  >
                    Quantidade (g de alimento)
                  </label>
                  <input
                    id="food-grams"
                    inputMode="decimal"
                    value={logGrams}
                    onChange={(e) => setLogGrams(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-canvas px-4 py-3 text-lg font-semibold tabular-nums text-zinc-900 outline-none ring-accent/40 focus:ring-2"
                  />
                  <p className="mt-2 text-xs text-zinc-500">
                    ≈{" "}
                    {roundCarbs(
                      carbsFromFoodGrams(
                        parseFloat(logGrams.replace(",", ".")) || 0,
                        logFood.carbs_per_100g
                      )
                    )}{" "}
                    g HC
                  </p>
                </div>
                {logError && (
                  <p className="text-sm text-red-600" role="alert">
                    {logError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={logSaving}
                  className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                >
                  {logSaving
                    ? "A guardar…"
                    : !navigator.onLine
                      ? "Guardar na fila"
                      : "Adicionar ao dia de hoje"}
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
