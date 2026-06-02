"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Drawer as VaulDrawer } from "vaul";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { useFoodLibrary } from "@/hooks/useFoodLibrary";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import { roundCarbs, carbsFromFoodGrams } from "@/lib/carb-math";
import { foodMetaLine } from "@/lib/food-meta";
import type { Food } from "@/types/database";
import {
  ArrowLeft,
  Compass,
  Pencil,
  Search,
  Star,
  Store,
  Tag,
  UtensilsCrossed,
  WifiOff,
  X,
} from "lucide-react";

export function MyFoodsPanel() {
  const {
    online,
    loading,
    search,
    setSearch,
    favoritesOnly,
    setFavoritesOnly,
    retailerFilter,
    setRetailerFilter,
    brandFilter,
    setBrandFilter,
    retailerOptions,
    brandOptions,
    foodsGroupedByRetailer,
    filtered,
    loadFoods,
    updateFood,
    toggleFavorite,
    logFood,
    setLogFood,
    logGrams,
    setLogGrams,
    logSaving,
    logError,
    setLogError,
    submitLogFood,
  } = useFoodLibrary();

  const [editFood, setEditFood] = useState<Food | null>(null);
  const [editName, setEditName] = useState("");
  const [editCarbs, setEditCarbs] = useState("");
  const [editBrand, setEditBrand] = useState("");
  const [editRetailer, setEditRetailer] = useState("");
  const [editFavorite, setEditFavorite] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  usePullToRefresh(loadFoods);

  useEffect(() => {
    if (!editFood) return;
    setEditName(editFood.name);
    setEditCarbs(String(editFood.carbs_per_100g));
    setEditBrand(editFood.brand ?? "");
    setEditRetailer(editFood.retailer ?? "");
    setEditFavorite(editFood.is_favorite);
    setEditError(null);
  }, [editFood]);

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editFood) return;
    setEditError(null);
    const carbs = parseFloat(editCarbs.replace(",", "."));
    if (!editName.trim()) {
      setEditError("Indica o nome do alimento.");
      return;
    }
    if (Number.isNaN(carbs) || carbs < 0) {
      setEditError("HC por 100 g inválido.");
      return;
    }
    setEditSaving(true);
    const { error } = await updateFood(editFood.id, {
      name: editName.trim(),
      carbs_per_100g: carbs,
      is_favorite: editFavorite,
      brand: editBrand.trim() ? editBrand.trim() : null,
      retailer: editRetailer.trim() ? editRetailer.trim() : null,
    });
    setEditSaving(false);
    if (error) {
      setEditError(error);
      return;
    }
    setEditFood(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/refeicoes"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-accent"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Refeições
          </Link>
          <Link
            href="/biblioteca/explorar"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-surface px-2.5 py-1 text-xs font-medium text-accent transition hover:bg-accent/10"
          >
            <Compass className="h-3.5 w-3.5" aria-hidden />
            Explorar / adicionar
          </Link>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
            <UtensilsCrossed className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Biblioteca
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              Os meus alimentos
            </h1>
            <p className="text-sm text-zinc-600">
              Lista por loja, filtros e edição de marca / loja.
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

      <div className="flex flex-col gap-3">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            type="search"
            placeholder="Pesquisar nome, marca ou loja…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-surface py-2.5 pl-10 pr-3 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
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

          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[14rem]">
            <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500">
              <Store className="h-3 w-3" aria-hidden />
              Loja
            </span>
            <select
              value={retailerFilter}
              onChange={(e) => setRetailerFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            >
              <option value="all">Todas</option>
              <option value="none">Sem loja</option>
              {retailerOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-[14rem]">
            <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500">
              <Tag className="h-3 w-3" aria-hidden />
              Marca
            </span>
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-surface px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            >
              <option value="all">Todas</option>
              <option value="none">Sem marca</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <ul className="flex flex-col gap-2" aria-hidden>
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-2 rounded-2xl border border-zinc-200/90 bg-surface p-3"
            >
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-[min(200px,55vw)]" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-20 rounded-lg" />
            </li>
          ))}
        </ul>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-zinc-200 py-10 text-center text-sm text-zinc-500">
          {search.trim() || favoritesOnly || retailerFilter !== "all" || brandFilter !== "all"
            ? "Nada corresponde aos filtros."
            : "Ainda não tens alimentos. Importa do catálogo ou cria um em Explorar."}
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {foodsGroupedByRetailer.map((section) => (
            <section key={section.label} className="flex flex-col gap-2">
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                {section.label}
                <span className="ml-1.5 font-normal text-zinc-400">
                  ({section.foods.length})
                </span>
              </h2>
              <ul className="flex flex-col gap-2">
                {section.foods.map((food) => {
                  const meta = foodMetaLine(food);
                  return (
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
                        {meta && (
                          <p className="truncate text-xs text-zinc-500">{meta}</p>
                        )}
                        <p className="text-xs text-zinc-500">
                          {food.carbs_per_100g} g HC / 100 g
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col gap-1 sm:flex-row sm:items-center">
                        <button
                          type="button"
                          onClick={() => {
                            setEditError(null);
                            setEditFood(food);
                          }}
                          disabled={food.id.startsWith("temp-")}
                          title={
                            food.id.startsWith("temp-")
                              ? "Aguarda sincronização para editar"
                              : "Editar alimento"
                          }
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setLogError(null);
                            setLogFood(food);
                            setLogGrams("100");
                          }}
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-accent"
                        >
                          Registar hoje
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Drawer
        open={logFood !== null}
        onOpenChange={(open) => {
          if (!open) setLogFood(null);
        }}
      >
        <DrawerContent
          showHandle
          className="max-h-[min(88dvh,560px)] overflow-y-auto px-5 pt-0"
        >
          {logFood ? (
            <>
              <VaulDrawer.Title className="sr-only">
                Registar alimento na biblioteca
              </VaulDrawer.Title>
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
              <div className="mb-3 text-sm text-zinc-600">
                <p className="font-medium text-zinc-900">{logFood.name}</p>
                {foodMetaLine(logFood) && (
                  <p className="mt-0.5 text-xs text-zinc-500">
                    {foodMetaLine(logFood)}
                  </p>
                )}
              </div>
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
            </>
          ) : null}
        </DrawerContent>
      </Drawer>

      <Drawer
        open={editFood !== null}
        onOpenChange={(open) => {
          if (!open) setEditFood(null);
        }}
      >
        <DrawerContent
          showHandle
          className="max-h-[min(92dvh,640px)] overflow-y-auto px-5 pt-0"
        >
          {editFood ? (
            <>
              <VaulDrawer.Title className="sr-only">
                Editar alimento
              </VaulDrawer.Title>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="pr-8 text-lg font-semibold text-zinc-900">
                  Editar alimento
                </h2>
                <button
                  type="button"
                  onClick={() => setEditFood(null)}
                  className="rounded-full p-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={(e) => void submitEdit(e)} className="space-y-3 pb-2">
                <div>
                  <label
                    htmlFor="edit-food-name"
                    className="mb-1 block text-[11px] font-medium text-zinc-500"
                  >
                    Nome
                  </label>
                  <input
                    id="edit-food-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="edit-food-brand"
                      className="mb-1 block text-[11px] font-medium text-zinc-500"
                    >
                      Marca
                    </label>
                    <input
                      id="edit-food-brand"
                      placeholder="Opcional"
                      value={editBrand}
                      onChange={(e) => setEditBrand(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="edit-food-retailer"
                      className="mb-1 block text-[11px] font-medium text-zinc-500"
                    >
                      Loja
                    </label>
                    <input
                      id="edit-food-retailer"
                      placeholder="ex.: Continente"
                      value={editRetailer}
                      onChange={(e) => setEditRetailer(e.target.value)}
                      className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="edit-food-carbs"
                    className="mb-1 block text-[11px] font-medium text-zinc-500"
                  >
                    HC (g) / 100 g
                  </label>
                  <input
                    id="edit-food-carbs"
                    inputMode="decimal"
                    value={editCarbs}
                    onChange={(e) => setEditCarbs(e.target.value)}
                    className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
                  />
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600">
                  <input
                    type="checkbox"
                    checked={editFavorite}
                    onChange={(e) => setEditFavorite(e.target.checked)}
                    className="rounded border-zinc-300 bg-white text-accent focus:ring-accent"
                  />
                  Favorito
                </label>
                {editError && (
                  <p className="text-sm text-red-600" role="alert">
                    {editError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={editSaving}
                  className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-50"
                >
                  {editSaving ? "A guardar…" : "Guardar alterações"}
                </button>
              </form>
            </>
          ) : null}
        </DrawerContent>
      </Drawer>
    </div>
  );
}
