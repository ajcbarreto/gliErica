import type { GlucoseDisplayUnit } from "@/lib/libre/types";

/** Converte valor Libre para mg/dL para comparação com faixas fixas. */
export function glucoseToMgDl(value: number, unit: GlucoseDisplayUnit): number {
  return unit === "mmol/L" ? value * 18.0182 : value;
}

export type GlucoseBand = "hypo" | "target" | "hyper";

/** Faixas alinhadas ao plano v2 (mg/dL): <70 hipo, 70–160 alvo, >160 hiper. */
export function bandFromMgDl(mgDl: number): GlucoseBand {
  if (mgDl < 70) return "hypo";
  if (mgDl > 160) return "hyper";
  return "target";
}

export function bandGradientClasses(band: GlucoseBand): string {
  switch (band) {
    case "hypo":
      return "bg-gradient-to-br from-sky-200/95 via-sky-100/90 to-cyan-50";
    case "hyper":
      return "bg-gradient-to-br from-amber-200/90 via-orange-100/85 to-amber-50";
    default:
      return "bg-gradient-to-br from-emerald-200/90 via-emerald-100/85 to-teal-50";
  }
}

export function bandBorderClasses(band: GlucoseBand): string {
  switch (band) {
    case "hypo":
      return "border-sky-300/80";
    case "hyper":
      return "border-amber-300/80";
    default:
      return "border-emerald-300/80";
  }
}
