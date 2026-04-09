import { AppLogo } from "@/components/AppLogo";
import { MfaWebauthnForm } from "./MfaWebauthnForm";

export default function LoginMfaPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-8 bg-canvas px-4 py-10">
      <div className="flex flex-col items-center gap-2">
        <AppLogo className="h-14 w-14" priority />
        <span className="text-lg font-semibold text-zinc-900">GliErica</span>
      </div>
      <MfaWebauthnForm />
    </div>
  );
}
