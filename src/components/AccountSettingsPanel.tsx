"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";
import { LogOut } from "lucide-react";

export function AccountSettingsPanel() {
  const router = useRouter();
  const { user, userId, loading } = useAuthUser();
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-500">A carregar conta…</p>
    );
  }

  if (!userId || !user) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
      <p className="text-sm font-medium text-zinc-900">Sessão</p>
      <p className="mt-1 text-xs text-zinc-500">
        Email:{" "}
        <span className="font-medium text-zinc-700">{user.email}</span>
      </p>
      <button
        type="button"
        disabled={signingOut}
        onClick={() => void signOut()}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" aria-hidden />
        {signingOut ? "A sair…" : "Sair"}
      </button>
    </div>
  );
}
