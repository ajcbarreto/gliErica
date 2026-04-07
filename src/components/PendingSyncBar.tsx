"use client";

import { useCallback, useEffect, useState } from "react";
import { queueLength } from "@/lib/offline/queue-types";
import { flushPendingSyncQueue } from "@/lib/offline/sync-queue";
import { CloudOff, RefreshCw } from "lucide-react";

export function PendingSyncBar() {
  const [n, setN] = useState(0);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => setN(queueLength()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("glierica-queue-changed", refresh);
    window.addEventListener("glierica-sync-complete", refresh);
    return () => {
      window.removeEventListener("glierica-queue-changed", refresh);
      window.removeEventListener("glierica-sync-complete", refresh);
    };
  }, [refresh]);

  async function syncNow() {
    setSyncing(true);
    await flushPendingSyncQueue();
    setSyncing(false);
    refresh();
  }

  if (n === 0) return null;

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2">
        <CloudOff className="h-4 w-4 shrink-0 text-amber-700" aria-hidden />
        <p className="text-xs text-amber-900">
          <span className="font-semibold">{n}</span>{" "}
          {n === 1 ? "registo pendente" : "registos pendentes"} de sincronização
        </p>
      </div>
      <button
        type="button"
        disabled={syncing || !navigator.onLine}
        onClick={() => void syncNow()}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-amber-200/90 px-2.5 py-1.5 text-[11px] font-semibold text-amber-950 disabled:opacity-40"
      >
        <RefreshCw
          className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`}
          aria-hidden
        />
        Sincronizar
      </button>
    </div>
  );
}
