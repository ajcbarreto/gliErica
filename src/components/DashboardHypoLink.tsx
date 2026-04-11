"use client";

import { useHypoEmergency } from "@/components/DashboardHypoHost";

/**
 * Ligação discreta para o drawer SOS hipo (substitui o antigo botão flutuante).
 */
export function DashboardHypoLink() {
  const { openHypo } = useHypoEmergency();
  return (
    <button
      type="button"
      onClick={openHypo}
      className="shrink-0 text-xs font-medium text-zinc-500 underline decoration-zinc-300 underline-offset-2 outline-none transition-colors hover:text-zinc-700 hover:decoration-zinc-400 focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
    >
      Modo hipo
    </button>
  );
}
