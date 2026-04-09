/**
 * Fluxo MFA WebAuthn explícito com Supabase:
 * enroll → mfa.challenge (o cliente Supabase já deserializa `publicKey`) →
 * `navigator.credentials.create` / `get` → `mfa.verify` com a credencial bruta
 * (o GoTrueClient serializa internamente).
 *
 * @see https://github.com/supabase/auth-js/blob/master/src/lib/webauthn.ts
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createCredential,
  getCredential,
  mergeCredentialCreationOptions,
  mergeCredentialRequestOptions,
  webAuthnAbortService,
} from "@supabase/auth-js/dist/module/lib/webauthn.js";
import { isWebAuthnError } from "@supabase/auth-js/dist/module/lib/webauthn.js";

export type RpConfig = {
  rpId: string;
  rpOrigins: string[];
  signal?: AbortSignal;
};

function formatUnknownError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

/** Erros comuns: cancelamento biométrico, NotAllowedError, timeout. */
export function formatWebAuthnUserError(err: unknown): string {
  if (isWebAuthnError(err)) {
    return err.message;
  }
  if (err instanceof DOMException) {
    if (err.name === "NotAllowedError") {
      return "Operação cancelada ou não permitida. Tenta de novo ou usa outro autenticador.";
    }
    if (err.name === "AbortError") {
      return "Operação interrompida.";
    }
    if (err.name === "InvalidStateError") {
      return "Estado inválido do autenticador. Tenta noutro dispositivo.";
    }
    return err.message;
  }
  return formatUnknownError(err);
}

async function ensureCreateUserLabels(
  supabase: SupabaseClient,
  publicKey: PublicKeyCredentialCreationOptions,
  friendlyName: string
) {
  const u = publicKey.user;
  if (!u) return;
  if (!u.name) {
    const { data } = await supabase.auth.getUser();
    const fallback =
      friendlyName ||
      (data.user?.email as string | undefined) ||
      data.user?.id ||
      "User";
    const idStr =
      u.id instanceof ArrayBuffer
        ? bufferToShortId(u.id)
        : String(u.id);
    u.name = `${idStr}:${fallback}`;
  }
  if (!u.displayName) {
    u.displayName = u.name;
  }
}

function bufferToShortId(buf: ArrayBuffer): string {
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 16);
}

/**
 * 1) `mfa.enroll({ factorType: 'webauthn', friendlyName })`
 * 2) `mfa.challenge` + `credentials.create`
 * 3) `mfa.verify` com `credential_response` (PublicKeyCredential)
 */
export async function enrollWebAuthnPasskey(
  supabase: SupabaseClient,
  options: {
    friendlyName: string;
    rp: RpConfig;
    /** Opções extra fundidas com as do servidor (ex.: `authenticatorSelection`). */
    createOverrides?: Record<string, unknown>;
  }
) {
  const { friendlyName, rp, createOverrides } = options;
  const { data: factor, error: enrollErr } = await supabase.auth.mfa.enroll({
    factorType: "webauthn",
    friendlyName,
  });
  if (enrollErr || !factor?.id) {
    return { data: null, error: enrollErr ?? new Error("Enroll falhou") };
  }

  const signal = rp.signal ?? webAuthnAbortService.createNewAbortSignal();

  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
    factorId: factor.id,
    webauthn: {
      rpId: rp.rpId,
      rpOrigins: rp.rpOrigins,
    },
  });

  if (chErr || !ch?.webauthn || ch.webauthn.type !== "create") {
    return {
      data: null,
      error: chErr ?? new Error("Desafio WebAuthn inválido (esperado create)"),
    };
  }

  const rawPk = ch.webauthn.credential_options
    .publicKey as PublicKeyCredentialCreationOptions;

  await ensureCreateUserLabels(supabase, rawPk, friendlyName);

  const merged = mergeCredentialCreationOptions(
    rawPk,
    (createOverrides ?? {}) as unknown as PublicKeyCredentialCreationOptions
  );

  const created = await createCredential({
    publicKey: merged,
    signal,
  });

  if (created.error || !created.data) {
    return { data: null, error: created.error ?? new Error("createCredential falhou") };
  }

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: ch.id,
    webauthn: {
      type: "create",
      rpId: rp.rpId,
      rpOrigins: rp.rpOrigins,
      credential_response: created.data,
    },
  });

  if (vErr) {
    return { data: null, error: vErr };
  }

  return { data: { factorId: factor.id }, error: null };
}

/**
 * Após login (AAL1): challenge + `credentials.get` + verify → sessão AAL2.
 */
export async function verifyWebAuthnMfaLogin(
  supabase: SupabaseClient,
  options: {
    factorId: string;
    rp: RpConfig;
    requestOverrides?: Record<string, unknown>;
  }
) {
  const { factorId, rp, requestOverrides } = options;
  const signal = rp.signal ?? webAuthnAbortService.createNewAbortSignal();

  const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({
    factorId,
    webauthn: {
      rpId: rp.rpId,
      rpOrigins: rp.rpOrigins,
    },
  });

  if (chErr || !ch?.webauthn || ch.webauthn.type !== "request") {
    return {
      data: null,
      error: chErr ?? new Error("Desafio WebAuthn inválido (esperado request)"),
    };
  }

  const rawPk = ch.webauthn.credential_options
    .publicKey as PublicKeyCredentialRequestOptions;

  const merged = mergeCredentialRequestOptions(
    rawPk,
    (requestOverrides ?? {}) as unknown as PublicKeyCredentialRequestOptions
  );

  const got = await getCredential({
    ...ch.webauthn.credential_options,
    publicKey: merged,
    signal,
  });

  if (got.error || !got.data) {
    return { data: null, error: got.error ?? new Error("getCredential falhou") };
  }

  const { error: vErr } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: ch.id,
    webauthn: {
      type: "request",
      rpId: rp.rpId,
      rpOrigins: rp.rpOrigins,
      credential_response: got.data,
    },
  });

  if (vErr) {
    return { data: null, error: vErr };
  }

  return { data: { ok: true }, error: null };
}
