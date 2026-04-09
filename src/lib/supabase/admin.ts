import { createClient } from "@supabase/supabase-js";

/**
 * Cliente só no servidor (service role). Nunca importar em componentes cliente.
 */
export function createServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Define SUPABASE_SERVICE_ROLE_KEY no servidor (ex.: .env.local, não expor ao cliente)."
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
