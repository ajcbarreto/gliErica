/** Hidratos (g) a partir de gramas de alimento e HC por 100g. */
export function carbsFromFoodGrams(
  foodGrams: number,
  carbsPer100g: number
): number {
  if (foodGrams <= 0 || carbsPer100g < 0) return 0;
  return (foodGrams * carbsPer100g) / 100;
}

export function roundCarbs(n: number): number {
  return Math.round(n * 10) / 10;
}
