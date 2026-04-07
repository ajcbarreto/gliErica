import Link from "next/link";
import { AppConfigBanner } from "@/components/AppConfigBanner";
import { AppLogo } from "@/components/AppLogo";
import { BottomNav } from "@/components/BottomNav";
import { PendingSyncBar } from "@/components/PendingSyncBar";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-canvas shadow-[0_0_0_1px_rgba(15,23,42,0.06)]">
      <main className="flex min-h-0 min-h-[100dvh] flex-1 flex-col overflow-x-hidden px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <header className="mb-3 flex shrink-0 items-center">
          <Link
            href="/dashboard"
            className="flex items-center gap-2.5 rounded-xl py-1 pr-2 outline-none ring-offset-2 ring-offset-canvas transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-accent/50"
            aria-label="GliErica — ir para o dashboard"
          >
            <AppLogo className="h-9 w-9 shrink-0" />
            <span className="text-lg font-semibold tracking-tight text-zinc-900">
              GliErica
            </span>
          </Link>
        </header>
        <AppConfigBanner />
        <PendingSyncBar />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
