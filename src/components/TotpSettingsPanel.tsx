"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatMfaErrorMessage } from "@/lib/auth/mfa-errors";
import { useAuthUser } from "@/hooks/useAuthUser";
import { Shield } from "lucide-react";

type Step = "idle" | "verify";

export function TotpSettingsPanel() {
  const { userId, loading: authLoading } = useAuthUser();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>("idle");
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [factors, setFactors] = useState<{ id: string; name: string }[]>([]);

  const refreshFactors = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    const totp =
      data?.all
        .filter((f) => f.factor_type === "totp" && f.status === "verified")
        .map((f) => ({
          id: f.id,
          name: f.friendly_name ?? "TOTP",
        })) ?? [];
    setFactors(totp);
  }, [userId]);

  useEffect(() => {
    if (userId) void refreshFactors();
  }, [userId, refreshFactors]);

  function resetEnrollmentUi(clearMessage = true) {
    setStep("idle");
    setPendingFactorId(null);
    setQrDataUrl(null);
    setCode("");
    if (clearMessage) setMsg(null);
  }

  async function startEnrollment() {
    if (!userId) return;
    setMsg(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `GliErica · ${new Date().toLocaleDateString("pt-PT")}`,
      });
      if (error) {
        setMsg(formatMfaErrorMessage(error.message));
        return;
      }
      if (!data?.id || !data.totp?.qr_code) {
        setMsg("Resposta inesperada do servidor ao registar o autenticador.");
        return;
      }
      setPendingFactorId(data.id);
      setQrDataUrl(data.totp.qr_code);
      setStep("verify");
    } finally {
      setBusy(false);
    }
  }

  async function submitVerification(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingFactorId || !code.trim()) return;
    setMsg(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
        factorId: pendingFactorId,
      });
      if (chErr || !ch?.id) {
        setMsg(formatMfaErrorMessage(chErr?.message));
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId: pendingFactorId,
        challengeId: ch.id,
        code: code.replace(/\s/g, ""),
      });
      if (vErr) {
        setMsg(formatMfaErrorMessage(vErr.message));
        return;
      }
      resetEnrollmentUi(false);
      setMsg("Autenticador configurado com sucesso.");
      void refreshFactors();
    } finally {
      setBusy(false);
    }
  }

  async function cancelEnrollment() {
    if (!pendingFactorId) {
      resetEnrollmentUi();
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      await supabase.auth.mfa.unenroll({ factorId: pendingFactorId });
    } catch {
      /* ignore */
    } finally {
      setBusy(false);
      resetEnrollmentUi();
    }
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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
          <Shield className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">
            Segundo factor (aplicação TOTP)
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Recomendado no Supabase hosted: Google Authenticator, 1Password,
            Microsoft Authenticator, etc. Escaneia o QR e introduz o código de 6
            dígitos para concluir.
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

      {step === "idle" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void startEnrollment()}
          className="mt-4 w-full rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:opacity-95 disabled:opacity-60"
        >
          {busy ? "A preparar…" : "Adicionar autenticador (TOTP)"}
        </button>
      ) : null}

      {step === "verify" && qrDataUrl ? (
        <form onSubmit={(e) => void submitVerification(e)} className="mt-4 space-y-3">
          <div className="flex justify-center rounded-xl border border-zinc-200 bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt="Código QR do autenticador"
              className="max-h-44 w-auto"
            />
          </div>
          <label className="block text-xs font-medium text-zinc-700">
            Código de 6 dígitos
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={10}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-accent/40"
              placeholder="000000"
              required
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={busy || code.length < 6}
              className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition enabled:hover:opacity-95 disabled:opacity-60"
            >
              {busy ? "A verificar…" : "Confirmar"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void cancelEnrollment()}
              className="rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 transition enabled:hover:bg-zinc-50 disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : null}

      {msg ? (
        <p
          className={`mt-3 text-xs ${
            msg.includes("sucesso") ? "text-emerald-700" : "text-zinc-600"
          }`}
          role="status"
        >
          {msg}
        </p>
      ) : null}
    </div>
  );
}
