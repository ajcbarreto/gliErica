import Link from "next/link";
import { Bell, ChevronRight, Shield, User } from "lucide-react";
import { AppLogo } from "@/components/AppLogo";
import { AccountSettingsPanel } from "@/components/AccountSettingsPanel";
import { PasskeySettingsPanel } from "@/components/PasskeySettingsPanel";
import { TotpSettingsPanel } from "@/components/TotpSettingsPanel";
import { ExportReportPanel } from "@/components/ExportReportPanel";
import {
  CarbGoalPanel,
  CorrectionSensitivityPanel,
  EmergencyContactPanel,
  InsulinRulePanel,
  LibreChartZonePanel,
  WaterGoalPanel,
} from "@/components/SettingsPanels";

const rows = [
  {
    label: "Perfil",
    desc: "Nome e dados pessoais",
    icon: User,
    href: "/definicoes/perfil" as const,
  },
  {
    label: "Notificações",
    desc: "Lembretes e alertas",
    icon: Bell,
    href: "/definicoes/notificacoes" as const,
  },
  {
    label: "Privacidade",
    desc: "Dados e partilha",
    icon: Shield,
    href: "/definicoes/privacidade" as const,
  },
];

export default function DefinicoesPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Conta
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Definições
        </h1>
        <p className="text-sm text-zinc-600">
          Personaliza a tua experiência na app.
        </p>
      </header>

      <AccountSettingsPanel />

      <TotpSettingsPanel />

      <PasskeySettingsPanel />

      <CarbGoalPanel />

      <WaterGoalPanel />

      <InsulinRulePanel />

      <LibreChartZonePanel />

      <CorrectionSensitivityPanel />

      <EmergencyContactPanel />

      <ExportReportPanel />

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

      <div className="flex flex-col items-center gap-2">
        <AppLogo className="h-12 w-12" />
        <p className="text-center text-xs text-zinc-600">
          GliErica by TeixeiraBarreto
        </p>
      </div>
    </div>
  );
}
