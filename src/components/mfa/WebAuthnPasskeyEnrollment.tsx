"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMfaErrorMessage } from "@/lib/auth/mfa-errors";
import {
  enrollWebAuthnPasskey,
  formatWebAuthnUserError,
} from "@/lib/auth/mfa-webauthn-ceremony";
import { Fingerprint } from "lucide-react";

type Props = {
  onEnrolled?: () => void;
};

/**
 * Registo MFA WebAuthn (Passkey): `mfa.enroll({ factorType: 'webauthn' })` →
 * desafio → `navigator.credentials.create` → `mfa.verify`.
 */
export function WebAuthnPasskeyEnrollment({ onEnrolled }: Props) {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function register() {
    if (typeof window === "undefined") return;
    setMsg(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await enrollWebAuthnPasskey(supabase, {
        friendlyName: `GliErica · ${new Date().toLocaleDateString("pt-PT")}`,
        rp: {
          rpId: window.location.hostname,
          rpOrigins: [window.location.origin],
        },
        createOverrides: {
          authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "preferred",
          },
        } as Record<string, unknown>,
      });

      if (error) {
        const raw =
          "message" in error && typeof error.message === "string"
            ? error.message
            : formatWebAuthnUserError(error);
        setMsg(formatMfaErrorMessage(raw));
        return;
      }

      if (data) {
        setMsg("Passkey associada com sucesso.");
        onEnrolled?.();
      }
    } catch (e) {
      setMsg(formatWebAuthnUserError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-800">
          <Fingerprint className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">
            Passkey / Face ID (WebAuthn MFA)
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Fluxo explícito: enroll → desafio do Supabase → biometria ou chave de
            segurança → verificação. Requer o projeto Supabase com enroll WebAuthn
            ativo.
          </p>
        </div>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void register()}
        className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:opacity-95 disabled:opacity-60"
      >
        {busy ? "A aguardar o dispositivo…" : "Registar nova passkey"}
      </button>

      {msg ? (
        <p className="mt-3 text-xs text-zinc-600" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
