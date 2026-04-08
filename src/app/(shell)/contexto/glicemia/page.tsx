import { GlucoseManualClient } from "@/components/contexto/GlucoseManualClient";

export default function ContextoGlicemiaPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Contexto clínico
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Glicemia manual
        </h1>
        <p className="text-sm text-zinc-600">
          Regista leituras que não vêm do Libre, com unidade e origem.
        </p>
      </header>

      <GlucoseManualClient />
    </div>
  );
}
