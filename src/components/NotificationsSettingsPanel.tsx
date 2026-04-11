"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Smartphone } from "lucide-react";

function permissionLabel(p: NotificationPermission): string {
  switch (p) {
    case "granted":
      return "Ativadas";
    case "denied":
      return "Bloqueadas";
    default:
      return "Ainda não pedidas";
  }
}

export function NotificationsSettingsPanel() {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setSupported("Notification" in window);
    if ("Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setRequesting(true);
    try {
      const p = await Notification.requestPermission();
      setPermission(p);
    } finally {
      setRequesting(false);
    }
  }, []);

  if (supported === null) {
    return <p className="text-sm text-zinc-500">A carregar…</p>;
  }

  if (!supported) {
    return (
      <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <p className="text-sm font-medium text-zinc-900">
          Notificações do sistema
        </p>
        <p className="mt-2 text-sm text-zinc-600">
          Este navegador não suporta a API de notificações. Os alertas
          importantes continuam a aparecer dentro da app quando estás com ela
          aberta.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <div className="flex gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600">
            {permission === "granted" ? (
              <Bell className="h-5 w-5" aria-hidden />
            ) : (
              <BellOff className="h-5 w-5" aria-hidden />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">
              Notificações no telemóvel ou computador
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Estado:{" "}
              <span className="font-medium text-zinc-700">
                {permissionLabel(permission)}
              </span>
              . Estes avisos são do sistema — não são SMS nem chamadas.
            </p>
            {permission === "default" && (
              <button
                type="button"
                disabled={requesting}
                onClick={() => void requestPermission()}
                className="mt-3 w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-60 sm:w-auto"
              >
                {requesting ? "A pedir permissão…" : "Permitir notificações"}
              </button>
            )}
            {permission === "denied" && (
              <p className="mt-3 text-xs leading-relaxed text-amber-800">
                As notificações foram recusadas. Para as voltar a ativar, abre as
                definições do site ou do navegador e permite notificações para
                esta página.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <p className="text-sm font-medium text-zinc-900">
          O que pode enviar alertas
        </p>
        <ul className="mt-3 space-y-3 text-sm text-zinc-600">
          <li className="flex gap-2">
            <Smartphone
              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
              aria-hidden
            />
            <span>
              <span className="font-medium text-zinc-800">
                Subida rápida após refeição
              </span>{" "}
              — quando a glicemia sobe depressa entre leituras do sensor, podes
              receber um aviso no sistema (se permitires) ou só no ecrã da app.
            </span>
          </li>
          <li className="flex gap-2">
            <Smartphone
              className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400"
              aria-hidden
            />
            <span>
              <span className="font-medium text-zinc-800">
                Modo emergência (hipo)
              </span>{" "}
              — lembretes para voltar a medir quando usas o fluxo de SOS hipo,
              se as notificações estiverem permitidas.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
