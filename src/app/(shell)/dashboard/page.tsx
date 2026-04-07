import { DashboardCarbSection } from "@/components/DashboardCarbSection";
import { DashboardWaterSection } from "@/components/DashboardWaterSection";
import { LibreDashboardSection } from "@/components/LibreDashboardSection";
import { PostMealRiseWatcher } from "@/components/PostMealRiseWatcher";

export default function DashboardPage() {
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Hoje
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Olá
        </h1>
        <p className="text-sm text-zinc-400">
          Resumo rápido do teu dia de saúde.
        </p>
      </header>

      <LibreDashboardSection />

      <PostMealRiseWatcher />

      <DashboardCarbSection />

      <DashboardWaterSection />
    </div>
  );
}
