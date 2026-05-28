import Link from "next/link";
import { BookOpen, ChevronRight, Compass, Scale } from "lucide-react";

export default function BibliotecaPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Nutrição
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Biblioteca
        </h1>
        <p className="text-sm text-zinc-600">
          A tua lista pessoal ou importação de catálogos — escolhe por onde começar.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        <li>
          <Link
            href="/biblioteca/meus-alimentos"
            className="flex w-full items-center gap-4 rounded-2xl border border-zinc-200/90 bg-surface p-4 text-left shadow-card transition active:scale-[0.98] active:bg-surface-elevated"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <BookOpen className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">Os meus alimentos</p>
              <p className="text-xs text-zinc-500">
                Pesquisa, favoritos e registo rápido no dia.
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-zinc-600"
              aria-hidden
            />
          </Link>
        </li>
        <li>
          <Link
            href="/biblioteca/explorar"
            className="flex w-full items-center gap-4 rounded-2xl border border-zinc-200/90 bg-surface p-4 text-left shadow-card transition active:scale-[0.98] active:bg-surface-elevated"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-700">
              <Compass className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">Explorar / adicionar</p>
              <p className="text-xs text-zinc-500">
                TCA (INSA), Open Food Facts e novo alimento.
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-zinc-600"
              aria-hidden
            />
          </Link>
        </li>
        <li>
          <Link
            href="/biblioteca/equivalentes"
            className="flex w-full items-center gap-4 rounded-2xl border border-zinc-200/90 bg-surface p-4 text-left shadow-card transition active:scale-[0.98] active:bg-surface-elevated"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
              <Scale className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">Equivalentes de HC</p>
              <p className="text-xs text-zinc-500">
                Tabela clínica de porções: quanto pesar para 10 g de HC.
              </p>
            </div>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-zinc-600"
              aria-hidden
            />
          </Link>
        </li>
      </ul>
    </div>
  );
}
