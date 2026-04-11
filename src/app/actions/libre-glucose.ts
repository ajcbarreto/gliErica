"use server";

import { getServerUserId } from "@/lib/auth/server-user";
import { persistLibreGlucoseReadings } from "@/lib/libre/persist-readings";
import { getLibreGlucoseSnapshot } from "@/lib/libre/snapshot";
import type { LibreGlucoseSnapshot } from "@/lib/libre/types";

function staleHint(
  kind: "rate_limit" | "upstream" | undefined
): string | undefined {
  if (kind === "rate_limit") {
    return "Último valor disponível. A API limitou novos pedidos (429/430); espera 1–2 min.";
  }
  if (kind === "upstream") {
    return "Último valor disponível. Não foi possível atualizar agora; tenta de novo em breve.";
  }
  return undefined;
}

export type LibreGlucoseActionResult =
  | {
      ok: true;
      data: LibreGlucoseSnapshot;
      stale?: boolean;
      staleHint?: string;
    }
  | { ok: false; error: string };

/**
 * Server Action alternativa à API route (mesmos dados, sem expor URL).
 * Com sessão: grava pontos na BD após snapshot fresco (não stale).
 */
export async function fetchLibreGlucoseAction(options?: {
  bypassCache?: boolean;
}): Promise<LibreGlucoseActionResult> {
  try {
    const { snapshot, stale, staleKind } = await getLibreGlucoseSnapshot({
      bypassCache: options?.bypassCache === true,
    });
    const userId = await getServerUserId();
    if (userId && stale !== true) {
      await persistLibreGlucoseReadings(userId, snapshot);
    }
    return {
      ok: true,
      data: snapshot,
      ...(stale === true
        ? { stale: true, staleHint: staleHint(staleKind) }
        : {}),
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : "Erro ao contactar LibreLinkUp.";
    return { ok: false, error };
  }
}
