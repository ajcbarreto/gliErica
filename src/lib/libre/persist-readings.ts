import "server-only";

import { createClient } from "@/lib/supabase/server";
import { glucoseToMgDl } from "@/lib/glucose-bands";
import type { LibreGlucosePoint, LibreGlucoseSnapshot } from "@/lib/libre/types";

const CHUNK = 200;

function collectPoints(snapshot: LibreGlucoseSnapshot): Map<string, number> {
  const unit = snapshot.glucoseUnit;
  const byIso = new Map<string, number>();

  const add = (p: LibreGlucosePoint) => {
    const t = new Date(p.at);
    if (Number.isNaN(t.getTime())) return;
    const mg = glucoseToMgDl(p.value, unit);
    if (!Number.isFinite(mg) || mg <= 0) return;
    byIso.set(t.toISOString(), mg);
  };

  for (const p of snapshot.chart24h) add(p);
  for (const p of snapshot.history3h) add(p);
  add({ at: snapshot.current.at, value: snapshot.current.value });

  return byIso;
}

/**
 * Grava pontos do snapshot (idempotente por user_id + measured_at).
 * Falhas silenciosas — não bloqueiam o fluxo do dashboard.
 */
export async function persistLibreGlucoseReadings(
  userId: string,
  snapshot: LibreGlucoseSnapshot
): Promise<void> {
  const byIso = collectPoints(snapshot);
  if (byIso.size === 0) return;

  const rows = Array.from(byIso.entries()).map(([measured_at, value_mg_dl]) => ({
    user_id: userId,
    measured_at,
    value_mg_dl,
  }));

  const supabase = await createClient();

  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const { error } = await supabase
      .from("libre_glucose_readings")
      .upsert(chunk, { onConflict: "user_id,measured_at" });
    if (error) {
      console.error("[libre_glucose_readings] upsert:", error.message);
      return;
    }
  }
}
