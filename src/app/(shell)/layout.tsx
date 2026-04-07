import { AppConfigBanner } from "@/components/AppConfigBanner";
import { BottomNav } from "@/components/BottomNav";
import { PendingSyncBar } from "@/components/PendingSyncBar";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col bg-canvas shadow-[0_0_0_1px_rgba(255,255,255,0.04)]">
      <main className="flex min-h-0 min-h-[100dvh] flex-1 flex-col overflow-x-hidden px-4 pb-[calc(5.25rem+env(safe-area-inset-bottom,0px))] pt-[max(0.75rem,env(safe-area-inset-top,0px))]">
        <AppConfigBanner />
        <PendingSyncBar />
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
