import type { Food } from "@/types/database";

export type QueuedFoodInsert = {
  type: "food_insert";
  id: string;
  payload: {
    userId: string;
    clientId: string;
    name: string;
    carbs_per_100g: number;
    is_favorite: boolean;
    /** Ausentes em operações antigas na fila local. */
    brand?: string | null;
    retailer?: string | null;
  };
};

export type QueuedFoodFavorite = {
  type: "food_favorite";
  id: string;
  payload: {
    userId: string;
    food_id: string;
    is_favorite: boolean;
  };
};

export type QueuedCarbInsert = {
  type: "carb_insert";
  id: string;
  payload: {
    userId: string;
    logged_on: string;
    grams_carbs: number;
    food_id: string | null;
    composite_meal_id: string | null;
    note: string | null;
  };
};

export type QueuedOp = QueuedFoodInsert | QueuedFoodFavorite | QueuedCarbInsert;

const QUEUE_KEY = "glierica_sync_queue_v1";

function safeParse(raw: string | null): QueuedOp[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? (v as QueuedOp[]) : [];
  } catch {
    return [];
  }
}

export function loadQueue(): QueuedOp[] {
  if (typeof window === "undefined") return [];
  return safeParse(localStorage.getItem(QUEUE_KEY));
}

export function saveQueue(ops: QueuedOp[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(ops));
}

export function enqueueOp(op: QueuedOp) {
  const q = loadQueue();
  q.push(op);
  saveQueue(q);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("glierica-queue-changed"));
  }
}

export function queueLength(): number {
  return loadQueue().length;
}

export function newOpId() {
  return `q-${crypto.randomUUID()}`;
}

export function makeTempFoodId() {
  return `temp-${crypto.randomUUID()}`;
}

export function optimisticFood(
  userId: string,
  clientId: string,
  name: string,
  carbs_per_100g: number,
  is_favorite: boolean,
  brand: string | null,
  retailer: string | null
): Food {
  return {
    id: clientId,
    user_id: userId,
    name,
    carbs_per_100g,
    is_favorite,
    brand,
    retailer,
    created_at: new Date().toISOString(),
  };
}
