import { NextResponse } from "next/server";
import { getLibreGlucoseSnapshot } from "@/lib/libre/snapshot";

export const dynamic = "force-dynamic";

function staleHint(
  kind: "rate_limit" | "upstream" | undefined
): string | undefined {
  if (kind === "rate_limit") {
    return "Último valor disponível. A API limitou novos pedidos (429/430); espera 1–2 min.";
  }
  if (kind === "upstream") {
    return "Último valor disponível. Não foi possível atualizar agora; tenta de novo em breve.";
  }
  return undefined;
}

/**
 * GET — dados LibreLinkUp (glicemia, tendência, 3 h e série 24 h).
 * Credenciais: LIBRELINKUP_LOGIN / LIBRELINKUP_PASSWORD (apenas servidor).
 * Query `fresh=1` força novo pedido à Abbott (ignora cache curto).
 * Corpo: `{ snapshot, stale?, staleHint? }`.
 */
export async function GET(request: Request) {
  try {
    const fresh = new URL(request.url).searchParams.get("fresh") === "1";
    const result = await getLibreGlucoseSnapshot({ bypassCache: fresh });
    return NextResponse.json({
      snapshot: result.snapshot,
      stale: result.stale === true,
      ...(result.stale
        ? { staleHint: staleHint(result.staleKind) }
        : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    const status =
      message.includes("não configurados") || message.includes("Define")
        ? 503
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
