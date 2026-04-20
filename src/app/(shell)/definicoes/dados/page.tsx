import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExportReportPanel } from "@/components/ExportReportPanel";

export default function DefinicoesDadosPage() {
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
            Dados
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Exportar relatório
          </h1>
          <p className="text-sm text-zinc-600">
            Descarrega os teus registos para partilhar na consulta ou arquivo.
          </p>
        </div>
      </header>

      <ExportReportPanel />
    </div>
  );
}
