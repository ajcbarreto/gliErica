import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MealImpactAnalysisSection } from "@/components/MealImpactAnalysisSection";

export default function RefeicoesAnalisePage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-3">
        <Link
          href="/refeicoes"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Refeições
        </Link>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            CGM + hidratos
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Análise de impacto
          </h1>
          <p className="text-sm text-zinc-400">
            Cruza registos favoritos com a curva Libre (1 h após a refeição).
          </p>
        </div>
      </header>

      <MealImpactAnalysisSection />
    </div>
  );
}
