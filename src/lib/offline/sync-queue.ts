import { createClient } from "@/lib/supabase/client";
import { tryAppUserId } from "@/lib/app-user";
import type { Food } from "@/types/database";
import { loadQueue, saveQueue, type QueuedOp } from "./queue-types";
import {
  loadFoodsCache,
  replaceFoodInCache,
  saveFoodsCache,
} from "./foods-cache";

export type FlushResult = { synced: number; remaining: number };

/**
 * Envia operações pendentes ao Supabase (chamar quando `navigator.onLine`).
 */
export async function flushPendingSyncQueue(): Promise<FlushResult> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { synced: 0, remaining: loadQueue().length };
  }

  const supabase = createClient();
  const userId = tryAppUserId();
  if (!userId) {
    return { synced: 0, remaining: loadQueue().length };
  }

  const queue = loadQueue();
  if (queue.length === 0) return { synced: 0, remaining: 0 };

  let synced = 0;
  const failed: QueuedOp[] = [];

  for (const op of queue) {
    if (op.payload.userId !== userId) {
      failed.push(op);
      continue;
    }
    try {
      switch (op.type) {
        case "food_insert": {
          const { data, error } = await supabase
            .from("foods")
            .insert({
              user_id: op.payload.userId,
              name: op.payload.name,
              carbs_per_100g: op.payload.carbs_per_100g,
              is_favorite: op.payload.is_favorite,
            })
            .select("*")
            .single();
          if (error) throw error;
          const row = data as Food;
          replaceFoodInCache(userId, op.payload.clientId, row);
          synced += 1;
          break;
        }
        case "food_favorite": {
          const { error } = await supabase
            .from("foods")
            .update({ is_favorite: op.payload.is_favorite })
            .eq("id", op.payload.food_id);
          if (error) throw error;
          const cached = loadFoodsCache(userId);
          if (cached) {
            saveFoodsCache(
              userId,
              cached.map((f) =>
                f.id === op.payload.food_id
                  ? { ...f, is_favorite: op.payload.is_favorite }
                  : f
              )
            );
          }
          synced += 1;
          break;
        }
        case "carb_insert": {
          const { error } = await supabase.from("carb_entries").insert({
            user_id: op.payload.userId,
            logged_on: op.payload.logged_on,
            grams_carbs: op.payload.grams_carbs,
            food_id: op.payload.food_id,
            composite_meal_id: op.payload.composite_meal_id,
            note: op.payload.note,
          });
          if (error) throw error;
          synced += 1;
          break;
        }
        default:
          failed.push(op);
      }
    } catch {
      failed.push(op);
    }
  }

  saveQueue(failed);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("glierica-sync-complete"));
    window.dispatchEvent(new CustomEvent("glierica-queue-changed"));
  }
  return { synced, remaining: failed.length };
}
