import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MealDetailClient } from "@/components/MealDetailClient";

type PageProps = {
  params: { id: string };
};

export default function RefeicaoDetalhePage({ params }: PageProps) {
  const { id } = params;

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <header className="space-y-1">
        <Link
          href="/refeicoes/historico"
          className="inline-flex items-center gap-1 text-xs font-medium text-accent underline-offset-2 hover:underline"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Histórico de refeições
        </Link>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Diário
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Detalhe da refeição
        </h1>
        <p className="text-sm text-zinc-600">
          Ingredientes, quantidades e hidratos por linha.
        </p>
      </header>

      <MealDetailClient mealId={id} />
    </div>
  );
}
