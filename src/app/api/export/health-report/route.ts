import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { getServerUserId } from "@/lib/auth/server-user";
import { createClient } from "@/lib/supabase/server";
import { mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";

export const dynamic = "force-dynamic";

const DAYS = 14;

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function wrapPdfLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * GET ?format=csv|pdf — relatório resumido (últimos 14 dias) para partilhar com a equipa.
 */
export async function GET(request: Request) {
  const userId = await getServerUserId();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const format = new URL(request.url).searchParams.get("format") ?? "csv";
  if (format !== "csv" && format !== "pdf") {
    return NextResponse.json({ error: "format inválido (csv ou pdf)." }, { status: 400 });
  }

  const supabase = await createClient();
  const since = new Date(
    Date.now() - DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const [meals, manual, insulin, water] = await Promise.all([
    supabase
      .from("meal_logs")
      .select(
        "logged_on, logged_at, created_at, meal_slot, grams_carbs, rapid_insulin_units, note"
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
  ]);

  const errors = [meals.error, manual.error, insulin.error, water.error].filter(
    Boolean
  );
  if (errors.length > 0) {
    return NextResponse.json(
      { error: errors[0]?.message ?? "Erro ao ler dados." },
      { status: 500 }
    );
  }

  const lines: string[] = [];
  lines.push(
    [
      "secção",
      "data_hora",
      "detalhe",
      "nota",
    ].join(",")
  );

  for (const m of meals.data ?? []) {
    const row = m as {
      logged_on: string;
      logged_at: string | null;
      created_at: string;
      meal_slot: string;
      grams_carbs: number;
      rapid_insulin_units: number | null;
      note: string | null;
    };
    const when = row.logged_at ?? row.created_at;
    const slot = mealSlotLabelPt(row.meal_slot as MealSlot);
    const ins =
      row.rapid_insulin_units != null && row.rapid_insulin_units > 0
        ? ` · ${row.rapid_insulin_units} UI rápida`
        : "";
    const detail = `${slot} · ${row.grams_carbs} g HC${ins}`;
    lines.push(
      [
        "refeição",
        csvEscape(new Date(when).toISOString()),
        csvEscape(detail),
        csvEscape((row.note ?? "").trim()),
      ].join(",")
    );
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

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  let page = pdf.addPage([595.28, 841.89]);
  const { height } = page.getSize();
  let y = height - 50;
  const margin = 50;
  const fontSize = 10;
  const lineH = 12;

  function ensureSpace(linesNeeded: number) {
    if (y - linesNeeded * lineH < margin) {
      page = pdf.addPage([595.28, 841.89]);
      y = height - 50;
    }
  }

  page.drawText(title, { x: margin, y, size: 14, font, color: rgb(0.1, 0.1, 0.1) });
  y -= 24;
  for (const ln of wrapPdfLines(headerNote, 85)) {
    ensureSpace(1);
    page.drawText(ln, { x: margin, y, size: 9, font, color: rgb(0.35, 0.35, 0.35) });
    y -= lineH;
  }
  y -= 10;

  const allText = [
    "--- Refeições ---",
    ...(meals.data ?? []).map((m) => {
      const row = m as {
        logged_at: string | null;
        created_at: string;
        meal_slot: string;
        grams_carbs: number;
        rapid_insulin_units: number | null;
        note: string | null;
      };
      const when = row.logged_at ?? row.created_at;
      const slot = mealSlotLabelPt(row.meal_slot as MealSlot);
      const ins =
        row.rapid_insulin_units != null && row.rapid_insulin_units > 0
          ? ` · ${row.rapid_insulin_units} UI`
          : "";
      return `${new Date(when).toLocaleString("pt-PT")} · ${slot} · ${row.grams_carbs} g HC${ins}${row.note ? ` · ${row.note}` : ""}`;
    }),
    "--- Glicemia manual ---",
    ...(manual.data ?? []).map((g) => {
      const row = g as {
        measured_at: string;
        value: number;
        unit: string;
        source: string;
        note: string | null;
      };
      const uLabel = row.unit === "mmol_l" ? "mmol/L" : "mg/dL";
      return `${new Date(row.measured_at).toLocaleString("pt-PT")} · ${row.value} ${uLabel}${row.note ? ` · ${row.note}` : ""}`;
    }),
    "--- Insulina ---",
    ...(insulin.data ?? []).map((i) => {
      const row = i as {
        created_at: string;
        units: number;
        kind: string;
        note: string | null;
      };
      return `${new Date(row.created_at).toLocaleString("pt-PT")} · ${row.units} UI ${row.kind}${row.note ? ` · ${row.note}` : ""}`;
    }),
    "--- Água ---",
    ...(water.data ?? []).map((w) => {
      const row = w as { created_at: string; ml: number; logged_on: string };
      return `${new Date(row.created_at).toLocaleString("pt-PT")} · ${row.ml} ml (${row.logged_on})`;
    }),
  ];

  for (const block of allText) {
    for (const ln of wrapPdfLines(block, 90)) {
      ensureSpace(1);
      page.drawText(ln, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= lineH;
    }
  }

  const bytes = await pdf.save();
  return new NextResponse(Buffer.from(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="glierica-relatorio.pdf"`,
    },
  });
}
