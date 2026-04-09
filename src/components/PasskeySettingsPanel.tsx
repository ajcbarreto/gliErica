"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { webauthnMfa } from "@/lib/supabase/webauthn-bridge";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Fingerprint } from "lucide-react";

export function PasskeySettingsPanel() {
  const { userId, loading: authLoading } = useAuthUser();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<{ id: string; name: string }[]>([]);

  const refreshFactors = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    const web =
      data?.all
        .filter((f) => f.factor_type === "webauthn" && f.status === "verified")
        .map((f) => ({
          id: f.id,
          name: f.friendly_name ?? "Passkey",
        })) ?? [];
    setFactors(web);
  }, [userId]);

  useEffect(() => {
    if (userId) void refreshFactors();
  }, [userId, refreshFactors]);

  async function addPasskey() {
    if (!userId || typeof window === "undefined") return;
    setMsg(null);
    setBusy(true);
    const supabase = createClient();
    const { error } = await webauthnMfa(supabase).register({
      friendlyName: `GliErica · ${new Date().toLocaleDateString("pt-PT")}`,
      webauthn: {
        rpId: window.location.hostname,
        rpOrigins: [window.location.origin],
      },
    });
    setBusy(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Face ID / passkey associado com sucesso.");
    void refreshFactors();
  }

  if (authLoading) {
    return (
      <p className="text-sm text-zinc-500">A carregar…</p>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
          <Fingerprint className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">
            Face ID e passkeys
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Ativa o segundo factor WebAuthn no projeto Supabase (Auth →
            Multi-factor). Depois associa este dispositivo para usar Face ID ou
            Touch ID ao entrar.
          </p>
        </div>
      </div>

      {factors.length > 0 ? (
        <ul className="mt-3 space-y-1 text-xs text-zinc-600">
          {factors.map((f) => (
            <li key={f.id}>· {f.name}</li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void addPasskey()}
        className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:opacity-95 disabled:opacity-60"
      >
        {busy ? "A aguardar o dispositivo…" : "Associar Face ID / passkey"}
      </button>

      {msg ? (
        <p className="mt-3 text-xs text-zinc-600" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
