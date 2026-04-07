"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getAppUserId } from "@/lib/app-user";
import { getLocalDateKey } from "@/lib/date";
import { enqueueOp, newOpId } from "@/lib/offline/queue-types";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onLogged: () => void;
};

export function QuickLogModal({ open, onClose, onLogged }: Props) {
  const supabase = createClient();
  const [grams, setGrams] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setGrams("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const value = parseFloat(grams.replace(",", "."));
    if (Number.isNaN(value) || value < 0) {
      setError("Indica um valor válido (gramas de HC).");
      return;
    }

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setError("Configura NEXT_PUBLIC_GLIERICA_USER_ID no .env.local.");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      enqueueOp({
        type: "carb_insert",
        id: newOpId(),
        payload: {
          userId,
          logged_on: getLocalDateKey(),
          grams_carbs: value,
          food_id: null,
          composite_meal_id: null,
          note: "Registo rápido · offline",
        },
      });
      onLogged();
      onClose();
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("carb_entries").insert({
      user_id: userId,
      logged_on: getLocalDateKey(),
      grams_carbs: value,
      food_id: null,
      composite_meal_id: null,
      note: "Registo rápido",
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onLogged();
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Fechar"
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="quick-log-title"
            className="fixed bottom-0 left-0 right-0 z-[61] mx-auto max-w-md rounded-t-3xl border border-white/10 bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/10" />
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="quick-log-title"
                className="text-lg font-semibold text-white"
              >
                Registo rápido
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-4 text-sm text-zinc-400">
              Adiciona gramas de hidratos de carbono diretamente, sem escolher um
              alimento.
            </p>
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div>
                <label
                  htmlFor="quick-grams"
                  className="mb-1.5 block text-xs font-medium text-zinc-500"
                >
                  Gramas de HC
                </label>
                <input
                  id="quick-grams"
                  inputMode="decimal"
                  autoFocus
                  placeholder="ex: 45"
                  value={grams}
                  onChange={(e) => setGrams(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-canvas px-4 py-3 text-lg font-semibold tabular-nums text-white outline-none ring-accent/40 placeholder:text-zinc-600 focus:ring-2"
                />
              </div>
              {error && (
                <p className="text-sm text-red-400" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-xl bg-accent py-3.5 text-sm font-semibold text-accent-foreground transition disabled:opacity-50"
              >
                {saving ? "A guardar…" : "Adicionar ao dia de hoje"}
              </button>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
