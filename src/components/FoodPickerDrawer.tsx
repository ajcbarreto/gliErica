"use client";

import { useMemo, useState } from "react";
import { Drawer as VaulDrawer } from "vaul";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import type { EquivFood, Food, TcaFood } from "@/types/database";
import type { OpenFoodFactsHit } from "@/lib/open-food-facts/map-product";
import { foodMetaLine } from "@/lib/food-meta";
import {
  ArrowLeft,
  BookOpen,
  Globe2,
  Plus,
  Scale,
  Search,
  X,
} from "lucide-react";

function equivCarbsPer100g(row: EquivFood): number {
  if (row.portion_g <= 0) return 0;
  return Math.round((row.portion_carbs_g / row.portion_g) * 100 * 10) / 10;
}

function equivPortionLabel(row: EquivFood): string {
  if (row.portion_kind === "equivalent") {
    return `${row.portion_g} g = 10 g HC`;
  }
  return `1 un ~ ${row.portion_g} g · ${row.portion_carbs_g} g HC`;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foods: Food[];
  /** Chamado quando o utilizador escolhe um alimento (existente, criado ou importado). */
  onPick: (food: Food, grams: number) => void;
  /** Chamado quando um novo alimento é inserido em `foods` (catálogo ou criação manual). */
  onFoodInserted?: (food: Food) => void;
  /** Gramas por defeito para o formulário de criação e para escolhas rápidas. */
  defaultGrams?: number;
};

export function FoodPickerDrawer({
  open,
  onOpenChange,
  foods,
  onPick,
  onFoodInserted,
  defaultGrams = 100,
}: Props) {
  const supabase = createClient();
  const { userId } = useAuthUser();

  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "create">("list");

  const [tcaResults, setTcaResults] = useState<TcaFood[]>([]);
  const [offResults, setOffResults] = useState<OpenFoodFactsHit[]>([]);
  const [equivResults, setEquivResults] = useState<EquivFood[]>([]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [onlineSearched, setOnlineSearched] = useState(false);
  const [addingOnlineKey, setAddingOnlineKey] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createCarbs, setCreateCarbs] = useState("");
  const [createBrand, setCreateBrand] = useState("");
  const [createRetailer, setCreateRetailer] = useState("");
  const [createFavorite, setCreateFavorite] = useState(false);
  const [createGrams, setCreateGrams] = useState(String(defaultGrams));
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return foods;
    return foods.filter((f) => {
      const meta = `${f.brand ?? ""} ${f.retailer ?? ""}`.toLowerCase();
      return f.name.toLowerCase().includes(q) || meta.includes(q);
    });
  }, [foods, search]);

  function resetCreateForm() {
    setCreateName("");
    setCreateCarbs("");
    setCreateBrand("");
    setCreateRetailer("");
    setCreateFavorite(false);
    setCreateGrams(String(defaultGrams));
    setCreateError(null);
  }

  function fullClose() {
    setSearch("");
    setView("list");
    setTcaResults([]);
    setOffResults([]);
    setEquivResults([]);
    setOnlineSearched(false);
    setOnlineError(null);
    resetCreateForm();
    onOpenChange(false);
  }

  function openCreateView(prefill?: {
    name?: string;
    brand?: string | null;
  }) {
    resetCreateForm();
    setCreateName((prefill?.name ?? search).trim());
    if (prefill?.brand) setCreateBrand(prefill.brand);
    setView("create");
  }

  async function runOnlineSearch() {
    const q = search.trim();
    if (q.length < 2) {
      setOnlineError("Escreve pelo menos 2 letras para pesquisar.");
      return;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOnlineError("Sem rede — catálogos online precisam de ligação.");
      return;
    }
    setOnlineError(null);
    setOnlineLoading(true);
    setOnlineSearched(true);
    const safe = q.replace(/[%_]/g, "");
    try {
      const [tcaRes, offRes, equivRes] = await Promise.all([
        supabase
          .from("tca_foods")
          .select(
            "cod,name,carbs_per_100g,foodex_level1,foodex_level2,foodex_level3,tca_version"
          )
          .ilike("name", `%${safe}%`)
          .order("name", { ascending: true })
          .limit(20),
        fetch(
          `/api/open-food-facts/search?q=${encodeURIComponent(q)}&scope=portugal`
        ),
        supabase
          .from("equiv_foods")
          .select("*")
          .ilike("name", `%${safe}%`)
          .order("category", { ascending: true })
          .order("sort_order", { ascending: true })
          .limit(15),
      ]);
      setTcaResults((tcaRes.data ?? []) as TcaFood[]);
      setEquivResults((equivRes.data ?? []) as EquivFood[]);
      if (offRes.ok) {
        const offData = (await offRes.json()) as {
          products?: OpenFoodFactsHit[];
        };
        setOffResults(offData.products ?? []);
      } else {
        setOffResults([]);
      }
    } catch {
      setOnlineError("Erro ao consultar catálogos online.");
    } finally {
      setOnlineLoading(false);
    }
  }

  async function addCatalogFoodAndUse(
    sourceKey: string,
    payload: {
      name: string;
      carbs_per_100g: number;
      brand: string | null;
      retailer: string | null;
    }
  ) {
    if (!userId) {
      setOnlineError("Sessão inválida.");
      return;
    }
    setAddingOnlineKey(sourceKey);
    setOnlineError(null);
    const { data, error } = await supabase
      .from("foods")
      .insert({
        user_id: userId,
        name: payload.name,
        carbs_per_100g: payload.carbs_per_100g,
        is_favorite: false,
        brand: payload.brand,
        retailer: payload.retailer,
      })
      .select()
      .single();
    setAddingOnlineKey(null);
    if (error || !data) {
      setOnlineError(error?.message ?? "Erro ao guardar alimento.");
      return;
    }
    const newFood = data as Food;
    if (onFoodInserted) onFoodInserted(newFood);
    onPick(newFood, defaultGrams);
    fullClose();
  }

  async function submitCreateFood(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    const name = createName.trim();
    const carbs = parseFloat(createCarbs.replace(",", "."));
    const grams = Math.round(parseFloat(createGrams.replace(",", ".")));
    if (!name) {
      setCreateError("Indica o nome do alimento.");
      return;
    }
    if (!Number.isFinite(carbs) || carbs < 0) {
      setCreateError("HC por 100 g inválido.");
      return;
    }
    if (!Number.isFinite(grams) || grams <= 0) {
      setCreateError("Gramas inválidas.");
      return;
    }
    if (!userId) {
      setCreateError("Sessão inválida.");
      return;
    }
    setCreateSaving(true);
    const { data, error } = await supabase
      .from("foods")
      .insert({
        user_id: userId,
        name,
        carbs_per_100g: carbs,
        is_favorite: createFavorite,
        brand: createBrand.trim() || null,
        retailer: createRetailer.trim() || null,
      })
      .select()
      .single();
    setCreateSaving(false);
    if (error || !data) {
      setCreateError(error?.message ?? "Erro ao guardar alimento.");
      return;
    }
    const newFood = data as Food;
    if (onFoodInserted) onFoodInserted(newFood);
    onPick(newFood, grams);
    fullClose();
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(o) => {
        if (!o) fullClose();
      }}
    >
      <DrawerContent
        showHandle
        className="flex flex-col px-0 pt-0"
      >
        <VaulDrawer.Title className="sr-only">
          {view === "create" ? "Novo alimento" : "Escolher alimento"}
        </VaulDrawer.Title>

        {view === "list" ? (
          <>
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 pb-3 pt-1">
              <h2 className="text-lg font-semibold text-zinc-900">
                Escolher alimento
              </h2>
              <button
                type="button"
                onClick={() => fullClose()}
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runOnlineSearch();
                  }
                }}
                className="w-full rounded-xl border border-zinc-200 py-2.5 pl-10 pr-3 text-sm outline-none ring-accent/30 focus:ring-2"
              />
            </div>
            <div className="border-b border-zinc-100 px-3 py-2">
              <button
                type="button"
                onClick={() => openCreateView()}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-accent/40 bg-accent/5 px-3 py-2.5 text-left text-sm font-medium text-accent transition hover:bg-accent/10"
              >
                <Plus className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {search.trim()
                    ? `Criar "${search.trim()}"`
                    : "Criar novo alimento"}
                </span>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-3 pt-2">
                <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Os meus alimentos
                </p>
                {filtered.length === 0 ? (
                  <p className="px-1 py-3 text-xs text-zinc-500">
                    {foods.length === 0
                      ? "Ainda sem alimentos guardados."
                      : "Nada encontrado nos teus alimentos."}
                  </p>
                ) : (
                  <ul className="space-y-0.5 pb-2">
                    {filtered.map((f) => {
                      const meta = foodMetaLine(f);
                      return (
                        <li key={f.id}>
                          <button
                            type="button"
                            onClick={() => {
                              onPick(f, defaultGrams);
                              fullClose();
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-900 hover:bg-zinc-100"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block truncate">{f.name}</span>
                              {meta && (
                                <span className="block truncate text-xs text-zinc-500">
                                  {meta}
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 text-xs text-zinc-500">
                              {f.carbs_per_100g} g/100g
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="border-t border-zinc-100 px-3 pt-3 pb-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                    Catálogos online
                  </p>
                  <button
                    type="button"
                    onClick={() => void runOnlineSearch()}
                    disabled={onlineLoading}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
                  >
                    <Globe2 className="h-3.5 w-3.5" aria-hidden />
                    {onlineLoading ? "A pesquisar…" : "Pesquisar online"}
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-zinc-500">
                  Equivalentes de HC + TCA (INSA) + Open Food Facts. Ao escolher
                  um resultado, é guardado em &quot;Os meus alimentos&quot;.
                </p>
                {onlineError && (
                  <p className="mt-2 text-[11px] text-amber-800" role="status">
                    {onlineError}
                  </p>
                )}
                {onlineSearched && !onlineLoading && (
                  <div className="mt-2 space-y-3">
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-700">
                        <Scale className="h-3 w-3 text-amber-700" aria-hidden />
                        Equivalentes (10 g HC)
                      </p>
                      {equivResults.length === 0 ? (
                        <p className="px-1 text-[11px] text-zinc-500">
                          Sem resultados na tabela de equivalentes.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {equivResults.map((row) => {
                            const k = `equiv:${row.id}`;
                            const cp100 = equivCarbsPer100g(row);
                            return (
                              <li
                                key={k}
                                className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-white px-2 py-1.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs text-zinc-900">
                                    {row.name}
                                  </p>
                                  <p className="text-[10px] tabular-nums text-zinc-500">
                                    {equivPortionLabel(row)} · ~{cp100} g/100g
                                  </p>
                                  {row.household_measure && (
                                    <p className="truncate text-[10px] text-zinc-500">
                                      {row.household_measure}
                                    </p>
                                  )}
                                </div>
                                <button
                                  type="button"
                                  disabled={addingOnlineKey === k}
                                  onClick={() =>
                                    void addCatalogFoodAndUse(k, {
                                      name: row.name,
                                      carbs_per_100g: cp100,
                                      brand: null,
                                      retailer: null,
                                    })
                                  }
                                  className="shrink-0 rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                                >
                                  {addingOnlineKey === k
                                    ? "…"
                                    : "Guardar e usar"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-700">
                        <BookOpen
                          className="h-3 w-3 text-sky-700"
                          aria-hidden
                        />
                        TCA (INSA)
                      </p>
                      {tcaResults.length === 0 ? (
                        <p className="px-1 text-[11px] text-zinc-500">
                          Sem resultados na TCA.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {tcaResults.map((row) => {
                            const k = `tca:${row.cod}`;
                            return (
                              <li
                                key={k}
                                className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-white px-2 py-1.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs text-zinc-900">
                                    {row.name}
                                  </p>
                                  <p className="text-[10px] tabular-nums text-zinc-500">
                                    {row.carbs_per_100g} g/100g
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={addingOnlineKey === k}
                                  onClick={() =>
                                    void addCatalogFoodAndUse(k, {
                                      name: row.name,
                                      carbs_per_100g: row.carbs_per_100g,
                                      brand: null,
                                      retailer: null,
                                    })
                                  }
                                  className="shrink-0 rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                                >
                                  {addingOnlineKey === k
                                    ? "…"
                                    : "Guardar e usar"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div>
                      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-zinc-700">
                        <Globe2
                          className="h-3 w-3 text-emerald-700"
                          aria-hidden
                        />
                        Open Food Facts
                      </p>
                      {offResults.length === 0 ? (
                        <p className="px-1 text-[11px] text-zinc-500">
                          Sem resultados na Open Food Facts.
                        </p>
                      ) : (
                        <ul className="space-y-1">
                          {offResults.map((row) => {
                            const k = `off:${row.code}`;
                            const hasCarbs = row.carbs_per_100g != null;
                            const label = row.brand
                              ? `${row.brand} — ${row.name}`
                              : row.name;
                            return (
                              <li
                                key={k}
                                className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-white px-2 py-1.5"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-xs text-zinc-900">
                                    {label}
                                  </p>
                                  <p className="text-[10px] tabular-nums text-zinc-500">
                                    {hasCarbs
                                      ? `${row.carbs_per_100g} g/100g`
                                      : "Sem HC/100g — preenche manualmente"}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={addingOnlineKey === k}
                                  onClick={() => {
                                    if (hasCarbs) {
                                      void addCatalogFoodAndUse(k, {
                                        name: label,
                                        carbs_per_100g: row.carbs_per_100g!,
                                        brand: row.brand,
                                        retailer: null,
                                      });
                                    } else {
                                      openCreateView({
                                        name: label,
                                        brand: row.brand,
                                      });
                                    }
                                  }}
                                  className="shrink-0 rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                                >
                                  {addingOnlineKey === k
                                    ? "…"
                                    : hasCarbs
                                      ? "Guardar e usar"
                                      : "Preencher"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-zinc-100 px-2 pb-3 pt-1">
              <button
                type="button"
                onClick={() => setView("list")}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Voltar
              </button>
              <h2 className="text-sm font-semibold text-zinc-900">
                Novo alimento
              </h2>
              <button
                type="button"
                onClick={() => fullClose()}
                className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => void submitCreateFood(e)}
              className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
            >
              <div>
                <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                  Nome
                </label>
                <input
                  autoFocus
                  placeholder="ex: Pão integral"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
                />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                    Marca (opcional)
                  </label>
                  <input
                    value={createBrand}
                    onChange={(e) => setCreateBrand(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                    Loja (opcional)
                  </label>
                  <input
                    placeholder="ex.: Continente"
                    value={createRetailer}
                    onChange={(e) => setCreateRetailer(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
                  />
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                    HC (g) / 100 g
                  </label>
                  <input
                    inputMode="decimal"
                    placeholder="ex: 42"
                    value={createCarbs}
                    onChange={(e) => setCreateCarbs(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                    Gramas a adicionar
                  </label>
                  <input
                    inputMode="numeric"
                    value={createGrams}
                    onChange={(e) => setCreateGrams(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
                  />
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-700">
                <input
                  type="checkbox"
                  checked={createFavorite}
                  onChange={(e) => setCreateFavorite(e.target.checked)}
                  className="rounded border-zinc-300 bg-white text-accent focus:ring-accent"
                />
                Marcar como favorito
              </label>
              {createError && (
                <p className="text-xs text-red-600" role="alert">
                  {createError}
                </p>
              )}
              <button
                type="submit"
                disabled={createSaving}
                className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition active:scale-[0.99] disabled:opacity-50"
              >
                {createSaving ? "A guardar…" : "Guardar e adicionar"}
              </button>
            </form>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
}
