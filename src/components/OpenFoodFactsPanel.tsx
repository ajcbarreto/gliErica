"use client";

import { useCallback, useState } from "react";
import type { OpenFoodFactsHit } from "@/lib/open-food-facts/map-product";
import { Globe2, MapPin, PackageSearch, ScanBarcode } from "lucide-react";

type Scope = "portugal" | "world";

type Props = {
  online: boolean;
  /** Preenche o formulário «Novo alimento»; se carbs for null, só o nome é preenchido. */
  onApplyProduct: (name: string, carbsPer100g: number | null) => void;
};

export function OpenFoodFactsPanel({ online, onApplyProduct }: Props) {
  const [scope, setScope] = useState<Scope>("portugal");
  const [query, setQuery] = useState("");
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<OpenFoodFactsHit[]>([]);

  const runSearch = useCallback(async () => {
    setError(null);
    const q = query.trim();
    if (q.length < 2) {
      setError("Escreve pelo menos 2 letras para pesquisar.");
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const sp = new URLSearchParams({ q, scope });
      const res = await fetch(`/api/open-food-facts/search?${sp}`);
      const data = (await res.json()) as {
        error?: string;
        products?: OpenFoodFactsHit[];
      };
      if (!res.ok) {
        setError(data.error ?? "Pesquisa falhou.");
        return;
      }
      setResults(data.products ?? []);
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, [query, scope]);

  const applyHit = useCallback(
    (hit: OpenFoodFactsHit) => {
      const label = hit.brand ? `${hit.brand} — ${hit.name}` : hit.name;
      onApplyProduct(label, hit.carbs_per_100g);
    },
    [onApplyProduct]
  );

  const runBarcode = useCallback(async () => {
    setError(null);
    const code = barcode.replace(/\D/g, "");
    if (code.length < 8 || code.length > 14) {
      setError("Indica um código de barras (8 a 14 dígitos).");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/open-food-facts/product?code=${encodeURIComponent(code)}`
      );
      const data = (await res.json()) as {
        error?: string;
        product?: OpenFoodFactsHit;
      };
      if (!res.ok) {
        setError(data.error ?? "Produto não encontrado.");
        return;
      }
      if (data.product) {
        setResults([data.product]);
        applyHit(data.product);
      }
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(false);
    }
  }, [barcode, applyHit]);

  if (!online) {
    return (
      <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 text-sm text-zinc-600">
        <p className="flex items-center gap-2 font-medium text-zinc-700">
          <PackageSearch className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          Open Food Facts
        </p>
        <p className="mt-2 text-xs leading-relaxed">
          Pesquisa de produtos requer ligação à Internet. Volta a tentar quando estiveres
          online.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/40 p-4 shadow-card">
      <p className="mb-3 flex items-center gap-2 text-sm font-medium text-zinc-900">
        <PackageSearch className="h-4 w-4 text-emerald-700" aria-hidden />
        Open Food Facts
      </p>
      <p className="mb-3 text-xs leading-relaxed text-zinc-600">
        Produtos embalados (ex.: supermercado). Os hidratos vêm da etiqueta nutricional
        na base comunitária — confirma no teu pacote se for crítico.
      </p>

      <div className="mb-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setScope("portugal")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            scope === "portugal"
              ? "border-emerald-600/40 bg-emerald-100/80 text-emerald-900"
              : "border-zinc-200 bg-white text-zinc-600"
          }`}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden />
          Portugal
        </button>
        <button
          type="button"
          onClick={() => setScope("world")}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
            scope === "world"
              ? "border-emerald-600/40 bg-emerald-100/80 text-emerald-900"
              : "border-zinc-200 bg-white text-zinc-600"
          }`}
        >
          <Globe2 className="h-3.5 w-3.5" aria-hidden />
          Mundo
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          inputMode="numeric"
          placeholder="Código de barras"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-emerald-500/25 focus:ring-2 sm:max-w-[11rem]"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void runBarcode()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          <ScanBarcode className="h-4 w-4" aria-hidden />
          Procurar código
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          placeholder="Nome do produto…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch();
            }
          }}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-emerald-500/25 focus:ring-2"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSearch()}
          className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-800 disabled:opacity-50"
        >
          {loading ? "A pesquisar…" : "Pesquisar"}
        </button>
      </div>

      {error && (
        <p className="mb-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white p-2">
          {results.map((hit) => (
            <li
              key={hit.code}
              className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2.5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">{hit.name}</p>
                {hit.brand && (
                  <p className="text-[11px] text-zinc-500">{hit.brand}</p>
                )}
                <p className="text-[11px] tabular-nums text-zinc-500">
                  {hit.carbs_per_100g !== null
                    ? `${hit.carbs_per_100g} g HC / 100 g`
                    : "Sem hidratos por 100 g na base"}
                  {" · "}
                  {hit.code}
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyHit(hit)}
                className="shrink-0 rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white sm:px-3"
              >
                Usar no formulário
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-[10px] leading-relaxed text-zinc-500">
        Dados{" "}
        <a
          href="https://world.openfoodfacts.org"
          target="_blank"
          rel="noreferrer"
          className="text-emerald-800 underline decoration-emerald-600/40 underline-offset-2 hover:decoration-emerald-700"
        >
          Open Food Facts
        </a>{" "}
        (ODbL). Contribuições da comunidade — podem conter erros.
      </p>
    </div>
  );
}
