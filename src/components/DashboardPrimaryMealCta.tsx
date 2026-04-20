import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";

export function DashboardPrimaryMealCta() {
  return (
    <Link
      href="/refeicoes/registos"
      className="flex w-full items-center gap-4 rounded-2xl border border-accent/35 bg-accent/10 p-4 text-left shadow-card ring-1 ring-accent/20 transition active:scale-[0.98] active:bg-accent/15"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-md shadow-accent/25">
        <ClipboardList className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-zinc-900">Registar refeição</p>
        <p className="text-xs text-zinc-600">
          Compositor, HC e insulina — o caminho mais rápido para o teu dia.
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-accent" aria-hidden />
    </Link>
  );
}
