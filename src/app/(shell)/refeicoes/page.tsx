import Link from "next/link";
import { BarChart3, BookOpen, ChevronRight, ClipboardList, Layers } from "lucide-react";

const links = [
  {
    href: "/biblioteca",
    title: "Biblioteca de alimentos",
    description: "Pesquisa, favoritos e registo a partir da tua lista.",
    Icon: BookOpen,
  },
  {
    href: "/refeicoes/registos",
    title: "Registo de refeições",
    description:
      "Pequeno-almoço, almoço, etc. — HC, insulina rápida e histórico.",
    Icon: ClipboardList,
  },
  {
    href: "/refeicoes/composta",
    title: "Refeições compostas",
    description: "Combina vários alimentos numa refeição guardada.",
    Icon: Layers,
  },
  {
    href: "/refeicoes/analise",
    title: "Análise de impacto",
    description: "Scores com base na curva Libre após refeições favoritas.",
    Icon: BarChart3,
  },
] as const;

export default function RefeicoesPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Nutrição
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Refeições
        </h1>
        <p className="text-sm text-zinc-600">
          Biblioteca, diário de refeições (HC + insulina), refeições compostas e
          análises — dados no Supabase.
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
