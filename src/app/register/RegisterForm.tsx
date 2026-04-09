"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { registerWithInvite } from "@/app/actions/auth-register";
import { createClient } from "@/lib/supabase/client";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const reg = await registerWithInvite(email, password, inviteCode);
    if (!reg.ok) {
      setError(reg.error);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signErr) {
      setError(
        "Conta criada, mas o início de sessão falhou: " + signErr.message
      );
      setLoading(false);
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-200/90 bg-surface p-6 shadow-card"
    >
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Registar</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Precisas do código de convite fornecido pelo administrador.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900"
        >
          {error}
        </p>
      ) : null}

      <label className="block text-sm font-medium text-zinc-800">
        Código de convite
        <input
          type="text"
          autoComplete="off"
          required
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        Email
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>

      <label className="block text-sm font-medium text-zinc-800">
        Palavra-passe (mín. 8 caracteres)
        <input
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-accent/40"
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white transition enabled:hover:opacity-95 disabled:opacity-60"
      >
        {loading ? "A criar conta…" : "Criar conta"}
      </button>

      <p className="text-center text-sm text-zinc-600">
        Já tens conta?{" "}
        <Link href="/login" className="font-medium text-accent underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
