import { MealJournalClient } from "@/components/MealJournalClient";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export default function RefeicoesRegistosPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
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
          Momento do dia, hidratos, insulina rápida e nota — com histórico.
        </p>
      </header>

      <MealJournalClient />
    </div>
  );
}
