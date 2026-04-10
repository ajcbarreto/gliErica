"use client";

import Link from "next/link";
import { ClipboardList, HeartPulse } from "lucide-react";

/**
 * Atalhos no terço inferior do ecrã (zona do polegar), acima da barra de navegação.
 */
export function DashboardThumbActions({
  onHypoClick,
}: {
  onHypoClick: () => void;
}) {
  return (
    <div
      className="pointer-events-none fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] left-1/2 z-40 flex w-full max-w-md -translate-x-1/2 justify-center gap-3 px-4"
      aria-label="Atalhos rápidos"
    >
      <Link
        href="/refeicoes/registos"
        className="pointer-events-auto inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-2xl border border-accent/30 bg-accent px-5 py-3 text-sm font-semibold text-accent-foreground shadow-lg shadow-accent/20 transition active:scale-[0.98]"
      >
        <ClipboardList className="h-5 w-5 shrink-0" aria-hidden />
        Registo rápido
      </Link>
      <button
        type="button"
        onClick={onHypoClick}
        className="pointer-events-auto inline-flex min-h-[48px] min-w-[48px] items-center justify-center gap-2 rounded-2xl border border-red-300/80 bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-red-900/20 transition active:scale-[0.98]"
      >
        <HeartPulse className="h-5 w-5 shrink-0" aria-hidden />
        Hipo
      </button>
    </div>
  );
}
