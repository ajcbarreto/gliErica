"use client";

import { useEffect } from "react";
import { flushPendingSyncQueue } from "@/lib/offline/sync-queue";

/** Regista SW (next-pwa) + sincroniza fila ao voltar online. */
export function PwaRootClient() {
  useEffect(() => {
    const run = () => {
      void flushPendingSyncQueue();
    };
    window.addEventListener("online", run);
    if (typeof navigator !== "undefined" && navigator.onLine) {
      run();
    }
    return () => window.removeEventListener("online", run);
  }, []);

  return null;
}
