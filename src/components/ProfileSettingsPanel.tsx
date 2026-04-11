"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

export function ProfileSettingsPanel() {
  const router = useRouter();
  const supabase = createClient();
  const { user, userId, loading: authLoading } = useAuthUser();
  const [fullName, setFullName] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) {
      setHydrated(true);
      return;
    }
    const fromMeta = user.user_metadata?.full_name;
    setFullName(
      typeof fromMeta === "string" ? fromMeta.trim() : "",
    );
    setHydrated(true);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!userId) {
      setMsg("Inicia sessão para guardar.");
      return;
    }
    setSaving(true);
    const trimmed = fullName.trim();
    const { error } = await supabase.auth.updateUser({
      data: { full_name: trimmed.length > 0 ? trimmed : null },
    });
    setSaving(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    setMsg("Guardado.");
    router.refresh();
  }

  if (authLoading || !hydrated) {
    return <p className="text-sm text-zinc-500">A carregar perfil…</p>;
  }

  if (!userId || !user) {
    return (
      <p className="text-sm text-zinc-500">
        Inicia sessão para ver e editar o teu perfil.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
    >
      <p className="text-sm font-medium text-zinc-900">Dados pessoais</p>
      <p className="mt-1 text-xs text-zinc-500">
        O email está associado à conta de início de sessão e não pode ser
        alterado aqui.
      </p>

      <div className="mt-4 space-y-3">
        <div>
          <label
            htmlFor="profile-email"
            className="mb-1 block text-[11px] font-medium text-zinc-500"
          >
            Email
          </label>
          <input
            id="profile-email"
            type="email"
            readOnly
            value={user.email ?? ""}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700 outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="profile-full-name"
            className="mb-1 block text-[11px] font-medium text-zinc-500"
          >
            Nome
          </label>
          <input
            id="profile-full-name"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="O teu nome"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none ring-offset-2 transition placeholder:text-zinc-400 focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </div>
      </div>

      {msg && (
        <p
          className={`mt-3 text-xs ${msg === "Guardado." ? "text-emerald-700" : "text-red-600"}`}
        >
          {msg}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-4 w-full rounded-xl bg-accent px-4 py-3 text-sm font-medium text-white shadow-sm transition hover:opacity-95 disabled:opacity-60"
      >
        {saving ? "A guardar…" : "Guardar"}
      </button>
    </form>
  );
}
