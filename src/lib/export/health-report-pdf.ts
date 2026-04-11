import type { PDFPage } from "pdf-lib";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - 2 * MARGIN;
const LINE = 11;
const LINE_SM = 9.5;
const ACCENT = rgb(0.02, 0.45, 0.32);
const MUTED = rgb(0.38, 0.38, 0.42);
const TEXT = rgb(0.12, 0.12, 0.14);

export type MealLogItemRow = {
  meal_log_id: string;
  ingredient_label: string;
  grams: number;
  grams_carbs_line: number;
  sort_order: number;
};

export type LibrePoint = { measured_at: string; value_mg_dl: number };

/**
 * StandardFonts Helvetica usam WinAnsi; muitos Unicode falham em drawText (ex. U+2192).
 * Substituições explícitas + filtro final só ASCII + Latin-1 (PDF WinAnsi habitual).
 */
function pdfSafeText(s: string): string {
  const t = s
    .normalize("NFKC")
    .replace(/\uFEFF/g, "")
    .replace(/\u202F|\u00A0/g, " ")
    .replace(/[\u2190-\u21FF\u27F5-\u27FF\u2900-\u297F\u2B00-\u2BFF]/g, "->")
    .replace(/\u2192/g, "->")
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2022/g, "*")
    .replace(/\u00B7/g, " | ")
    .replace(/\u2026/g, "...")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2018|\u2019/g, "'");

  let out = "";
  for (const ch of Array.from(t)) {
    const cp = ch.codePointAt(0)!;
    if (cp === 9 || cp === 10 || cp === 13) {
      out += ch;
      continue;
    }
    if (cp >= 0x20 && cp <= 0x7e) {
      out += ch;
      continue;
    }
    if (cp >= 0xa0 && cp <= 0xff) {
      out += ch;
      continue;
    }
    out += "?";
  }
  return out;
}

function wrapLines(text: string, maxChars: number): string[] {
  const safe = pdfSafeText(text);
  const words = safe.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) cur = next;
    else {
      if (cur) lines.push(cur);
      cur = w.length > maxChars ? `${w.slice(0, maxChars - 1)}...` : w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function downsample(points: LibrePoint[], max: number): LibrePoint[] {
  if (points.length <= max) return points;
  const out: LibrePoint[] = [];
  const step = (points.length - 1) / (max - 1);
  for (let i = 0; i < max; i++) {
    out.push(points[Math.round(i * step)]!);
  }
  return out;
}

function libreStats(points: LibrePoint[]): {
  min: number;
  max: number;
  avg: number;
} | null {
  if (points.length === 0) return null;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (const p of points) {
    const v = Number(p.value_mg_dl);
    if (!Number.isFinite(v)) continue;
    min = Math.min(min, v);
    max = Math.max(max, v);
    sum += v;
  }
  if (!Number.isFinite(min)) return null;
  return { min, max, avg: sum / points.length };
}

function drawSectionBar(
  page: PDFPage,
  yTop: number,
  h: number,
  color = ACCENT
) {
  page.drawRectangle({
    x: MARGIN,
    y: yTop - h,
    width: 4,
    height: h,
    color,
  });
}

export async function buildHealthReportPdf(input: {
  days: number;
  meals: Array<{
    id: string;
    logged_at: string | null;
    created_at: string;
    meal_slot: string;
    grams_carbs: number;
    rapid_insulin_units: number | null;
    note: string | null;
  }>;
  itemsByMeal: Map<string, MealLogItemRow[]>;
  manual: Array<{
    measured_at: string;
    value: number;
    unit: string;
    source: string;
    note: string | null;
  }>;
  insulin: Array<{
    created_at: string;
    units: number;
    kind: string;
    note: string | null;
  }>;
  water: Array<{ created_at: string; ml: number; logged_on: string }>;
  librePoints: LibrePoint[];
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - 56;

  function ensure(n: number) {
    if (y - n < MARGIN + 24) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - 56;
    }
  }

  function drawHeaderLine(text: string, size: number, f = fontBold, col = TEXT) {
    ensure(size + 6);
    page.drawText(pdfSafeText(text), {
      x: MARGIN,
      y: y - size,
      size,
      font: f,
      color: col,
    });
    y -= size + 8;
  }

  function drawMutedLine(text: string, size = LINE_SM) {
    for (const ln of wrapLines(text, 88)) {
      ensure(LINE);
      page.drawText(pdfSafeText(ln), {
        x: MARGIN,
        y: y - size,
        size,
        font,
        color: MUTED,
      });
      y -= LINE;
    }
  }

  function drawBodyLine(text: string, size = LINE, indent = 0) {
    const max = indent > 0 ? 82 : 88;
    for (const ln of wrapLines(text, max)) {
      ensure(LINE);
      page.drawText(pdfSafeText(ln), {
        x: MARGIN + indent,
        y: y - size,
        size,
        font,
        color: TEXT,
      });
      y -= LINE;
    }
  }

  function sectionTitle(label: string) {
    y -= 6;
    ensure(22);
    drawSectionBar(page, y, 16);
    page.drawText(pdfSafeText(label), {
      x: MARGIN + 12,
      y: y - 13,
      size: 12,
      font: fontBold,
      color: ACCENT,
    });
    y -= 22;
  }

  // ——— Capa / cabeçalho ———
  page.drawRectangle({
    x: 0,
    y: PAGE_H - 6,
    width: PAGE_W,
    height: 6,
    color: ACCENT,
  });

  drawHeaderLine("GliErica - relatório de saúde", 18);
  drawMutedLine(
    `Últimos ${input.days} dias · Gerado em ${new Date().toLocaleString("pt-PT")}`
  );
  y -= 4;
  drawMutedLine(
    "Os dados são informativos e não substituem o acompanhamento clínico."
  );
  y -= 8;

  // ——— Libre ———
  sectionTitle("Glicemia Libre (sensor)");
  const stats = libreStats(input.librePoints);
  const chartPts = downsample(
    [...input.librePoints].sort(
      (a, b) =>
        new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime()
    ),
    400
  );

  if (stats && chartPts.length >= 2) {
    drawMutedLine(
      `Resumo: mín. ${Math.round(stats.min)} · máx. ${Math.round(stats.max)} · média ${Math.round(stats.avg)} mg/dL · ${input.librePoints.length} pontos`
    );
    y -= 4;

    const chartH = 118;
    const chartW = CONTENT_W;
    const chartBottom = y - chartH - 8;
    ensure(chartH + 36);

    const ts = chartPts.map((p) => new Date(p.measured_at).getTime());
    const tMin = Math.min(...ts);
    const tMax = Math.max(...ts);
    const vals = chartPts.map((p) => Number(p.value_mg_dl));
    let vMin = Math.min(...vals);
    let vMax = Math.max(...vals);
    if (vMax - vMin < 20) {
      vMin -= 10;
      vMax += 10;
    } else {
      vMin -= 5;
      vMax += 5;
    }

    page.drawRectangle({
      x: MARGIN,
      y: chartBottom,
      width: chartW,
      height: chartH,
      borderColor: rgb(0.85, 0.86, 0.88),
      borderWidth: 0.8,
    });

    const x0 = MARGIN + 4;
    const y0 = chartBottom + 4;
    const innerW = chartW - 8;
    const innerH = chartH - 8;

    for (let i = 0; i < chartPts.length - 1; i++) {
      const a = chartPts[i]!;
      const b = chartPts[i + 1]!;
      const ta = new Date(a.measured_at).getTime();
      const tb = new Date(b.measured_at).getTime();
      const va = Number(a.value_mg_dl);
      const vb = Number(b.value_mg_dl);
      const spanT = tMax - tMin || 1;
      const spanV = vMax - vMin || 1;
      const xa = x0 + ((ta - tMin) / spanT) * innerW;
      const xb = x0 + ((tb - tMin) / spanT) * innerW;
      const ya = y0 + ((va - vMin) / spanV) * innerH;
      const yb = y0 + ((vb - vMin) / spanV) * innerH;
      page.drawLine({
        start: { x: xa, y: ya },
        end: { x: xb, y: yb },
        thickness: 1.1,
        color: ACCENT,
      });
    }

    page.drawText(pdfSafeText("mg/dL"), {
      x: MARGIN + 6,
      y: chartBottom + chartH - 12,
      size: 8,
      font,
      color: MUTED,
    });
    y = chartBottom - 8;
  } else {
    drawBodyLine(
      "Sem pontos Libre guardados neste período. Abre o dashboard com sessão para sincronizar o sensor."
    );
  }

  // ——— Refeições ———
  sectionTitle("Refeições");
  const mealsSorted = [...input.meals].sort(
    (a, b) =>
      new Date(b.logged_at ?? b.created_at).getTime() -
      new Date(a.logged_at ?? a.created_at).getTime()
  );

  for (const m of mealsSorted) {
    const when = m.logged_at ?? m.created_at;
    const slot = mealSlotLabelPt(m.meal_slot as MealSlot);
    const ins =
      m.rapid_insulin_units != null && m.rapid_insulin_units > 0
        ? ` · ${m.rapid_insulin_units} UI rápida`
        : "";
    const head = `${new Date(when).toLocaleString("pt-PT")} · ${slot} · ${m.grams_carbs} g HC${ins}`;
    drawBodyLine(head, LINE, 0);
    if (m.note?.trim()) {
      drawBodyLine(`Nota: ${m.note.trim()}`, LINE_SM, 8);
    }
    const items = (input.itemsByMeal.get(m.id) ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
    for (const it of items) {
      const line = `  * ${it.ingredient_label}: ${it.grams} g -> ${it.grams_carbs_line} g HC`;
      drawBodyLine(line, LINE_SM, 10);
    }
    if (items.length === 0) {
      drawBodyLine("  (sem linhas de alimentos registadas)", LINE_SM, 10);
    }
    y -= 4;
  }
  if (mealsSorted.length === 0) {
    drawBodyLine("Sem refeições registadas neste período.");
  }

  sectionTitle("Glicemia manual");
  if (input.manual.length === 0) {
    drawBodyLine("Sem leituras manuais.");
  } else {
    for (const g of input.manual) {
      const uLabel = g.unit === "mmol_l" ? "mmol/L" : "mg/dL";
      drawBodyLine(
        `${new Date(g.measured_at).toLocaleString("pt-PT")} · ${g.value} ${uLabel} (${g.source})${g.note ? ` · ${g.note}` : ""}`
      );
    }
  }

  sectionTitle("Insulina");
  if (input.insulin.length === 0) {
    drawBodyLine("Sem registos.");
  } else {
    for (const i of input.insulin) {
      drawBodyLine(
        `${new Date(i.created_at).toLocaleString("pt-PT")} · ${i.units} UI · ${i.kind}${i.note ? ` · ${i.note}` : ""}`
      );
    }
  }

  sectionTitle("Hidratação");
  if (input.water.length === 0) {
    drawBodyLine("Sem registos.");
  } else {
    for (const w of input.water) {
      drawBodyLine(
        `${new Date(w.created_at).toLocaleString("pt-PT")} · ${w.ml} ml · dia ${w.logged_on}`
      );
    }
  }

  y -= 8;
  ensure(20);
  page.drawText(
    pdfSafeText("GliErica - relatório gerado pela aplicação"),
    {
      x: MARGIN,
      y: MARGIN,
      size: 8,
      font,
      color: MUTED,
    }
  );

  return pdf.save();
}
