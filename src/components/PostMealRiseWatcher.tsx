"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  evaluatePostMealRapidRise,
  type PostMealRisePayload,
} from "@/app/actions/meal-analysis";
import { Bell, BellOff } from "lucide-react";

/**
 * Monitoriza subida pós-refeição (> 2 mg/dL/min entre últimos pontos CGM).
 * Tenta notificação do browser; se não for possível, mostra aviso in-app (simulação).
 */
export function PostMealRiseWatcher() {
  const [banner, setBanner] = useState<PostMealRisePayload | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const askedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const run = useCallback(async () => {
    const result = await evaluatePostMealRapidRise();

    if (!result.alert) {
      setBanner(null);
      return;
    }

    const entryKey = result.entryId
      ? `glierica-rise-alert-${result.entryId}`
      : null;
    if (entryKey && typeof sessionStorage !== "undefined") {
      if (sessionStorage.getItem(entryKey)) return;
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Glicemia a subir rapidamente", {
          body: result.message,
          tag: entryKey ?? "libre-rise",
        });
        if (entryKey) sessionStorage.setItem(entryKey, "1");
        setBanner(null);
        return;
      }
    }

    if (entryKey && typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(entryKey, "1");
    }
    setBanner({ ...result, simulated: true });
  }, []);

  useEffect(() => {
    /** Primeiro pedido ~25 s depois do dashboard, para não ir dois à Abbott no mesmo segundo. */
    const boot = setTimeout(() => void run(), 25_000);
    const id = setInterval(() => void run(), 300_000);
    return () => {
      clearTimeout(boot);
      clearInterval(id);
    };
  }, [run]);

  async function requestNotifications() {
    if (!("Notification" in window) || askedRef.current) return;
    askedRef.current = true;
    const p = await Notification.requestPermission();
    setPermission(p);
    if (p === "granted") void run();
  }

  if (!banner?.alert) return null;

  return (
    <div
      role="alert"
      className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-card"
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
          {banner.simulated ? (
            <BellOff className="h-5 w-5" aria-hidden />
          ) : (
            <Bell className="h-5 w-5" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-900">
            {banner.simulated
              ? "Alerta (simulação — notificações desativadas)"
              : "Alerta pós-refeição"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
            {banner.message}
          </p>
          {banner.simulated && permission !== "granted" && (
            <button
              type="button"
              onClick={() => void requestNotifications()}
              className="mt-3 rounded-lg bg-amber-200/80 px-3 py-2 text-xs font-medium text-amber-950 transition hover:bg-amber-300/90"
            >
              Ativar notificações do browser
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setBanner(null)}
          className="shrink-0 self-start rounded-lg px-2 py-1 text-xs text-amber-800 hover:bg-amber-100"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
