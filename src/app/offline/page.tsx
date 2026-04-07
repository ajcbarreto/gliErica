import Link from "next/link";

export const metadata = {
  title: "Offline — GliErica",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-canvas px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        Sem ligação
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-white">
        Estás offline
      </h1>
      <p className="mt-3 max-w-sm text-sm text-zinc-400">
        Podes consultar a biblioteca de alimentos em cache e os registos ficam
        em fila até voltares a ter rede.
      </p>
      <Link
        href="/biblioteca"
        className="mt-8 rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
      >
        Abrir biblioteca
      </Link>
      <Link
        href="/dashboard"
        className="mt-3 text-sm text-zinc-500 underline-offset-2 hover:text-accent hover:underline"
      >
        Tentar dashboard
      </Link>
    </div>
  );
}
