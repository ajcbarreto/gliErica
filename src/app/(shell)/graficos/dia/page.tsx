import { Suspense } from "react";
import { DailyReportClient } from "@/components/DailyReportClient";

export default function GraficosDiaPage() {
  return (
    <Suspense
      fallback={
        <p className="text-sm text-zinc-500">A carregar relatório…</p>
      }
    >
      <DailyReportClient />
    </Suspense>
  );
}
