import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Bell,
  ChevronRight,
  FileDown,
  KeyRound,
  Shield,
  User,
} from "lucide-react";
import { AppLogo } from "@/components/AppLogo";

type Row = {
  label: string;
  desc: string;
  icon: LucideIcon;
  href: `/definicoes${string}`;
};

const contaRows: Row[] = [
  {
    label: "Sessão",
    desc: "Email e terminar sessão",
    icon: KeyRound,
    href: "/definicoes/conta",
  },
  {
    label: "Perfil",
    desc: "Nome e dados pessoais",
    icon: User,
    href: "/definicoes/perfil",
  },
  {
    label: "Notificações",
    desc: "Lembretes e alertas",
    icon: Bell,
    href: "/definicoes/notificacoes",
  },
  {
    label: "Privacidade",
    desc: "Como tratamos os teus dados",
    icon: Shield,
    href: "/definicoes/privacidade",
  },
];

const metasRows: Row[] = [
  {
    label: "Metas e terapêutica",
    desc: "HC, água, insulina, gráfico e emergência",
    icon: Activity,
    href: "/definicoes/metas-e-terapia",
  },
];

const dadosRows: Row[] = [
  {
    label: "Exportar relatório",
    desc: "CSV ou PDF para a consulta",
    icon: FileDown,
    href: "/definicoes/dados",
  },
];

function SettingsSection({
  title,
  rows,
}: {
  title: string;
  rows: Row[];
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-zinc-200/90 bg-surface shadow-card">
        <ul className="divide-y divide-zinc-200">
          {rows.map(({ label, desc, icon: Icon, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition active:bg-zinc-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900">{label}</p>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
                <ChevronRight
                  className="h-5 w-5 shrink-0 text-zinc-400"
                  aria-hidden
                />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function DefinicoesPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          GliErica
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Definições
        </h1>
        <p className="text-sm text-zinc-600">
          Conta, metas de glicemia e exportação — cada área num sítio próprio.
        </p>
      </header>

      <SettingsSection title="Conta" rows={contaRows} />
      <SettingsSection title="Glicemia e metas" rows={metasRows} />
      <SettingsSection title="Dados" rows={dadosRows} />

      <div className="flex flex-col items-center gap-2 pt-2">
        <AppLogo className="h-12 w-12" />
        <p className="text-center text-xs text-zinc-600">
          GliErica by TeixeiraBarreto
        </p>
      </div>
    </div>
  );
}
