import { NextResponse } from "next/server";
import { OPEN_FOOD_FACTS_USER_AGENT } from "@/lib/open-food-facts/user-agent";
import { mapOpenFoodFactsProduct } from "@/lib/open-food-facts/map-product";

export const dynamic = "force-dynamic";

const FIELDS =
  "code,product_name,product_name_pt,product_name_en,brands,nutriments,nutrition_data";

/**
 * GET ?q=texto&scope=portugal|world
 * Pesquisa na base Open Food Facts (servidor faz proxy + User-Agent correto).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const scope = searchParams.get("scope") === "world" ? "world" : "portugal";

  if (q.length < 2) {
    return NextResponse.json(
      { error: "Indica pelo menos 2 caracteres em q." },
      { status: 400 }
    );
  }
  if (q.length > 120) {
    return NextResponse.json({ error: "Pesquisa demasiado longa." }, { status: 400 });
  }

  const url = new URL("https://world.openfoodfacts.org/api/v2/search");
  url.searchParams.set("search_terms", q);
  url.searchParams.set("page_size", "24");
  url.searchParams.set("fields", FIELDS);
  if (scope === "portugal") {
    url.searchParams.set("countries_tags", "en:portugal");
  }

  let res: Response;
  try {
    res = await fetch(url.toString(), {
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

  const body = (await res.json()) as { products?: Record<string, unknown>[] };
  const rawList = body.products ?? [];
  const products = rawList
    .map((p) => mapOpenFoodFactsProduct(p))
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return NextResponse.json({ products, scope });
}
