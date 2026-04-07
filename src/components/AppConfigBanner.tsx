"use client";

import { tryAppUserId } from "@/lib/app-user";

/** Aviso se falta UUID pessoal (app sem login). */
export function AppConfigBanner() {
  if (tryAppUserId()) return null;

  return (
    <div
      role="alert"
      className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-900"
    >
      <p className="font-semibold">Configuração necessária</p>
      <p className="mt-1 text-red-800">
        Adiciona ao <code className="rounded bg-red-100/80 px-1">.env.local</code>:{" "}
        <code className="break-all rounded bg-red-100/80 px-1">
          NEXT_PUBLIC_GLIERICA_USER_ID
        </code>{" "}
        com um UUID v4 (o mesmo em todos os telemóveis). No Supabase, corre a
        migração <code className="px-1">003_personal_app_no_login.sql</code> e
        garante que existe uma linha em{" "}
        <code className="px-1">profiles</code> com esse{" "}
        <code className="px-1">id</code> (a app cria ao abrir Definições).
      </p>
    </div>
  );
}
