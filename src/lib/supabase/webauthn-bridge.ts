import type { SupabaseClient } from "@supabase/supabase-js";

/** MFA WebAuthn no GoTrue (runtime); tipos do pacote podem não expor `auth.webauthn` ainda. */
type WebauthnMfaApi = {
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

export function webauthnMfa(client: SupabaseClient): WebauthnMfaApi {
  return (client.auth as unknown as { webauthn: WebauthnMfaApi }).webauthn;
}
