"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

function sortFoods(list: Food[]) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt"));
}

export function useFoodLibrary() {
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

  function applyCatalogFood(name: string, carbs: number) {
    setNewName(name);
    setNewCarbs(String(carbs));
    setFormError(null);
  }

  function applyOffProduct(name: string, carbs: number | null) {
    setNewName(name);
    setNewCarbs(carbs !== null ? String(carbs) : "");
    setFormError(
      carbs === null
        ? "Sem hidratos por 100 g na Open Food Facts — confere o rótulo e preenche o HC manualmente."
        : null
    );
  }

  return {
    online,
    foods,
    setLogError,
    loading,
    search,
    setSearch,
    favoritesOnly,
    setFavoritesOnly,
    filtered,
    loadFoods,
    newName,
    setNewName,
    newCarbs,
    setNewCarbs,
    newFavorite,
    setNewFavorite,
    adding,
    formError,
    handleAddFood,
    toggleFavorite,
    logFood,
    setLogFood,
    logGrams,
    setLogGrams,
    logSaving,
    logError,
    submitLogFood,
    applyCatalogFood,
    applyOffProduct,
  };
}
