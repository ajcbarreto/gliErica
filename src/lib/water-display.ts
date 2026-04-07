/** Mostrar mililitros como litros em pt-PT (ex.: 1,2). */
export function formatLitersFromMl(ml: number): string {
  const L = ml / 1000;
  return L.toLocaleString("pt-PT", {
    minimumFractionDigits: L > 0 && L < 10 ? 1 : 0,
    maximumFractionDigits: 2,
  });
}
