import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAalFromAccessToken } from "@/lib/auth/jwt-aal";

/**
 * Exemplo: rota API protegida que exige JWT com `aal: "aal2"`.
 * Testa com `fetch('/api/mfa-aal2-example', { credentials: 'include' })` após MFA.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const aal = getAalFromAccessToken(session.access_token);

  if (aal !== "aal2") {
    return NextResponse.json(
      {
        error: "É necessário o segundo factor (AAL2).",
        aal: aal ?? null,
      },
      { status: 403 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Token com AAL2 — operação permitida.",
    aal,
  });
}
