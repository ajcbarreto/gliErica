/**
 * Classificação de resultado pós-refeição usando leituras Libre (mg/dL).
 * Funções puras — sem efeitos. As regras são conservadoras; é apoio à reflexão, não prescrição.
 */

export type GlucosePoint = { atMs: number; mgDl: number };

export type MealOutcomeKind =
  | "in_target"
  | "spike"
  | "slow_recovery"
  | "hypo_after"
  | "insufficient_data";

export type MealOutcomeThresholds = {
  /** Limite abaixo do qual se considera hipo (mg/dL). */
  hypoMgDl: number;
  /** Limite superior do alvo (mg/dL). */
  targetHighMgDl: number;
  /** Subida (pico − baseline) acima da qual chamamos "spike" (mg/dL). */
  spikeDeltaMgDl: number;
  /** Minutos pós-refeição para a check de "voltou ao alvo". */
  returnByMin: number;
  /** Janela de hipo pós-refeição (min). */
  hypoWindowMin: number;
  /** Mínimo de pontos CGM em [T, T+2h] para análise válida. */
  minPointsIn2h: number;
};

export const DEFAULT_OUTCOME_THRESHOLDS: MealOutcomeThresholds = {
  hypoMgDl: 70,
  targetHighMgDl: 180,
  spikeDeltaMgDl: 80,
  returnByMin: 180,
  hypoWindowMin: 240,
  minPointsIn2h: 3,
};

export type MealOutcomeAnalysis = {
  kind: MealOutcomeKind;
  baselineMgDl: number | null;
  peakMgDl: number | null;
  peakAtMs: number | null;
  deltaPeakMgDl: number | null;
  /** Valor em T + returnByMin (interpolado). */
  valueAtReturnMgDl: number | null;
  returnedToTarget: boolean | null;
  hypoAfter: boolean;
  /** % de tempo dentro do alvo [hypoMgDl, targetHighMgDl] em [T, T+returnByMin]. */
  tirPct: number | null;
  pointCountIn2h: number;
};

function interpolate(points: GlucosePoint[], atMs: number): number | null {
  if (points.length === 0) return null;
  if (atMs <= points[0].atMs) return points[0].mgDl;
  const last = points[points.length - 1];
  if (atMs >= last.atMs) return last.mgDl;
  let i = 0;
  while (i < points.length - 1 && points[i + 1].atMs < atMs) i += 1;
  const a = points[i];
  const b = points[i + 1];
  if (!b || b.atMs === a.atMs) return a.mgDl;
  const r = (atMs - a.atMs) / (b.atMs - a.atMs);
  return a.mgDl + r * (b.mgDl - a.mgDl);
}

/**
 * Tempo (ms) em que a série está dentro do alvo durante uma janela [t0, t1],
 * usando interpolação linear entre pontos. Pontos fora da janela são clamped
 * aos limites antes do cálculo. Devolve 0 se a série não cobrir nada da janela.
 */
function timeInRangeMs(
  points: GlucosePoint[],
  t0: number,
  t1: number,
  lo: number,
  hi: number
): number {
  if (points.length === 0 || t1 <= t0) return 0;
  const pts = points.filter((p) => p.atMs >= t0 - 30 * 60 * 1000 && p.atMs <= t1 + 30 * 60 * 1000);
  if (pts.length < 2) return 0;

  let total = 0;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const aT = Math.max(a.atMs, t0);
    const bT = Math.min(b.atMs, t1);
    if (bT <= aT) continue;
    // Linear interpolation a→b clipped to [t0, t1]
    const span = b.atMs - a.atMs;
    if (span <= 0) continue;
    const vA = a.mgDl + ((aT - a.atMs) / span) * (b.mgDl - a.mgDl);
    const vB = a.mgDl + ((bT - a.atMs) / span) * (b.mgDl - a.mgDl);
    const dt = bT - aT;
    // Approx: amostra a meio para decidir se está dentro do alvo
    const mid = (vA + vB) / 2;
    if (mid >= lo && mid <= hi) total += dt;
  }
  return total;
}

/**
 * Analisa o resultado pós-refeição numa janela de até `returnByMin` min.
 * `mealAtMs` é o instante da refeição. `points` são leituras CGM mg/dL ordenadas (ou não).
 */
export function analyzeMealOutcome(
  mealAtMs: number,
  points: GlucosePoint[],
  thresholds: MealOutcomeThresholds = DEFAULT_OUTCOME_THRESHOLDS
): MealOutcomeAnalysis {
  const sorted = [...points].sort((a, b) => a.atMs - b.atMs);

  const baseline = interpolate(sorted, mealAtMs);

  const t0 = mealAtMs;
  const tReturn = mealAtMs + thresholds.returnByMin * 60 * 1000;
  const tHypoEnd = mealAtMs + thresholds.hypoWindowMin * 60 * 1000;
  const t2h = mealAtMs + 120 * 60 * 1000;

  const inPost = sorted.filter((p) => p.atMs > t0 && p.atMs <= tHypoEnd);
  const pointCountIn2h = inPost.filter((p) => p.atMs <= t2h).length;

  let peak = baseline;
  let peakAt: number | null = null;
  for (const p of inPost) {
    if (p.atMs > tReturn) break;
    if (peak === null || p.mgDl > peak) {
      peak = p.mgDl;
      peakAt = p.atMs;
    }
  }

  const deltaPeak =
    peak !== null && baseline !== null ? peak - baseline : null;

  const valueAtReturn = interpolate(sorted, tReturn);

  const hypoAfter = inPost.some((p) => p.mgDl < thresholds.hypoMgDl);

  const windowMs = tReturn - t0;
  const inRangeMs = timeInRangeMs(
    sorted,
    t0,
    tReturn,
    thresholds.hypoMgDl,
    thresholds.targetHighMgDl
  );
  const tirPct =
    windowMs > 0 && inPost.length >= 2
      ? Math.round((inRangeMs / windowMs) * 100)
      : null;

  let kind: MealOutcomeKind;
  if (pointCountIn2h < thresholds.minPointsIn2h) {
    kind = "insufficient_data";
  } else if (hypoAfter) {
    kind = "hypo_after";
  } else if (deltaPeak !== null && deltaPeak > thresholds.spikeDeltaMgDl) {
    kind = "spike";
  } else if (
    valueAtReturn !== null &&
    valueAtReturn > thresholds.targetHighMgDl
  ) {
    kind = "slow_recovery";
  } else {
    kind = "in_target";
  }

  return {
    kind,
    baselineMgDl: baseline,
    peakMgDl: peak,
    peakAtMs: peakAt,
    deltaPeakMgDl: deltaPeak,
    valueAtReturnMgDl: valueAtReturn,
    returnedToTarget:
      valueAtReturn !== null
        ? valueAtReturn <= thresholds.targetHighMgDl
        : null,
    hypoAfter,
    tirPct,
    pointCountIn2h,
  };
}

export function outcomeLabelPt(kind: MealOutcomeKind): string {
  switch (kind) {
    case "in_target":
      return "Em alvo";
    case "spike":
      return "Subiu muito";
    case "slow_recovery":
      return "Demorou a voltar";
    case "hypo_after":
      return "Hipo depois";
    case "insufficient_data":
      return "Sem dados";
  }
}
