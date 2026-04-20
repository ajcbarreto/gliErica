import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Compass,
  History,
  Layers,
} from "lucide-react";

const links = [
  {
    href: "/refeicoes/registos",
    title: "Registar refeição",
    description:
      "Compositor (alimentos / compostas), sugestões do histórico, HC e insulina.",
    Icon: ClipboardList,
    highlight: true,
  },
  {
    href: "/refeicoes/historico",
    title: "Histórico de refeições",
    description:
      "Lista por dia com HC, insulina e notas — ecrã dedicado para rever tudo.",
    Icon: History,
    highlight: false,
  },
  {
    href: "/biblioteca/meus-alimentos",
    title: "Os meus alimentos",
    description: "Lista pessoal, favoritos e registo rápido no dia.",
    Icon: BookOpen,
    highlight: false,
  },
  {
    href: "/biblioteca/explorar",
    title: "Explorar alimentos",
    description: "TCA (INSA), Open Food Facts e criar alimento novo.",
    Icon: Compass,
    highlight: false,
  },
  {
    href: "/refeicoes/composta",
    title: "Refeições compostas",
    description: "Combina vários alimentos numa refeição guardada.",
    Icon: Layers,
    highlight: false,
  },
  {
    href: "/refeicoes/analise",
    title: "Análise de impacto",
    description: "Scores com base na curva Libre após refeições favoritas.",
    Icon: BarChart3,
    highlight: false,
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
          Registo estruturado, biblioteca em dois ecrãs, refeições compostas e
          análises — dados no Supabase.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {links.map(({ href, title, description, Icon, highlight }) => (
          <li key={href}>
            <Link
              href={href}
              className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left shadow-card transition active:scale-[0.98] active:bg-surface-elevated ${
                highlight
                  ? "border-accent/35 bg-accent/10 ring-1 ring-accent/20"
                  : "border-zinc-200/90 bg-surface"
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  highlight
                    ? "bg-accent text-accent-foreground"
                    : "bg-accent/15 text-accent"
                }`}
              >
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
