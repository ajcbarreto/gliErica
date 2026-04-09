"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MfaTotpChallengeForm } from "./MfaTotpChallengeForm";
import { MfaWebauthnForm } from "./MfaWebauthnForm";

type Method = "totp" | "webauthn";

export function MfaLoginRouter() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totpFactorId, setTotpFactorId] = useState<string | null>(null);
  const [hasWebAuthn, setHasWebAuthn] = useState(false);
  const [method, setMethod] = useState<Method>("totp");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.replace("/login");
      return;
    }
    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") {
      router.replace("/dashboard");
      return;
    }
    const { data: fac, error: listErr } =
      await supabase.auth.mfa.listFactors();
    if (listErr) {
      setError(listErr.message);
      setLoading(false);
      return;
    }
    const all = fac?.all ?? [];
    const totp = all.find(
      (f) => f.factor_type === "totp" && f.status === "verified"
    );
    const web = all.some(
      (f) => f.factor_type === "webauthn" && f.status === "verified"
    );
    setTotpFactorId(totp?.id ?? null);
    setHasWebAuthn(web);
    if (!totp?.id && !web) {
      setError(
        "Não há segundo factor configurado. Entra com email e palavra-passe e configura TOTP ou passkey nas definições."
      );
    } else if (totp?.id && web) {
      setMethod("totp");
    } else if (totp?.id) {
      setMethod("totp");
    } else {
      setMethod("webauthn");
    }
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <p className="mx-auto w-full max-w-sm text-center text-sm text-zinc-500">
        A preparar o segundo passo…
      </p>
    );
  }

  if (error) {
    return (
      <div className="mx-auto w-full max-w-sm rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-900 shadow-card">
        {error}
      </div>
    );
  }

  const showPicker = totpFactorId && hasWebAuthn;

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col gap-4">
      {showPicker ? (
        <div className="flex gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
          <button
            type="button"
            onClick={() => setMethod("totp")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              method === "totp"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Aplicação (TOTP)
          </button>
          <button
            type="button"
            onClick={() => setMethod("webauthn")}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
              method === "webauthn"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Face ID / passkey
          </button>
        </div>
      ) : null}

      {method === "totp" && totpFactorId ? (
        <MfaTotpChallengeForm factorId={totpFactorId} />
      ) : null}
      {method === "webauthn" && hasWebAuthn ? <MfaWebauthnForm /> : null}
    </div>
  );
}
