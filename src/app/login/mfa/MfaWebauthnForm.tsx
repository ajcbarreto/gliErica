"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { webauthnMfa } from "@/lib/supabase/webauthn-bridge";

export function MfaWebauthnForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("A preparar…");

  const pickWebAuthnFactor = useCallback(async () => {
    const supabase = createClient();
    const { data, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) {
      setError(listErr.message);
      return null;
    }
    const web = data?.all.filter(
      (f) => f.factor_type === "webauthn" && f.status === "verified"
    );
    if (!web?.length) {
      setError(
        "Não há Face ID / passkey configurado. Entra nas definições depois do login ou contacta o suporte."
      );
      return null;
    }
    return web[0].id;
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) router.replace("/login");
        return;
      }
      const { data: aal } =
        await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === "aal2") {
        if (!cancelled) router.replace("/dashboard");
        return;
      }
      const id = await pickWebAuthnFactor();
      if (!cancelled && id) setFactorId(id);
    })();
    return () => {
      cancelled = true;
    };
  }, [pickWebAuthnFactor, router]);

  async function confirmMfa() {
    if (!factorId) return;
    setError(null);
    setLoading(true);
    setStatus("Confirma com Face ID ou Touch ID…");
    const supabase = createClient();
    const hostname =
      typeof window !== "undefined" ? window.location.hostname : "";
    const { data, error: authErr } = await webauthnMfa(supabase).authenticate({
      factorId,
      webauthn: {
        rpId: hostname,
        rpOrigins:
          typeof window !== "undefined" ? [window.location.origin] : [],
      },
    });
    if (authErr || !data) {
      setError(authErr?.message ?? "Falha na autenticação WebAuthn.");
      setLoading(false);
      setStatus("");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-200/90 bg-surface p-6 shadow-card">
      <h1 className="text-xl font-semibold text-zinc-900">
        Segundo passo de segurança
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Confirma com Face ID, Touch ID ou chave de segurança para concluir o
        início de sessão.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {error}
        </p>
      ) : null}

      {factorId ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void confirmMfa()}
          className="mt-6 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition enabled:hover:opacity-95 disabled:opacity-60"
        >
          {loading ? status || "A aguardar…" : "Continuar com Face ID / passkey"}
        </button>
      ) : !error ? (
        <p className="mt-6 text-sm text-zinc-500">{status}</p>
      ) : null}
    </div>
  );
}
