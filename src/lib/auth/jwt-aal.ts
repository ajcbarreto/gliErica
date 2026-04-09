/**
 * Extrai o claim `aal` do access token (JWT).
 * Não valida assinatura — apenas decodifica o payload. Para validação forte usa
 * `supabase.auth.getUser()` no servidor.
 */
function decodeBase64UrlSegment(segment: string): string {
  const b64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 ? "=".repeat(4 - (b64.length % 4)) : "";
  return atob(b64 + pad);
}

export function getAalFromAccessToken(accessToken: string): string | null {
  try {
    const p = accessToken.split(".")[1];
    if (!p) return null;
    const json = JSON.parse(decodeBase64UrlSegment(p)) as { aal?: string };
    return json.aal ?? null;
  } catch {
    return null;
  }
}
