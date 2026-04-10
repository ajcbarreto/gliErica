/**
 * Compara o momento de um registo de refeição com a curva Libre numa janela pós-T.
 */

export type GlucoseSample = { t: number; v: number };

export function toSortedSeries(
  points: { at: string; value: number }[]
): GlucoseSample[] {
  return points
    .map((p) => ({ t: new Date(p.at).getTime(), v: p.value }))
    .filter((p) => !Number.isNaN(p.t))
    .sort((a, b) => a.t - b.t);
}

/** Valor interpolado na série ordenada por tempo. */
export function glucoseAtTime(
  series: GlucoseSample[],
  atMs: number
): number | null {
  if (series.length === 0) return null;
  if (atMs <= series[0].t) return series[0].v;
  const last = series[series.length - 1];
  if (atMs >= last.t) return last.v;

  let i = 0;
  while (i < series.length - 1 && series[i + 1].t < atMs) i += 1;
  const a = series[i];
  const b = series[i + 1];
  if (!b || b.t === a.t) return a.v;
  const r = (atMs - a.t) / (b.t - a.t);
  return a.v + r * (b.v - a.v);
}

export type PostMealGlucoseAnalysis = {
  mealAtMs: number;
  baseline: number;
  /** Glicemia interpolada em T + windowMinutes (se coberta pela série). */
  valueAtWindowEnd: number | null;
  /** Pico na janela ]T, T + windowMinutes]. */
  maxInWindow: number;
  deltaAtWindowEnd: number | null;
  /** Pico vs linha de base (impacto típico “spike”). */
  deltaPeak: number;
  /** Há pelo menos um ponto CGM dentro da janela. */
  hasWindowPoints: boolean;
  windowMinutes: number;
};

/**
 * Analisa a curva Libre após o registo da refeição (instante T = created_at do HC).
 */
export function analyzeGlucoseAfterMeal(
  mealAtMs: number,
  series: GlucoseSample[],
  windowMinutes: number
): PostMealGlucoseAnalysis | null {
  if (series.length === 0) return null;

  const baseline = glucoseAtTime(series, mealAtMs);
  if (baseline === null) return null;

  const windowEnd = mealAtMs + windowMinutes * 60 * 1000;
  const inWindow = series.filter((p) => p.t > mealAtMs && p.t <= windowEnd);
  const maxInWindow =
    inWindow.length > 0
      ? Math.max(...inWindow.map((p) => p.v))
      : baseline;

  const vEnd = glucoseAtTime(series, windowEnd);
  const deltaPeak = maxInWindow - baseline;
  const deltaEnd = vEnd !== null ? vEnd - baseline : null;

  return {
    mealAtMs,
    baseline,
    valueAtWindowEnd: vEnd,
    maxInWindow,
    deltaAtWindowEnd: deltaEnd,
    deltaPeak,
    hasWindowPoints: inWindow.length > 0,
    windowMinutes,
  };
}

/** @deprecated usar analyzeGlucoseAfterMeal(..., 60) */
export function analyzeGlucoseOneHourAfterMeal(
  mealAtMs: number,
  series: GlucoseSample[],
  windowMinutes = 60
): PostMealGlucoseAnalysis | null {
  return analyzeGlucoseAfterMeal(mealAtMs, series, windowMinutes);
}

/**
 * Inclinação entre os dois últimos pontos da série (após o instante `afterMs`), em unidade/min.
 */
export function slopeLastIntervalNativePerMin(
  series: GlucoseSample[],
  afterMs: number
): number | null {
  const after = series.filter((p) => p.t >= afterMs);
  if (after.length < 2) return null;
  const a = after[after.length - 2];
  const b = after[after.length - 1];
  const dtMin = (b.t - a.t) / 60_000;
  if (dtMin < 2) return null;
  return (b.v - a.v) / dtMin;
}
