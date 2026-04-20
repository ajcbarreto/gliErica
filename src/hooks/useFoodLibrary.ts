"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
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
  const { userId } = useAuthUser();
  const online = useOnlineStatus();
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [newName, setNewName] = useState("");
  const [newCarbs, setNewCarbs] = useState("");
  const [newBrand, setNewBrand] = useState("");
  const [newRetailer, setNewRetailer] = useState("");
  const [newFavorite, setNewFavorite] = useState(false);
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [logFood, setLogFood] = useState<Food | null>(null);
  const [logGrams, setLogGrams] = useState("");
  const [logSaving, setLogSaving] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const loadFoods = useCallback(async () => {
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
  }, [supabase, userId]);

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
      const meta = `${f.brand ?? ""} ${f.retailer ?? ""}`.toLowerCase();
      return (
        f.name.toLowerCase().includes(q) ||
        meta.includes(q)
      );
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

    if (!userId) {
      setFormError("Inicia sessão para adicionar alimentos.");
      return;
    }

    const brandNorm =
      newBrand.trim() === "" ? null : newBrand.trim();
    const retailerNorm =
      newRetailer.trim() === "" ? null : newRetailer.trim();

    if (!navigator.onLine) {
      const clientId = makeTempFoodId();
      const temp = optimisticFood(
        userId,
        clientId,
        newName.trim(),
        carbs,
        newFavorite,
        brandNorm,
        retailerNorm
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
          brand: brandNorm,
          retailer: retailerNorm,
        },
      });
      setNewName("");
      setNewCarbs("");
      setNewBrand("");
      setNewRetailer("");
      setNewFavorite(false);
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("foods").insert({
      user_id: userId,
      name: newName.trim(),
      carbs_per_100g: carbs,
      is_favorite: newFavorite,
      brand: brandNorm,
      retailer: retailerNorm,
    });
    setAdding(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setNewName("");
    setNewCarbs("");
    setNewBrand("");
    setNewRetailer("");
    setNewFavorite(false);
    void loadFoods();
  }

  async function toggleFavorite(food: Food) {
    if (food.id.startsWith("temp-")) return;

    if (!userId) {
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

    if (!userId) {
      setLogError("Inicia sessão para registar.");
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
    setNewBrand("");
    setNewRetailer("");
    setFormError(null);
  }

  function applyOffProduct(name: string, carbs: number | null) {
    setNewName(name);
    setNewCarbs(carbs !== null ? String(carbs) : "");
    setNewBrand("");
    setNewRetailer("");
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
    newBrand,
    setNewBrand,
    newRetailer,
    setNewRetailer,
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
