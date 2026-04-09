"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMfaErrorMessage } from "@/lib/auth/mfa-errors";

type Props = {
  factorId: string;
};

export function MfaTotpChallengeForm({ factorId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = code.replace(/\s/g, "");
    if (trimmed.length < 6) return;
    setLoading(true);
    const supabase = createClient();
    const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
      factorId,
    });
    if (chErr || !ch?.id) {
      setError(formatMfaErrorMessage(chErr?.message));
      setLoading(false);
      return;
    }
    const { error: vErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: ch.id,
      code: trimmed,
    });
    if (vErr) {
      setError(formatMfaErrorMessage(vErr.message));
      setLoading(false);
      return;
    }
    const next = searchParams.get("next") || "/dashboard";
    router.replace(next.startsWith("/") ? next : "/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mx-auto w-full max-w-sm rounded-2xl border border-zinc-200/90 bg-surface p-6 shadow-card"
    >
      <h1 className="text-xl font-semibold text-zinc-900">
        Código do autenticador
      </h1>
      <p className="mt-2 text-sm text-zinc-600">
        Abre a app de autenticação e introduz o código de 6 dígitos para a
        conta GliErica.
      </p>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {error}
        </p>
      ) : null}

      <label className="mt-6 block text-sm font-medium text-zinc-800">
        Código TOTP
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          maxLength={10}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-accent/40"
          placeholder="000000"
          required
        />
      </label>

      <button
        type="submit"
        disabled={loading || code.replace(/\s/g, "").length < 6}
        className="mt-6 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition enabled:hover:opacity-95 disabled:opacity-60"
      >
        {loading ? "A verificar…" : "Continuar"}
      </button>
    </form>
  );
}
