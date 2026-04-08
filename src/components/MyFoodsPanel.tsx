"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useFoodLibrary } from "@/hooks/useFoodLibrary";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import { roundCarbs, carbsFromFoodGrams } from "@/lib/carb-math";
import {
  ArrowLeft,
  Compass,
  Search,
  Star,
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
    filtered,
    loadFoods,
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

  usePullToRefresh(loadFoods);

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
              Lista pessoal, favoritos e registo rápido no dia.
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
          {search.trim() || favoritesOnly
            ? "Nada corresponde aos filtros."
            : "Ainda não tens alimentos. Importa do catálogo ou cria um em Explorar."}
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
                  setLogError(null);
                  setLogFood(food);
                  setLogGrams("100");
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
