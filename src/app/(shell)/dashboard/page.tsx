import { DashboardCarbSection } from "@/components/DashboardCarbSection";
import { DashboardContextSection } from "@/components/DashboardContextSection";
import { DashboardHypoHost } from "@/components/DashboardHypoHost";
import { DashboardHypoLink } from "@/components/DashboardHypoLink";
import { DashboardInsulinSection } from "@/components/DashboardInsulinSection";
import { DashboardWaterSection } from "@/components/DashboardWaterSection";
import { LibreDashboardSection } from "@/components/LibreDashboardSection";
import { PostMealRiseWatcher } from "@/components/PostMealRiseWatcher";

export default function DashboardPage() {
  return (
    <DashboardHypoHost>
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
            Hoje
          </p>
          <DashboardHypoLink />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Olá
        </h1>
        <p className="text-sm text-zinc-600">
          Resumo rápido do teu dia de saúde.
        </p>
      </header>

      <LibreDashboardSection />

      <PostMealRiseWatcher />

      <DashboardContextSection />

      <DashboardCarbSection />

      <DashboardInsulinSection />

      <DashboardWaterSection />
    </div>
    </DashboardHypoHost>
  );
}
