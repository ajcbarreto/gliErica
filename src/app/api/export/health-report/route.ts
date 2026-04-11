import { NextResponse } from "next/server";
import { getServerUserId } from "@/lib/auth/server-user";
import { createClient } from "@/lib/supabase/server";
import {
  buildHealthReportPdf,
  type LibrePoint,
  type MealLogItemRow,
} from "@/lib/export/health-report-pdf";
import { mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";

export const dynamic = "force-dynamic";

const DAYS = 14;

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * GET ?format=csv|pdf — relatório (últimos 14 dias): refeições com itens, Libre, manual, insulina, água.
 */
export async function GET(request: Request) {
  const userId = await getServerUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "pdf") {
    return NextResponse.json(
      { error: "format inválido (csv ou pdf)." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const since = new Date(
    Date.now() - DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [meals, manual, insulin, water, libre] = await Promise.all([
    supabase
      .from("meal_logs")
      .select(
        "id, logged_on, logged_at, created_at, meal_slot, grams_carbs, rapid_insulin_units, note"
      )
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("glucose_manual_entries")
      .select("measured_at, value, unit, source, note")
      .eq("user_id", userId)
      .gte("measured_at", since)
      .order("measured_at", { ascending: false })
      .limit(200),
    supabase
      .from("insulin_entries")
      .select("logged_on, units, kind, note, created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("water_entries")
      .select("logged_on, ml, created_at")
      .eq("user_id", userId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("libre_glucose_readings")
      .select("measured_at, value_mg_dl")
      .eq("user_id", userId)
      .gte("measured_at", since)
      .order("measured_at", { ascending: true })
      .limit(50_000),
  ]);

  const errors = [
    meals.error,
    manual.error,
    insulin.error,
    water.error,
    libre.error,
  ].filter(Boolean);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors[0]?.message ?? "Erro ao ler dados." },
      { status: 500 }
    );
  }

  const mealRows =
    (meals.data ?? []) as Array<{
      id: string;
      logged_on: string;
      logged_at: string | null;
      created_at: string;
      meal_slot: string;
      grams_carbs: number;
      rapid_insulin_units: number | null;
      note: string | null;
    }>;

  const itemsByMeal = new Map<string, MealLogItemRow[]>();
  const mealIds = mealRows.map((m) => m.id).filter(Boolean);
  if (mealIds.length > 0) {
    const { data: itemRows, error: itemErr } = await supabase
      .from("meal_log_items")
      .select(
        "meal_log_id, ingredient_label, grams, grams_carbs_line, sort_order"
      )
      .in("meal_log_id", mealIds);

    if (itemErr) {
      return NextResponse.json(
        { error: itemErr.message ?? "Erro ao ler itens de refeição." },
        { status: 500 }
      );
    }

    for (const row of itemRows ?? []) {
      const r = row as MealLogItemRow;
      const list = itemsByMeal.get(r.meal_log_id) ?? [];
      list.push(r);
      itemsByMeal.set(r.meal_log_id, list);
    }
  }

  const librePoints = (libre.data ?? []) as LibrePoint[];

  const lines: string[] = [];
  lines.push(["secção", "data_hora", "detalhe", "nota"].join(","));

  for (const p of librePoints) {
    lines.push(
      [
        "libre_cgm",
        csvEscape(new Date(p.measured_at).toISOString()),
        csvEscape(`${Number(p.value_mg_dl)} mg/dL`),
        "",
      ].join(",")
    );
  }

  for (const m of mealRows) {
    const when = m.logged_at ?? m.created_at;
    const slot = mealSlotLabelPt(m.meal_slot as MealSlot);
    const ins =
      m.rapid_insulin_units != null && m.rapid_insulin_units > 0
        ? ` · ${m.rapid_insulin_units} UI rápida`
        : "";
    const detail = `${slot} · ${m.grams_carbs} g HC${ins}`;
    lines.push(
      [
        "refeição",
        csvEscape(new Date(when).toISOString()),
        csvEscape(detail),
        csvEscape((m.note ?? "").trim()),
      ].join(",")
    );
    const items = (itemsByMeal.get(m.id) ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
    for (const it of items) {
      lines.push(
        [
          "refeição_item",
          csvEscape(new Date(when).toISOString()),
          csvEscape(
            `${it.ingredient_label}: ${it.grams} g -> ${it.grams_carbs_line} g HC`
          ),
          "",
        ].join(",")
      );
    }
  }

  for (const g of manual.data ?? []) {
    const row = g as {
      measured_at: string;
      value: number;
      unit: string;
      source: string;
      note: string | null;
    };
    const uLabel = row.unit === "mmol_l" ? "mmol/L" : "mg/dL";
    lines.push(
      [
        "glicemia_manual",
        csvEscape(new Date(row.measured_at).toISOString()),
        csvEscape(`${row.value} ${uLabel} (${row.source})`),
        csvEscape((row.note ?? "").trim()),
      ].join(",")
    );
  }

  for (const i of insulin.data ?? []) {
    const row = i as {
      logged_on: string;
      units: number;
      kind: string;
      note: string | null;
      created_at: string;
    };
    lines.push(
      [
        "insulina",
        csvEscape(new Date(row.created_at).toISOString()),
        csvEscape(`${row.units} UI · ${row.kind}`),
        csvEscape((row.note ?? "").trim()),
      ].join(",")
    );
  }

  for (const w of water.data ?? []) {
    const row = w as { logged_on: string; ml: number; created_at: string };
    lines.push(
      [
        "água",
        csvEscape(new Date(row.created_at).toISOString()),
        csvEscape(`${row.ml} ml · dia ${row.logged_on}`),
        "",
      ].join(",")
    );
  }

  const csvBody = lines.join("\r\n");
  const title = `GliErica — exportação (${DAYS} dias)`;
  const headerNote =
    "Relatório gerado pela app. Os dados são informativos e não substituem o acompanhamento clínico.";

  if (format === "csv") {
    const bom = "\uFEFF";
    return new NextResponse(bom + `${title}\r\n${headerNote}\r\n\r\n${csvBody}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="glierica-relatorio.csv"`,
      },
    });
  }

  const pdfBytes = await buildHealthReportPdf({
    days: DAYS,
    meals: mealRows,
    itemsByMeal,
    manual: (manual.data ?? []) as Array<{
      measured_at: string;
      value: number;
      unit: string;
      source: string;
      note: string | null;
    }>,
    insulin: (insulin.data ?? []) as Array<{
      created_at: string;
      units: number;
      kind: string;
      note: string | null;
    }>,
    water: (water.data ?? []) as Array<{
      created_at: string;
      ml: number;
      logged_on: string;
    }>,
    librePoints,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="glierica-relatorio.pdf"`,
    },
  });
}
