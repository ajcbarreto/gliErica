"use client";

import Link from "next/link";
import { useFoodLibrary } from "@/hooks/useFoodLibrary";
import { usePullToRefresh } from "@/lib/use-pull-refresh";
import { OpenFoodFactsPanel } from "@/components/OpenFoodFactsPanel";
import { TcaFoodsPanel } from "@/components/TcaFoodsPanel";
import { ArrowLeft, Plus, UtensilsCrossed, WifiOff } from "lucide-react";

export function ExploreFoodsClient() {
  const {
    online,
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
    applyCatalogFood,
    applyOffProduct,
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
            href="/biblioteca/meus-alimentos"
            className="text-sm font-medium text-accent underline-offset-2 hover:underline"
          >
            Os meus alimentos
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
              Explorar / adicionar
            </h1>
            <p className="text-sm text-zinc-600">
              TCA (INSA), Open Food Facts e criação de alimentos na tua lista.
            </p>
            {!online && (
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                <WifiOff className="h-3.5 w-3.5" aria-hidden />
                Catálogos em linha precisam de rede; o formulário pode usar a fila offline.
              </p>
            )}
          </div>
        </div>
      </header>

      <TcaFoodsPanel
        online={online}
        onApplyFood={(name, carbs) => applyCatalogFood(name, carbs)}
      />

      <OpenFoodFactsPanel
        online={online}
        onApplyProduct={(name, carbs) => applyOffProduct(name, carbs)}
      />

      <form
        onSubmit={(e) => void handleAddFood(e)}
        className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
      >
        <p className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900">
          <Plus className="h-4 w-4 text-accent" aria-hidden />
          Novo alimento
        </p>
        <div className="grid gap-3">
          <input
            placeholder="Nome (ex: Pão integral)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
          />
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[11px] font-medium text-zinc-500">
                HC (g) / 100 g
              </label>
              <input
                inputMode="decimal"
                placeholder="ex: 42"
                value={newCarbs}
                onChange={(e) => setNewCarbs(e.target.value)}
                className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2.5 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-xs text-zinc-600">
              <input
                type="checkbox"
                checked={newFavorite}
                onChange={(e) => setNewFavorite(e.target.checked)}
                className="rounded border-zinc-300 bg-white text-accent focus:ring-accent"
              />
              Favorito
            </label>
          </div>
          {formError && (
            <p className="text-xs text-red-600" role="alert">
              {formError}
            </p>
          )}
          <button
            type="submit"
            disabled={adding}
            className="rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {adding ? "A guardar…" : "Adicionar à biblioteca"}
          </button>
        </div>
      </form>
    </div>
  );
}
