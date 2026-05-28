"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";
import type { CompositeMeal, MealLog, MealLogItem } from "@/types/database";
import { Layers, Pencil } from "lucide-react";
import { MealResultPanel } from "@/components/MealResultPanel";

function formatDayLong(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTimePt(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type MealDetailClientProps = {
  mealId: string;
};

export function MealDetailClient({ mealId }: MealDetailClientProps) {
  const supabase = createClient();
  const { userId, loading: authLoading } = useAuthUser();
  const [meal, setMeal] = useState<MealLog | null>(null);
  const [items, setItems] = useState<MealLogItem[]>([]);
  const [compositeNames, setCompositeNames] = useState<Record<string, string>>(
    {}
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setMeal(null);
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: mealRow, error: mealErr } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("id", mealId)
      .eq("user_id", userId)
      .maybeSingle();

    if (mealErr) {
      setLoading(false);
      setError(mealErr.message);
      setMeal(null);
      setItems([]);
      return;
    }

    if (!mealRow) {
      setLoading(false);
      setMeal(null);
      setItems([]);
      return;
    }

    const m = mealRow as MealLog;
    setMeal(m);

    const { data: itemRows, error: itemsErr } = await supabase
      .from("meal_log_items")
      .select("*")
      .eq("meal_log_id", mealId)
      .order("sort_order", { ascending: true });

    if (itemsErr) {
      setLoading(false);
      setError(itemsErr.message);
      setItems([]);
      return;
    }

    const list = (itemRows ?? []) as MealLogItem[];
    setItems(list);

    const compositeIdSet = new Set<string>();
    for (const it of list) {
      const cid = it.composite_meal_id;
      if (cid != null && cid !== "") compositeIdSet.add(cid);
    }
    const compositeIds = Array.from(compositeIdSet);

    if (compositeIds.length > 0) {
      const { data: composites } = await supabase
        .from("composite_meals")
        .select("id, name")
        .eq("user_id", userId)
        .in("id", compositeIds);

      const map: Record<string, string> = {};
      for (const c of composites ?? []) {
        map[(c as CompositeMeal).id] = (c as CompositeMeal).name;
      }
      setCompositeNames(map);
    } else {
      setCompositeNames({});
    }

    setLoading(false);
  }, [supabase, userId, mealId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (authLoading || loading) {
    return (
      <p className="text-sm text-zinc-500">A carregar detalhes…</p>
    );
  }

  if (!userId) {
    return (
      <p className="text-sm text-zinc-600">
        Inicia sessão para veres esta refeição.
      </p>
    );
  }

  if (error) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  if (!meal) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center">
        <p className="text-sm text-zinc-600">
          Não encontrámos este registo ou já não tens permissão para o ver.
        </p>
        <Link
          href="/refeicoes/historico"
          className="mt-4 inline-block text-sm font-medium text-accent underline-offset-2 hover:underline"
        >
          Voltar ao histórico
        </Link>
      </div>
    );
  }

  const hasLines = items.length > 0;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm capitalize text-zinc-600">
            {formatDayLong(meal.logged_on)}
          </p>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
            {mealSlotLabelPt(meal.meal_slot as MealSlot)}
            <span className="ml-2 font-normal tabular-nums text-zinc-500">
              {formatTimePt(meal.logged_at ?? meal.created_at)}
            </span>
          </h2>
        </div>
        <Link
          href={`/refeicoes/registos?edit=${meal.id}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground shadow-md shadow-accent/20 transition active:scale-[0.99]"
        >
          <Pencil className="h-4 w-4" aria-hidden />
          Editar
        </Link>
      </div>

      <MealResultPanel mealLogId={meal.id} />

      <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Totais
        </h3>
        <dl className="mt-3 grid gap-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-zinc-600">Hidratos de carbono</dt>
            <dd className="font-semibold tabular-nums text-zinc-900">
              {meal.grams_carbs} g
            </dd>
          </div>
          {meal.rapid_insulin_units != null && meal.rapid_insulin_units > 0 && (
            <div className="flex justify-between gap-4">
              <dt className="text-zinc-600">Insulina rápida</dt>
              <dd className="font-semibold tabular-nums text-violet-800">
                {meal.rapid_insulin_units} UI
              </dd>
            </div>
          )}
        </dl>
        {meal.note && meal.note.trim() !== "" && (
          <div className="mt-4 border-t border-zinc-100 pt-4">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Nota
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800">
              {meal.note}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {hasLines ? "Ingredientes e linhas" : "Composição"}
        </h3>
        {!hasLines ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Este registo foi feito só com o total de hidratos (sem linhas de
            alimentos). Usa <span className="font-medium">Editar</span> para
            acrescentar ingredientes se precisares.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {items.map((it) => {
              const compositeName = it.composite_meal_id
                ? compositeNames[it.composite_meal_id]
                : null;
              return (
                <li key={it.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 flex-1 font-medium leading-snug text-zinc-900">
                      {it.ingredient_label}
                    </p>
                    <span className="shrink-0 text-sm tabular-nums text-zinc-700">
                      <span className="font-semibold">{it.grams_carbs_line} g</span>
                      <span className="text-zinc-400"> HC</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                    <span className="tabular-nums">{it.grams} g (peso)</span>
                    {it.composite_meal_id && compositeName && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-violet-800">
                        <Layers className="h-3 w-3 shrink-0" aria-hidden />
                        {compositeName}
                      </span>
                    )}
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
