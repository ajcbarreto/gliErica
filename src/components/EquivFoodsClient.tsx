"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import type { EquivFood } from "@/types/database";
import { ArrowLeft, Plus, Scale, Search } from "lucide-react";

function carbsPer100g(row: EquivFood): number {
  if (row.portion_g <= 0) return 0;
  return Math.round((row.portion_carbs_g / row.portion_g) * 100 * 10) / 10;
}

function portionLabel(row: EquivFood): string {
  if (row.portion_kind === "equivalent") {
    return `${row.portion_g} g = 10 g HC`;
  }
  return `1 un ~ ${row.portion_g} g · ${row.portion_carbs_g} g HC`;
}

type AddState = { id: string; status: "saving" | "ok" | "error"; msg?: string };

export function EquivFoodsClient() {
  const supabase = useMemo(() => createClient(), []);
  const { userId, loading: authLoading } = useAuthUser();
  const [rows, setRows] = useState<EquivFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [addStatus, setAddStatus] = useState<Record<string, AddState>>({});
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await supabase
      .from("equiv_foods")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    if (e) {
      setError(
        e.message.includes("equiv_foods")
          ? "Tabela equiv_foods inacessível. Aplica a migração 018_equiv_foods.sql no Supabase."
          : e.message
      );
      setRows([]);
    } else {
      setRows((data ?? []) as EquivFood[]);
    }
    setLoading(false);
  }, [supabase]);

  const loadExistingFoodNames = useCallback(async () => {
    if (!userId) {
      setExistingNames(new Set());
      return;
    }
    const { data } = await supabase
      .from("foods")
      .select("name")
      .eq("user_id", userId);
    const set = new Set<string>();
    for (const r of data ?? []) {
      set.add(String((r as { name: string }).name).trim().toLowerCase());
    }
    setExistingNames(set);
  }, [supabase, userId]);

  usePullToRefresh(load);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadExistingFoodNames();
  }, [loadExistingFoodNames]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of rows) set.add(r.category);
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (category !== "all" && r.category !== category) return false;
      if (!q) return true;
      return r.name.toLowerCase().includes(q);
    });
  }, [rows, search, category]);

  const grouped = useMemo(() => {
    const map = new Map<string, EquivFood[]>();
    for (const r of filtered) {
      const list = map.get(r.category) ?? [];
      list.push(r);
      map.set(r.category, list);
    }
    return Array.from(map.entries());
  }, [filtered]);

  async function addToMyFoods(row: EquivFood) {
    if (!userId) {
      setAddStatus((s) => ({
        ...s,
        [row.id]: { id: row.id, status: "error", msg: "Sessão inválida." },
      }));
      return;
    }
    setAddStatus((s) => ({
      ...s,
      [row.id]: { id: row.id, status: "saving" },
    }));
    const cp100 = carbsPer100g(row);
    const { error: insErr } = await supabase.from("foods").insert({
      user_id: userId,
      name: row.name,
      carbs_per_100g: cp100,
      is_favorite: false,
      brand: null,
      retailer: null,
    });
    if (insErr) {
      setAddStatus((s) => ({
        ...s,
        [row.id]: { id: row.id, status: "error", msg: insErr.message },
      }));
      return;
    }
    setExistingNames((set) => new Set(set).add(row.name.trim().toLowerCase()));
    setAddStatus((s) => ({
      ...s,
      [row.id]: { id: row.id, status: "ok" },
    }));
  }

  if (authLoading) {
    return <p className="text-sm text-zinc-500">A carregar sessão…</p>;
  }

  if (!userId) {
    return (
      <p className="text-sm text-zinc-600">
        Inicia sessão para consultar a tabela de equivalentes.
      </p>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-3">
        <Link
          href="/biblioteca"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Biblioteca
        </Link>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
            <Scale className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Biblioteca
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Equivalentes de HC
            </h1>
            <p className="text-sm text-zinc-600">
              Tabela clínica: quanto pesar (ou que medida caseira) para 10 g de
              hidratos. Para alimentos por unidade, mostramos o peso médio e o
              HC total.
            </p>
          </div>
        </div>
      </header>

      <div className="rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <input
              type="search"
              placeholder="Pesquisar (ex.: arroz, banana, croissant)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-canvas py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-canvas px-2 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2 sm:max-w-[14rem]"
          >
            <option value="all">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">A carregar tabela…</p>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          {error}
        </div>
      ) : grouped.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500">
          Sem resultados.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {grouped.map(([cat, list]) => (
            <section
              key={cat}
              className="rounded-2xl border border-zinc-200/90 bg-surface shadow-card"
            >
              <div className="border-b border-zinc-100 px-4 py-2">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  {cat}
                  <span className="ml-2 font-normal normal-case text-zinc-400">
                    {list.length} {list.length === 1 ? "item" : "itens"}
                  </span>
                </p>
              </div>
              <ul className="divide-y divide-zinc-100">
                {list.map((row) => {
                  const status = addStatus[row.id];
                  const cp100 = carbsPer100g(row);
                  const alreadyExists = existingNames.has(
                    row.name.trim().toLowerCase()
                  );
                  return (
                    <li
                      key={row.id}
                      className="flex flex-wrap items-start gap-3 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-900">
                          {row.name}
                        </p>
                        <p className="mt-0.5 text-[11px] tabular-nums text-zinc-600">
                          {portionLabel(row)}
                          <span className="ml-2 text-zinc-400">
                            (~{cp100} g/100g)
                          </span>
                        </p>
                        {row.household_measure && (
                          <p className="mt-0.5 text-[11px] leading-snug text-zinc-500">
                            {row.household_measure}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        {status?.status === "ok" || alreadyExists ? (
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                            Já na biblioteca
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={status?.status === "saving"}
                            onClick={() => void addToMyFoods(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-800 transition hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50"
                          >
                            <Plus className="h-3.5 w-3.5" aria-hidden />
                            {status?.status === "saving"
                              ? "A guardar…"
                              : "Adicionar"}
                          </button>
                        )}
                      </div>
                      {status?.status === "error" && (
                        <p
                          className="w-full text-[11px] text-red-600"
                          role="alert"
                        >
                          {status.msg ?? "Erro ao guardar."}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <p className="text-[10px] leading-relaxed text-zinc-400">
        Tabela de equivalentes para contagem de hidratos. Valores médios — usa
        como referência clínica, não substitui rotulagem nem orientação da tua
        equipa de saúde.
      </p>
    </div>
  );
}
