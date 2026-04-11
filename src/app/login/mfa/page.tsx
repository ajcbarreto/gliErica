import { redirect } from "next/navigation";

/** Legado: MFA desativado na app; bookmarks passam para o login. */
export default function LoginMfaPage() {
  redirect("/login");
}
