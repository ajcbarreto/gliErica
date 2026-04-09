import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAalFromAccessToken } from "@/lib/auth/jwt-aal";

/**
 * Para Server Components: garante sessão e `aal === 'aal2'`.
 * Caso contrário redireciona para o fluxo MFA (ou login).
 */
export async function requireAal2ServerComponent(redirectTo: string = "/login/mfa") {
  const supabase = await createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session?.access_token) {
    redirect("/login");
  }
  const aal = getAalFromAccessToken(session.access_token);
  if (aal !== "aal2") {
    redirect(redirectTo);
  }
  return { supabase, session };
}
