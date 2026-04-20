import type { Food } from "@/types/database";

function cacheKey(userId: string) {
  return `glierica_foods_cache_v2_${userId}`;
}

export function saveFoodsCache(userId: string, foods: Food[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      cacheKey(userId),
      JSON.stringify({ updatedAt: Date.now(), foods })
    );
  } catch {
    /* quota */
  }
}

export function loadFoodsCache(userId: string): Food[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { foods?: Food[] };
    const foods = parsed.foods;
    if (!foods) return null;
    return foods.map((f) => ({
      ...f,
      brand: f.brand ?? null,
      retailer: f.retailer ?? null,
    }));
  } catch {
    return null;
  }
}

export function replaceFoodInCache(
  userId: string,
  oldId: string,
  newFood: Food
) {
  const foods = loadFoodsCache(userId);
  if (!foods) return;
  const next = foods.map((f) => (f.id === oldId ? newFood : f));
  saveFoodsCache(userId, next);
}
