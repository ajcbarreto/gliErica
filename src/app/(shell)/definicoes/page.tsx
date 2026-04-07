import { Bell, Shield, User } from "lucide-react";
import { CarbGoalPanel, WaterGoalPanel } from "@/components/SettingsPanels";

const rows = [
  { label: "Perfil", desc: "Nome e dados pessoais", icon: User },
  { label: "Notificações", desc: "Lembretes e alertas", icon: Bell },
  { label: "Privacidade", desc: "Dados e partilha", icon: Shield },
];

export default function DefinicoesPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Conta
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Definições
        </h1>
        <p className="text-sm text-zinc-400">
          Personaliza a tua experiência na app.
        </p>
      </header>

      <CarbGoalPanel />

      <WaterGoalPanel />

      <div className="overflow-hidden rounded-2xl border border-white/5 bg-surface shadow-card">
        <ul className="divide-y divide-white/[0.06]">
          {rows.map(({ label, desc, icon: Icon }) => (
            <li key={label}>
              <button
                type="button"
                className="flex w-full items-center gap-4 px-4 py-3.5 text-left transition active:bg-white/[0.04]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-300">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">{label}</p>
                  <p className="text-xs text-zinc-500">{desc}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-center text-xs text-zinc-600">
        GliErica · Supabase + design system escuro
      </p>
    </div>
  );
}
