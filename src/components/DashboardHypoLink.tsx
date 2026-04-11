"use client";

import { useHypoEmergency } from "@/components/DashboardHypoHost";

/** Abre o drawer SOS hipo (substitui o antigo botão flutuante). */
export function DashboardHypoLink() {
  const { openHypo } = useHypoEmergency();
  return (
    <button
      type="button"
      onClick={openHypo}
      className="shrink-0 rounded-lg border border-red-200/90 bg-red-50 px-2.5 py-1 text-sm font-semibold text-red-800 shadow-sm outline-none ring-red-100/80 transition hover:border-red-300 hover:bg-red-100/80 hover:text-red-900 focus-visible:ring-2 focus-visible:ring-red-400/45 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      Modo hipo
    </button>
  );
}
