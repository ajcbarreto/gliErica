import type { SupabaseClient } from "@supabase/supabase-js";

/** MFA WebAuthn no GoTrue: `auth.mfa.webauthn` (não `auth.webauthn`). */
export type WebauthnMfaApi = {
  register: (params: {
    friendlyName: string;
    webauthn?: {
      rpId?: string;
      rpOrigins?: string[];
      signal?: AbortSignal;
    };
  }) => Promise<{ error: { message: string } | null }>;
  authenticate: (params: {
    factorId: string;
    webauthn?: {
      rpId?: string;
      rpOrigins?: string[];
      signal?: AbortSignal;
    };
  }) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export function webauthnMfa(client: SupabaseClient): WebauthnMfaApi | null {
  const auth = client.auth as unknown as {
    mfa?: { webauthn?: WebauthnMfaApi };
  };
  return auth.mfa?.webauthn ?? null;
}
