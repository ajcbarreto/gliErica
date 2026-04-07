export type DailyInsulinCarbPoint = {
  dateKey: string;
  /** Soma de HC registados nesse dia (g). */
  carbsG: number;
  /** Soma de insulina rápida nesse dia (UI). */
  rapidUnits: number;
  /** HC / UI nesse dia, só se rapidUnits > 0. */
  impliedGramsPerUnit: number | null;
};

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2) return s[mid]!;
  return (s[mid - 1]! + s[mid]!) / 2;
}

/** Média simples (dias com implied não nulo). */
export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Percentil simples (0–100), lista ordenada.
 */
export function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.round((p / 100) * (sorted.length - 1)))
  );
  return sorted[idx]!;
}

export function buildDailySeries(
  dateKeysChronological: string[],
  carbsByDay: Map<string, number>,
  rapidByDay: Map<string, number>
): DailyInsulinCarbPoint[] {
  return dateKeysChronological.map((dateKey) => {
    const carbsG = Math.round((carbsByDay.get(dateKey) ?? 0) * 10) / 10;
    const rapidUnits = Math.round((rapidByDay.get(dateKey) ?? 0) * 10) / 10;
    const impliedGramsPerUnit =
      rapidUnits > 0
        ? Math.round((carbsG / rapidUnits) * 10) / 10
        : null;
    return {
      dateKey,
      carbsG,
      rapidUnits,
      impliedGramsPerUnit,
    };
  });
}

export function impliedValues(series: DailyInsulinCarbPoint[]): number[] {
  return series
    .map((d) => d.impliedGramsPerUnit)
    .filter((v): v is number => v !== null && Number.isFinite(v));
}
