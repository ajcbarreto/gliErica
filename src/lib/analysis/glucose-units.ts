import type { GlucoseDisplayUnit } from "@/lib/libre/types";

/** Converte taxa de variação para mg/dL/min (para comparar com limiar clínico). */
export function slopeToMgDlPerMinute(
  deltaPerMinute: number,
  unit: GlucoseDisplayUnit
): number {
  if (unit === "mmol/L") return deltaPerMinute * 18;
  return deltaPerMinute;
}

/** Limiar de subida rápida em mg/dL/min. */
export const RAPID_RISE_THRESHOLD_MG_DL_PER_MIN = 2;
