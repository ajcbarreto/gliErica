import { NextResponse } from "next/server";
import { OPEN_FOOD_FACTS_USER_AGENT } from "@/lib/open-food-facts/user-agent";
import { mapOpenFoodFactsProduct } from "@/lib/open-food-facts/map-product";

export const dynamic = "force-dynamic";

const FIELDS =
  "code,product_name,product_name_pt,product_name_en,brands,nutriments,nutrition_data";

/**
 * GET ?code=código_de_barras (8–14 dígitos)
 */
export async function GET(request: Request) {
  const code = (new URL(request.url).searchParams.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{8,14}$/.test(code)) {
    return NextResponse.json(
      { error: "Código de barras inválido (8 a 14 dígitos)." },
      { status: 400 }
    );
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}?fields=${encodeURIComponent(FIELDS)}`;

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": OPEN_FOOD_FACTS_USER_AGENT },
      next: { revalidate: 0 },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível contactar Open Food Facts." },
      { status: 502 }
    );
  }

  if (!res.ok) {
    return NextResponse.json(
      { error: `Open Food Facts respondeu ${res.status}.` },
      { status: 502 }
    );
  }

  const body = (await res.json()) as {
    status?: number;
    product?: Record<string, unknown>;
  };

  if (body.status !== 1 || !body.product) {
    return NextResponse.json({ error: "Produto não encontrado." }, { status: 404 });
  }

  const product = mapOpenFoodFactsProduct(body.product);
  if (!product) {
    return NextResponse.json({ error: "Dados do produto inválidos." }, { status: 502 });
  }

  return NextResponse.json({ product });
}
