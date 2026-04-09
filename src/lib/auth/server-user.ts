import { createClient } from "@/lib/supabase/server";

export async function getServerUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function requireServerUserId(): Promise<string> {
  const id = await getServerUserId();
  if (!id) {
    throw new Error("Sessão inválida. Inicia sessão novamente.");
  }
  return id;
}
