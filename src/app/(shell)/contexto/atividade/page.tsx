import { ActivityLogClient } from "@/components/contexto/ActivityLogClient";

export default function ContextoAtividadePage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Contexto clínico
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Atividade física
        </h1>
        <p className="text-sm text-zinc-600">
          Exercício com início, duração e intensidade opcional.
        </p>
      </header>

      <ActivityLogClient />
    </div>
  );
}
