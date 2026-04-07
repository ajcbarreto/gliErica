export type OpenFoodFactsHit = {
  code: string;
  name: string;
  brand: string | null;
  carbs_per_100g: number | null;
};

function pickStr(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function readCarbs100g(nutriments: Record<string, unknown> | undefined): number | null {
  if (!nutriments || typeof nutriments !== "object") return null;
  const raw = nutriments["carbohydrates_100g"];
  if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
  if (typeof raw === "string") {
    const p = parseFloat(raw.replace(",", "."));
    if (!Number.isNaN(p)) return p;
  }
  return null;
}

/** Mapeia um produto devolvido pela API v2 (search ou product). */
export function mapOpenFoodFactsProduct(raw: Record<string, unknown>): OpenFoodFactsHit | null {
  const code = String(raw.code ?? "").trim();
  if (!code) return null;

  const name =
    pickStr(raw.product_name_pt) ||
    pickStr(raw.product_name) ||
    pickStr(raw.product_name_en) ||
    "Produto sem nome";

  const brandsRaw = pickStr(raw.brands);
  const brand = brandsRaw ? brandsRaw.split(",")[0]!.trim() || null : null;

  const nutriments = raw.nutriments as Record<string, unknown> | undefined;
  const carbs_per_100g = readCarbs100g(nutriments);

  return { code, name, brand, carbs_per_100g };
}
