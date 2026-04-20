import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  CarbGoalPanel,
  CorrectionSensitivityPanel,
  EmergencyContactPanel,
  InsulinRulePanel,
  LibreChartZonePanel,
  WaterGoalPanel,
} from "@/components/SettingsPanels";

export default function DefinicoesMetasTerapiaPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-3">
        <Link
          href="/definicoes"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-accent"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Definições
        </Link>
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Glicemia e metas
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Metas e terapêutica
          </h1>
          <p className="text-sm text-zinc-600">
            Metas diárias, regras de insulina, zona no gráfico e contacto de
            emergência.
          </p>
        </div>
      </header>

      <CarbGoalPanel />

      <WaterGoalPanel />

      <InsulinRulePanel />

      <LibreChartZonePanel />

      <CorrectionSensitivityPanel />

      <EmergencyContactPanel />
    </div>
  );
}
