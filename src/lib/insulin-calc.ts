/**
 * Cálculo de bolus de insulina rápida para refeições.
 *
 *   total = (HC ÷ ICR) + max(0, (glicemia − alvo) ÷ ISF)
 *
 * - HC: hidratos de carbono da refeição (g)
 * - ICR (`insulin_carb_grams_per_unit`): g HC cobertos por 1 UI
 * - ISF (`isf_drop_mg_dl_per_unit`): mg/dL que 1 UI baixa
 * - Alvo (`correction_target_mg_dl`): alvo de glicemia para correção
 *
 * A correção é não-negativa: se glicemia ≤ alvo, não soma nada (segurança).
 * A dose final é arredondada a 0,5 UI (passo típico de caneta).
 */

export type MealBolusInputs = {
  /** Gramas de HC da refeição. */
  carbsGrams: number;
  /** ICR — g HC por 1 UI. */
  gramsPerUnit: number | null;
  /** Glicemia atual em mg/dL (ex.: leitura Libre). */
  currentMgDl: number | null;
  /** Alvo de glicemia mg/dL. */
  targetMgDl: number | null;
  /** ISF — mg/dL baixados por 1 UI. */
  isfMgDlPerUnit: number | null;
};

export type MealBolusBreakdown = {
  /** UI atribuíveis aos HC (HC ÷ ICR). 1 casa decimal. null se ICR indefinido. */
  mealUnits: number | null;
  /** UI atribuíveis à correção. 1 casa decimal. null se ISF/Alvo/Glicemia indefinidos. */
  correctionUnits: number | null;
  /** UI totais arredondadas a 0,5. null se nem refeição nem correção forem computáveis. */
  totalUnits: number | null;
  /** Delta mg/dL acima do alvo usado na correção (informativo). */
  deltaAboveTargetMgDl: number | null;
};

/** Arredonda a 0,5 UI (passo típico de canetas). */
export function roundToHalfUnit(units: number): number {
  return Math.round(units * 2) / 2;
}

/** Arredonda a 1 casa decimal (para componentes intermédios). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export type CorrectionDose = {
  /** UI de correção a 1 casa decimal; 0 se glicemia ≤ alvo. null se faltarem dados. */
  units: number | null;
  /** Mesma dose arredondada a 0,5 UI (caneta). null se units null. */
  unitsHalf: number | null;
  /** Delta mg/dL acima do alvo (pode ser ≤ 0). null se faltarem dados. */
  deltaAboveTargetMgDl: number | null;
};

/**
 * Dose de correção isolada: max(0, (glicemia − alvo) ÷ ISF).
 * Não-negativa por segurança (glicemia ≤ alvo ⇒ 0).
 */
export function computeCorrectionDose(input: {
  currentMgDl: number | null;
  targetMgDl: number | null;
  isfMgDlPerUnit: number | null;
}): CorrectionDose {
  const { currentMgDl, targetMgDl, isfMgDlPerUnit } = input;
  if (
    isfMgDlPerUnit == null ||
    isfMgDlPerUnit <= 0 ||
    targetMgDl == null ||
    targetMgDl <= 0 ||
    currentMgDl == null ||
    currentMgDl <= 0
  ) {
    return { units: null, unitsHalf: null, deltaAboveTargetMgDl: null };
  }
  const delta = currentMgDl - targetMgDl;
  const units = delta > 0 ? round1(delta / isfMgDlPerUnit) : 0;
  return {
    units,
    unitsHalf: roundToHalfUnit(units),
    deltaAboveTargetMgDl: delta,
  };
}

export function computeMealBolus(input: MealBolusInputs): MealBolusBreakdown {
  const {
    carbsGrams,
    gramsPerUnit,
    currentMgDl,
    targetMgDl,
    isfMgDlPerUnit,
  } = input;

  const mealUnits =
    gramsPerUnit != null && gramsPerUnit > 0 && carbsGrams > 0
      ? round1(carbsGrams / gramsPerUnit)
      : null;

  const correction = computeCorrectionDose({
    currentMgDl,
    targetMgDl,
    isfMgDlPerUnit,
  });
  const correctionUnits = correction.units;
  const deltaAboveTargetMgDl = correction.deltaAboveTargetMgDl;

  const computedSum =
    (mealUnits ?? 0) + (correctionUnits ?? 0);
  const hasAnyComponent = mealUnits != null || correctionUnits != null;
  const totalUnits = hasAnyComponent ? roundToHalfUnit(computedSum) : null;

  return {
    mealUnits,
    correctionUnits,
    totalUnits,
    deltaAboveTargetMgDl,
  };
}
