"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Drawer as VaulDrawer } from "vaul";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { AlarmClock, Phone, Share2, Bell } from "lucide-react";

const FAST_CARBS_G = 15;
const TIMER_MS = 15 * 60 * 1000;

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Modo SOS hipo: HC rápido sugerido (regra 15/15), cronómetro, lembrete local,
 * partilha e atalho telefónico — sem SMS automático.
 */
export function HypoEmergencyDrawer({ open, onOpenChange }: Props) {
  const { userId } = useAuthUser();
  const supabase = createClient();
  const [contactName, setContactName] = useState<string | null>(null);
  const [contactPhone, setContactPhone] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(TIMER_MS);
  const timerActive = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!userId || !open) return;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("emergency_contact_name, emergency_contact_phone")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setContactName(data.emergency_contact_name ?? null);
        setContactPhone(data.emergency_contact_phone ?? null);
      }
    })();
  }, [userId, supabase, open]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    timerActive.current = false;
  }, []);

  useEffect(() => {
    if (!open) {
      clearTimer();
      setRemainingMs(TIMER_MS);
      return;
    }
    return () => clearTimer();
  }, [open, clearTimer]);

  const startTimer = useCallback(() => {
    if (timerActive.current) return;
    timerActive.current = true;
    const end = Date.now() + TIMER_MS;
    setRemainingMs(TIMER_MS);
    intervalRef.current = setInterval(() => {
      const r = Math.max(0, end - Date.now());
      setRemainingMs(r);
      if (r <= 0) {
        clearTimer();
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "granted") {
            new Notification("GliErica — verificar glicemia", {
              body: "Passaram 15 minutos desde o tratamento da hipo. Volta a medir.",
              tag: "glierica-hypo-timer",
            });
          }
        }
      }
    }, 500);
  }, [clearTimer]);

  const formatRemain = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  async function requestNotify() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const p = await Notification.requestPermission();
    if (p === "granted") {
      new Notification("GliErica — modo hipo", {
        body: `Tratamento sugerido: ~${FAST_CARBS_G} g de HC de absorção rápida. Confirma com a tua equipa.`,
        tag: "glierica-hypo",
      });
    }
  }

  async function shareContext() {
    const text = [
      "Modo hipo (GliErica): tratamento de referência ~15 g HC rápidos; cronómetro 15 min iniciado.",
      contactName ? `Contacto: ${contactName}` : null,
      "Isto é informação de apoio, não substitui orientação médica.",
    ]
      .filter(Boolean)
      .join("\n");
    if (navigator.share) {
      try {
        await navigator.share({ title: "GliErica — hipo", text });
      } catch {
        /* user cancelled */
      }
    } else {
      await navigator.clipboard.writeText(text);
    }
  }

  const telHref =
    contactPhone && contactPhone.replace(/\s+/g, "").length > 0
      ? `tel:${contactPhone.replace(/\s+/g, "")}`
      : null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent showHandle className="max-h-[min(90vh,640px)] overflow-y-auto px-4 pt-0">
        <VaulDrawer.Title className="sr-only">Emergência hipo</VaulDrawer.Title>
        <div className="pb-2">
          <h2 className="text-lg font-semibold text-zinc-900">
            Emergência — hipoglicemia
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600">
            Sugestão de referência (regra 15/15):{" "}
            <strong>~{FAST_CARBS_G} g</strong> de hidratos de absorção rápida;
            volta a medir após <strong>15 minutos</strong>. Confirma sempre com a
            tua equipa de saúde.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startTimer}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800"
            >
              <AlarmClock className="h-4 w-4" aria-hidden />
              Iniciar 15 min
            </button>
            <span className="inline-flex items-center rounded-xl bg-amber-50 px-3 py-2.5 font-mono text-sm font-semibold text-amber-950">
              {formatRemain(remainingMs)}
            </span>
          </div>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void requestNotify()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-surface px-4 py-2.5 text-sm font-medium text-zinc-800"
            >
              <Bell className="h-4 w-4" aria-hidden />
              Lembrete no dispositivo
            </button>
            <button
              type="button"
              onClick={() => void shareContext()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-surface px-4 py-2.5 text-sm font-medium text-zinc-800"
            >
              <Share2 className="h-4 w-4" aria-hidden />
              Partilhar texto
            </button>
            {telHref ? (
              <a
                href={telHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-900"
              >
                <Phone className="h-4 w-4" aria-hidden />
                Ligar {contactName ? `(${contactName})` : ""}
              </a>
            ) : (
              <p className="text-xs text-zinc-500">
                Define um contacto em Definições para atalho de chamada.
              </p>
            )}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-zinc-500">
            A app não envia SMS nem notificações automáticas a terceiros. Web Push
            completo pode ser configurado noutra fase.
          </p>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
