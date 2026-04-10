"use client";

import { FileDown } from "lucide-react";

/**
 * Descarrega CSV ou PDF (últimos 14 dias) geridos por /api/export/health-report.
 */
export function ExportReportPanel() {
  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
      <p className="text-sm font-medium text-zinc-900">Relatório para a consulta</p>
      <p className="mt-1 text-xs text-zinc-500">
        Exporta refeições, glicemia manual, insulina e água dos últimos 14 dias.
        Formato simples para enviares por email ou impressão.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href="/api/export/health-report?format=csv"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        >
          <FileDown className="h-4 w-4" aria-hidden />
          CSV
        </a>
        <a
          href="/api/export/health-report?format=pdf"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100"
        >
          <FileDown className="h-4 w-4" aria-hidden />
          PDF
        </a>
      </div>
    </div>
  );
}
