/**
 * Helpers base64url ↔ `ArrayBuffer` para credenciais WebAuthn.
 * O cliente `supabase.auth.mfa.challenge()` já devolve `publicKey` deserializado,
 * mas estes utilitários são úteis para testes, depuração ou integrações manuais.
 *
 * Para bibliotecas de alto nível podes usar `@simplewebauthn/browser` (`startRegistration` /
 * `startAuthentication`), desde que o formato JSON do servidor coincida com o esperado.
 */

const B64URL =
  /[-_]/g;

export function base64UrlToBuffer(b64url: string): ArrayBuffer {
  const pad = b64url.length % 4 === 0 ? "" : "=".repeat(4 - (b64url.length % 4));
  const base64 = b64url.replace(B64URL, (c) => (c === "-" ? "+" : "/")) + pad;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function bufferToBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
