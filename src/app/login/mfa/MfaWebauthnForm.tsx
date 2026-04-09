"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMfaErrorMessage } from "@/lib/auth/mfa-errors";
import {
  formatWebAuthnUserError,
  verifyWebAuthnMfaLogin,
} from "@/lib/auth/mfa-webauthn-ceremony";

export function MfaWebauthnForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("A preparar…");

  const pickWebAuthnFactor = useCallback(async () => {
    const supabase = createClient();
    const { data, error: listErr } = await supabase.auth.mfa.listFactors();
    if (listErr) {
      setError(formatMfaErrorMessage(listErr.message));
      return null;
    }
    const web = data?.all.filter(
      (f) => f.factor_type === "webauthn" && f.status === "verified"
    );
    if (!web?.length) {
      setError(
        "Não há passkey configurada. Configura nas definições depois do login."
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
    if (!factorId || typeof window === "undefined") return;
    setError(null);
    setLoading(true);
    setStatus("Confirma com Face ID, Touch ID ou chave de segurança…");
    const supabase = createClient();
    try {
      const { error: vErr } = await verifyWebAuthnMfaLogin(supabase, {
        factorId,
        rp: {
          rpId: window.location.hostname,
          rpOrigins: [window.location.origin],
        },
      });
      if (vErr) {
        const raw =
          "message" in vErr && typeof vErr.message === "string"
            ? vErr.message
            : formatWebAuthnUserError(vErr);
        setError(formatMfaErrorMessage(raw));
        setLoading(false);
        setStatus("");
        return;
      }
      const next = searchParams.get("next") || "/dashboard";
      router.replace(next.startsWith("/") ? next : "/dashboard");
      router.refresh();
    } catch (e) {
      setError(formatWebAuthnUserError(e));
      setLoading(false);
      setStatus("");
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-200/90 bg-surface p-6 shadow-card">
      <h1 className="text-xl font-semibold text-zinc-900">
        Segundo passo (passkey)
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Desafio MFA WebAuthn: o servidor envia um challenge; o browser usa{" "}
        <code className="rounded bg-zinc-100 px-1 text-xs">
          navigator.credentials.get
        </code>{" "}
        e a sessão passa a AAL2 após verificação.
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
          {loading ? status || "A aguardar…" : "Continuar com passkey"}
        </button>
      ) : !error ? (
        <p className="mt-6 text-sm text-zinc-500">{status}</p>
      ) : null}
    </div>
  );
}
