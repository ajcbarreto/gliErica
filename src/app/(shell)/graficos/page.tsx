import Link from "next/link";
import { CalendarRange, LineChart, Syringe } from "lucide-react";

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
        href="/graficos/dia"
        className="group rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50 to-white p-5 shadow-card transition hover:border-emerald-300 hover:shadow-md"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition group-hover:bg-emerald-200/80">
          <CalendarRange className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-4 text-sm font-semibold text-zinc-900">
          Relatório diário
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Curva 24h com refeições e insulina marcadas, KPIs do dia (TIR, média,
          GMI) e cronologia para analisares os impactos ponto a ponto.
        </p>
        <p className="mt-3 text-xs font-medium text-emerald-700">
          Abrir relatório →
        </p>
      </Link>

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

      <Link
        href="/graficos/libre"
        className="group rounded-2xl border border-zinc-200/90 bg-surface p-5 shadow-card transition hover:border-accent/40 hover:shadow-md"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent transition group-hover:bg-accent/25">
          <LineChart className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-4 text-sm font-semibold text-zinc-900">
          Glicemia — histórico Libre
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600">
          Curva com os pontos guardados (24 h a 14 dias). O estado actual e as
          últimas horas continuam no dashboard (separado deste histórico).
        </p>
        <p className="mt-3 text-xs font-medium text-accent">
          Abrir histórico →
        </p>
      </Link>

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
