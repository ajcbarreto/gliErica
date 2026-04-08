"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { PULL_REFRESH_EVENT } from "@/lib/pull-refresh-events";

const THRESHOLD_PX = 52;
const MAX_PULL_PX = 88;
const DAMP = 0.38;
const SPIN_MS = 720;

function scrollTop() {
  if (typeof document === "undefined") return 0;
  return (
    document.documentElement.scrollTop || document.body.scrollTop || 0
  );
}

export function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [offset, setOffset] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const pullRef = useRef(0);
  const armedRef = useRef(false);
  const refreshingRef = useRef(false);

  refreshingRef.current = refreshing;

  const endGesture = useCallback(() => {
    armedRef.current = false;
    pullRef.current = 0;
    setOffset(0);
  }, []);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      if (scrollTop() > 2) {
        armedRef.current = false;
        return;
      }
      armedRef.current = true;
      startYRef.current = e.touches[0].clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!armedRef.current || refreshingRef.current) return;
      if (scrollTop() > 2) {
        endGesture();
        return;
      }
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        e.preventDefault();
        const damped = Math.min(dy * DAMP, MAX_PULL_PX);
        pullRef.current = damped;
        setOffset(damped);
      } else {
        pullRef.current = 0;
        setOffset(0);
      }
    };

    const onTouchEnd = () => {
      if (!armedRef.current || refreshingRef.current) {
        endGesture();
        return;
      }
      const dist = pullRef.current;
      pullRef.current = 0;
      armedRef.current = false;
      if (dist >= THRESHOLD_PX) {
        setRefreshing(true);
        setOffset(0);
        window.dispatchEvent(new CustomEvent(PULL_REFRESH_EVENT));
        router.refresh();
        window.setTimeout(() => {
          setRefreshing(false);
        }, SPIN_MS);
      } else {
        setOffset(0);
      }
    };

    const onTouchCancel = () => {
      endGesture();
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [endGesture, router]);

  const progress = Math.min(offset / THRESHOLD_PX, 1);
  const showHint = offset > 4 || refreshing;

  return (
    <>
      <div
        className="pointer-events-none fixed left-0 right-0 top-0 z-[80] flex justify-center"
        aria-hidden={!showHint}
      >
        <div
          className="flex w-full max-w-md justify-center pt-[max(0.5rem,env(safe-area-inset-top,0px))]"
          style={{
            opacity: refreshing ? 1 : progress,
            transform: `translateY(${refreshing ? 8 : offset * 0.25}px)`,
            transition: refreshing ? undefined : "opacity 0.12s ease-out",
          }}
        >
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200/90 bg-surface/95 shadow-md backdrop-blur-sm ${
              refreshing ? "text-accent" : "text-zinc-500"
            }`}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              style={
                refreshing
                  ? undefined
                  : { transform: `rotate(${progress * 280}deg)` }
              }
              aria-hidden
            />
          </div>
        </div>
      </div>
      {refreshing ? (
        <span className="sr-only" role="status" aria-live="polite">
          A atualizar conteúdo
        </span>
      ) : null}
      {children}
    </>
  );
}
