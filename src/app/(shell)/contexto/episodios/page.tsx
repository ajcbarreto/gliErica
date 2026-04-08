import { GlycemicEventsClient } from "@/components/contexto/GlycemicEventsClient";

export default function ContextoEpisodiosPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Contexto clínico
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Hipos e hipers
        </h1>
        <p className="text-sm text-zinc-600">
          Episódios com hora; opcionalmente glicemia e HC tomados na hipo.
        </p>
      </header>

      <GlycemicEventsClient />
    </div>
  );
}
