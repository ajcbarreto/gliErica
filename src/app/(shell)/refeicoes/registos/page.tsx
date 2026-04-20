import { Suspense } from "react";
import { MealJournalClient } from "@/components/MealJournalClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function RefeicoesRegistosPage() {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <header className="space-y-1">
        <Link
          href="/refeicoes"
          className="inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Refeições
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Diário
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Registo de refeições
        </h1>
        <p className="text-sm text-zinc-600">
          Linhas de alimentos ou compostas, totais, sugestões do histórico e
          insulina. O histórico recente aparece em baixo; o ecrã completo está
          em Histórico de refeições.
        </p>
      </header>

      <Suspense
        fallback={
          <p className="text-sm text-zinc-500">A carregar registo…</p>
        }
      >
        <MealJournalClient />
      </Suspense>
    </div>
  );
}
