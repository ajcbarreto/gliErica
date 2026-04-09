"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }

    const { data: aal } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
      const { data: fac } = await supabase.auth.mfa.listFactors();
      const hasMfa = fac?.all.some((f) => f.status === "verified");
      if (hasMfa) {
        const next =
          nextPath.startsWith("/") && nextPath !== "/login"
            ? `?next=${encodeURIComponent(nextPath)}`
            : "";
        router.replace(`/login/mfa${next}`);
        router.refresh();
        return;
      }
      setError(
        "Esta conta pede um segundo factor, mas não há nenhum configurado. Contacta o suporte ou recupera a conta."
      );
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    router.replace(nextPath.startsWith("/") ? nextPath : "/dashboard");
    router.refresh();
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-zinc-200/90 bg-surface p-6 shadow-card"
    >
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">Entrar</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Usa o email e a palavra-passe da tua conta.
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
        Palavra-passe
        <input
          type="password"
          autoComplete="current-password"
          required
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
        {loading ? "A entrar…" : "Entrar"}
      </button>

      <p className="text-center text-sm text-zinc-600">
        Não tens conta?{" "}
        <Link href="/register" className="font-medium text-accent underline">
          Registar
        </Link>
      </p>
    </form>
  );
}
