"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TcaFood } from "@/types/database";
import { BookOpen, PackageSearch } from "lucide-react";

type Props = {
  online: boolean;
  onApplyFood: (name: string, carbsPer100g: number) => void;
};

function sanitizeIlikeFragment(q: string): string {
  return q.trim().replace(/[%_]/g, "");
}

export function TcaFoodsPanel({ online, onApplyFood }: Props) {
  const supabase = createClient();
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [results, setResults] = useState<TcaFood[]>([]);

  const runSearch = useCallback(async () => {
    setHint(null);
    const safe = sanitizeIlikeFragment(query);
    if (safe.length < 2) {
      setHint("Escreve pelo menos 2 letras.");
      return;
    }
    setLoading(true);
    setResults([]);
    try {
      const { data, error } = await supabase
        .from("tca_foods")
        .select(
          "cod,name,carbs_per_100g,foodex_level1,foodex_level2,foodex_level3,tca_version"
        )
        .ilike("name", `%${safe}%`)
        .order("name", { ascending: true })
        .limit(40);

      if (error) {
        const m = error.message;
        if (
          /tca_foods/i.test(m) &&
          /does not exist|could not find|schema cache|permission denied/i.test(m)
        ) {
          setHint(
            "A tabela tca_foods não está acessível. Aplica a migração 006 no Supabase, importa o Excel (npm run import:tca) e recarrega a página."
          );
        } else {
          setHint(m);
        }
        return;
      }

      const list = (data ?? []) as TcaFood[];
      setResults(list);
      if (list.length === 0) {
        setHint(
          "Nenhum alimento com esse texto. Verifica a grafia ou importa a TCA (Excel) se ainda não o fizeste."
        );
      }
    } catch {
      setHint("Erro ao consultar o Supabase.");
    } finally {
      setLoading(false);
    }
  }, [query, supabase]);

  if (!online) {
    return (
      <div className="rounded-2xl border border-zinc-200/90 bg-zinc-50/80 p-4 text-sm text-zinc-600">
        <p className="flex items-center gap-2 font-medium text-zinc-700">
          <BookOpen className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
          Tabela INSA (TCA)
        </p>
        <p className="mt-2 text-xs leading-relaxed">
          A pesquisa na TCA usa o Supabase e precisa de ligação à Internet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-sky-200/90 bg-sky-50/50 p-4 shadow-card">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium text-zinc-900">
        <BookOpen className="h-4 w-4 text-sky-700" aria-hidden />
        Tabela INSA (TCA)
      </p>
      <p className="mb-3 text-xs leading-relaxed text-zinc-600">
        Alimentos genéricos portugueses (hidratos por 100 g de parte edível). Dados
        importados do Excel do{" "}
        <a
          href="https://portfir.insa.min-saude.pt/pt/"
          target="_blank"
          rel="noreferrer"
          className="text-sky-800 underline decoration-sky-600/40 underline-offset-2"
        >
          PortFIR
        </a>
        .
      </p>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          placeholder="Ex.: arroz, bacalhau, maçã…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void runSearch();
            }
          }}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-sky-500/25 focus:ring-2"
        />
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSearch()}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-sky-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-800 disabled:opacity-50"
        >
          <PackageSearch className="h-4 w-4" aria-hidden />
          {loading ? "A pesquisar…" : "Pesquisar"}
        </button>
      </div>

      {hint && (
        <p className="mb-2 text-xs text-amber-800" role="status">
          {hint}
        </p>
      )}

      {results.length > 0 && (
        <ul className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-zinc-200/80 bg-white p-2">
          {results.map((row) => (
            <li
              key={row.cod}
              className="flex flex-col gap-2 rounded-lg border border-zinc-100 bg-zinc-50/50 p-2.5 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-zinc-900">{row.name}</p>
                {row.foodex_level1 && (
                  <p className="line-clamp-2 text-[11px] text-zinc-500">
                    {row.foodex_level1}
                    {row.foodex_level2 ? ` · ${row.foodex_level2}` : ""}
                  </p>
                )}
                <p className="text-[11px] tabular-nums text-zinc-500">
                  {row.carbs_per_100g} g HC / 100 g · cod. {row.cod}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onApplyFood(row.name, row.carbs_per_100g)}
                className="shrink-0 rounded-lg bg-zinc-900 py-2 text-xs font-medium text-white sm:px-3"
              >
                Usar no formulário
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
