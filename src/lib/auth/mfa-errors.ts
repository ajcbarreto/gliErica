/**
 * Traduz e clarifica mensagens conhecidas do GoTrue (inglês) para utilizadores PT.
 */
export function formatMfaErrorMessage(raw: string | undefined | null): string {
  if (!raw) return "Ocorreu um erro. Tenta novamente.";
  const t = raw.trim();

  if (
    t.includes("MFA enroll is disabled for WebAuthn") ||
    t === "MFA enroll is disabled for WebAuthn"
  ) {
    return (
      "O teu projeto Supabase não tem o registo WebAuthn (Face ID / passkey) ativo no servidor. " +
      "No Supabase hosted isto costuma depender da plataforma ou de um plano com MFA avançado. " +
      "Usa o segundo factor por aplicação (TOTP) abaixo, ou contacta o suporte Supabase."
    );
  }

  if (
    t.includes("MFA verification is disabled for WebAuthn") ||
    t === "MFA verification is disabled for WebAuthn"
  ) {
    return (
      "A verificação WebAuthn está desativada no Auth do projeto. " +
      "Usa TOTP ou contacta o suporte Supabase."
    );
  }

  if (
    t.includes("MFA enroll is disabled for TOTP") ||
    t === "MFA enroll is disabled for TOTP"
  ) {
    return (
      "O registo TOTP está desativado no Auth do projeto. " +
      "Ativa MFA / App Authenticator no dashboard Supabase (Authentication) ou num plano que inclua MFA."
    );
  }

  if (
    t.includes("MFA enroll is disabled for Phone") ||
    t === "MFA enroll is disabled for Phone"
  ) {
    return "O registo MFA por SMS está desativado no projeto.";
  }

  return t;
}
