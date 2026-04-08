"use client";

import Link from "next/link";
import { tryAppUserId } from "@/lib/app-user";
import { ChevronRight, HeartPulse } from "lucide-react";

export function DashboardContextSection() {
  if (!tryAppUserId()) {
    return null;
  }

  return (
    <Link
      href="/contexto"
      className="flex w-full items-center gap-4 rounded-2xl border border-zinc-200/90 bg-surface p-4 text-left shadow-card transition active:scale-[0.98] active:bg-surface-elevated"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-800">
        <HeartPulse className="h-5 w-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-zinc-900">Contexto clínico</p>
        <p className="text-xs text-zinc-500">
          Glicemia manual, hipos/hipers e exercício físico.
        </p>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600" aria-hidden />
    </Link>
  );
}
