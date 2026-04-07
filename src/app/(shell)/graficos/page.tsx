import Link from "next/link";
import { LineChart } from "lucide-react";

export default function GraficosPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Tendências
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Gráficos
        </h1>
        <p className="text-sm text-zinc-400">
          Curvas de glicemia e análises de refeição.
        </p>
      </header>

      <div className="rounded-2xl border border-white/5 bg-surface p-5 shadow-card">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
          <LineChart className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-4 text-sm font-medium text-white">
          Glicemia (LibreLinkUp)
        </p>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          A curva das últimas horas e o estado atual estão no{" "}
          <Link href="/dashboard" className="text-accent underline">
            dashboard
          </Link>
          . Aqui podes guardar mais gráficos quando houver dados próprios na app
          (por exemplo hidratos ao longo do tempo).
        </p>
      </div>

      <div className="rounded-2xl border border-dashed border-white/10 bg-surface/50 p-4">
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
