"use server";

import { timingSafeEqual } from "crypto";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export type RegisterWithInviteResult =
  | { ok: true }
  | { ok: false; error: string };

function inviteCodesMatch(input: string, expected: string): boolean {
  const a = Buffer.from(input.trim(), "utf8");
  const b = Buffer.from(expected.trim(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Cria utilizador no Auth após validar código no servidor.
 * O cliente deve chamar `signInWithPassword` a seguir.
 */
export async function registerWithInvite(
  email: string,
  password: string,
  inviteCode: string
): Promise<RegisterWithInviteResult> {
  const expected = process.env.REGISTRATION_INVITE_CODE;
  if (!expected?.trim()) {
    return {
      ok: false,
      error: "Registo por convite não está configurado (REGISTRATION_INVITE_CODE).",
    };
  }
  if (!inviteCodesMatch(inviteCode, expected)) {
    return { ok: false, error: "Código de convite inválido." };
  }
  if (password.length < 8) {
    return {
      ok: false,
      error: "A palavra-passe deve ter pelo menos 8 caracteres.",
    };
  }
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail.includes("@")) {
    return { ok: false, error: "Email inválido." };
  }

  try {
    const admin = createServiceRoleClient();
    const { error } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao criar conta.";
    return { ok: false, error: msg };
  }
}
