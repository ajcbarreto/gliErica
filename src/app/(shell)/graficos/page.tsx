import Link from "next/link";
import { LineChart, Syringe } from "lucide-react";

export default function GraficosPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Tendências
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Gráficos
        </h1>
        <p className="text-sm text-zinc-600">
          Curvas de glicemia e análises com os teus dados na app.
        </p>
      </header>

      <Link
        href="/graficos/insulina-hc"
        className="group rounded-2xl border border-violet-200/90 bg-gradient-to-br from-violet-50 to-white p-5 shadow-card transition hover:border-violet-300 hover:shadow-md"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700 transition group-hover:bg-violet-200/80">
          <Syringe className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-4 text-sm font-semibold text-zinc-900">
          Insulina rápida vs hidratos
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Gráficos por dia, mediana de gramas por UI e comparação com a regra das
          Definições — para afinar quantos gramas de HC cada UI cobre (com
          calma e equipa de saúde).
        </p>
        <p className="mt-3 text-xs font-medium text-violet-700">
          Abrir análise →
        </p>
      </Link>

      <div className="rounded-2xl border border-zinc-200/90 bg-surface p-5 shadow-card">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <LineChart className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-4 text-sm font-medium text-zinc-900">
          Glicemia (LibreLinkUp)
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          A curva das últimas horas e o estado atual estão no{" "}
          <Link href="/dashboard" className="text-accent underline">
            dashboard
          </Link>
          .
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-200 bg-surface/50 p-4">
        <p className="text-xs leading-relaxed text-zinc-500">
          A página de{" "}
          <Link href="/refeicoes/analise" className="text-accent underline">
            análise de refeições
          </Link>{" "}
          cruza registos de HC favoritos com a curva Libre.
        </p>
      </div>
    </div>
  );
}
