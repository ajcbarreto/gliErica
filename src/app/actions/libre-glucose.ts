"use server";

import { getLibreGlucoseSnapshot } from "@/lib/libre/snapshot";
import type { LibreGlucoseSnapshot } from "@/lib/libre/types";

export type LibreGlucoseActionResult =
  | { ok: true; data: LibreGlucoseSnapshot }
  | { ok: false; error: string };

/**
 * Server Action alternativa à API route (mesmos dados, sem expor URL).
 */
export async function fetchLibreGlucoseAction(): Promise<LibreGlucoseActionResult> {
  try {
    const data = await getLibreGlucoseSnapshot();
    return { ok: true, data };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro ao contactar LibreLinkUp.";
    return { ok: false, error };
  }
}
