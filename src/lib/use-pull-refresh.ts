"use client";

import { useEffect } from "react";
import { PULL_REFRESH_EVENT } from "@/lib/pull-refresh-events";

/** Reage ao pull-to-refresh global do shell (só em ecrãs montados). */
export function usePullToRefresh(onRefresh: () => void) {
  useEffect(() => {
    const handler = () => {
      onRefresh();
    };
    window.addEventListener(PULL_REFRESH_EVENT, handler);
    return () => window.removeEventListener(PULL_REFRESH_EVENT, handler);
  }, [onRefresh]);
}
