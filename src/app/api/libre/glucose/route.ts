import { NextResponse } from "next/server";
import { getLibreGlucoseSnapshot } from "@/lib/libre/snapshot";

export const dynamic = "force-dynamic";

/**
 * GET — dados LibreLinkUp (glicemia, tendência, 3 h e série 24 h).
 * Credenciais: LIBRELINKUP_LOGIN / LIBRELINKUP_PASSWORD (apenas servidor).
 */
export async function GET() {
  try {
    const data = await getLibreGlucoseSnapshot();
    return NextResponse.json(data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    const status =
      message.includes("não configurados") || message.includes("Define")
        ? 503
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
