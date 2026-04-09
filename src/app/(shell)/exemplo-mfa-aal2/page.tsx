import { requireAal2ServerComponent } from "@/lib/auth/require-aal2-server";

/**
 * Exemplo de Server Component protegido: só renderiza com JWT `aal: "aal2"`.
 * Sem MFA completado, `requireAal2ServerComponent` redireciona para `/login/mfa`.
 */
export default async function ExemploMfaAal2Page() {
  await requireAal2ServerComponent("/login/mfa");

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm text-emerald-950">
      <p className="font-medium">Conteúdo visível apenas com AAL2</p>
      <p className="mt-1 text-emerald-900/90">
        O utilizador completou o segundo factor; o claim{" "}
        <code className="rounded bg-white/80 px-1">aal</code> no JWT é{" "}
        <code className="rounded bg-white/80 px-1">aal2</code>.
      </p>
    </div>
  );
}
