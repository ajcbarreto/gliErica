import type { Food } from "@/types/database";

/** Marca e loja, para subtítulos e pesquisa. */
export function foodMetaLine(
  f: Pick<Food, "brand" | "retailer">
): string | null {
  const b = f.brand?.trim();
  const r = f.retailer?.trim();
  if (!b && !r) return null;
  return [b, r].filter(Boolean).join(" · ");
}

/** Rótulo para linhas de refeição: nome + marca/loja quando existirem. */
export function foodIngredientLabel(
  f: Pick<Food, "name" | "brand" | "retailer">
): string {
  const meta = foodMetaLine(f);
  return meta ? `${f.name} · ${meta}` : f.name;
}
