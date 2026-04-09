"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { WebAuthnPasskeyEnrollment } from "@/components/mfa/WebAuthnPasskeyEnrollment";

export function PasskeySettingsPanel() {
  const { userId, loading: authLoading } = useAuthUser();
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

  if (authLoading) {
    return (
      <p className="text-sm text-zinc-500">A carregar…</p>
    );
  }

  if (!userId) {
    return null;
  }

  return (
    <div className="space-y-3">
      <WebAuthnPasskeyEnrollment onEnrolled={() => void refreshFactors()} />

      {factors.length > 0 ? (
        <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2 text-xs text-zinc-600">
          <p className="font-medium text-zinc-800">Passkeys ativas</p>
          <ul className="mt-1 space-y-0.5">
            {factors.map((f) => (
              <li key={f.id}>· {f.name}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
