"use server";

import { getLibreGlucoseSnapshot } from "@/lib/libre/snapshot";
import type { LibreGlucoseSnapshot } from "@/lib/libre/types";

export type LibreGlucoseActionResult =
  | { ok: true; data: LibreGlucoseSnapshot; stale?: boolean }
  | { ok: false; error: string };

/**
 * Server Action alternativa à API route (mesmos dados, sem expor URL).
 */
export async function fetchLibreGlucoseAction(): Promise<LibreGlucoseActionResult> {
  try {
    const { snapshot, stale } = await getLibreGlucoseSnapshot();
    return stale ? { ok: true, data: snapshot, stale: true } : { ok: true, data: snapshot };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro ao contactar LibreLinkUp.";
    return { ok: false, error };
  }
}
