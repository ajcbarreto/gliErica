import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Dumbbell,
  Gauge,
} from "lucide-react";

const links = [
  {
    href: "/contexto/glicemia",
    title: "Glicemia manual",
    description: "Leituras de tira, laboratório ou outro medidor — com data e hora.",
    Icon: Gauge,
  },
  {
    href: "/contexto/episodios",
    title: "Hipos e hipers",
    description: "Registo de episódios, glicemia opcional e HC de recuperação.",
    Icon: AlertTriangle,
  },
  {
    href: "/contexto/atividade",
    title: "Atividade física",
    description: "Exercício, duração e intensidade para contexto nas consultas.",
    Icon: Dumbbell,
  },
] as const;

export default function ContextoPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Diário
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Contexto clínico
        </h1>
        <p className="text-sm text-zinc-600">
          Dados extra à curva Libre — manual, episódios e exercício. Tudo no
          Supabase (migração 008).
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {links.map(({ href, title, description, Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex w-full items-center gap-4 rounded-2xl border border-zinc-200/90 bg-surface p-4 text-left shadow-card transition active:scale-[0.98] active:bg-surface-elevated"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-zinc-900">{title}</p>
                <p className="text-xs text-zinc-500">{description}</p>
              </div>
              <ChevronRight
                className="h-5 w-5 shrink-0 text-zinc-600"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
