/**
 * App pessoal sem login: um único UUID partilhado (a mesma pessoa em todos os dispositivos).
 * Define em .env.local: NEXT_PUBLIC_GLIERICA_USER_ID=<uuid-v4>
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getAppUserId(): string {
  const id = process.env.NEXT_PUBLIC_GLIERICA_USER_ID?.trim();
  if (!id || !UUID_RE.test(id)) {
    throw new Error(
      "Configura NEXT_PUBLIC_GLIERICA_USER_ID no .env.local com um UUID v4 (ex.: gerado em uuidgenerator.net)."
    );
  }
  return id;
}

/** Versão segura para UI: devolve null se ainda não configurado. */
export function tryAppUserId(): string | null {
  try {
    return getAppUserId();
  } catch {
    return null;
  }
}
