/**
 * Importa o Excel da TCA (INSA / PortFIR) para public.tca_foods.
 *
 * 1. Aplica a migração 006_tca_reference_foods.sql no Supabase.
 * 2. Descarrega: https://portfir.insa.min-saude.pt/wp-content/uploads/2025/11/insa_tca.xlsx
 * 3. Corre (na raiz do projeto):
 *    node scripts/import-tca.mjs caminho/para/insa_tca.xlsx
 *
 * Opções: --dry-run (só conta linhas), --version "7.1-2026" (gravado em tca_version)
 *
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (recomendado) ou
 * NEXT_PUBLIC_SUPABASE_ANON_KEY (só se ainda usares migração antiga sem RLS na TCA).
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import XLSX from "xlsx";

function loadEnvLocal() {
  for (const name of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), name);
    if (!existsSync(p)) continue;
    const txt = readFileSync(p, "utf8");
    for (const line of txt.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq <= 0) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
    return;
  }
}

loadEnvLocal();

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const versionIdx = args.indexOf("--version");
const tcaVersion =
  versionIdx >= 0 && args[versionIdx + 1]
    ? args[versionIdx + 1]
    : "7.1-2026";
const xlsxPath = args.find((a) => !a.startsWith("-") && /\.xlsx$/i.test(a));

if (!xlsxPath) {
  console.error(
    "Uso: node scripts/import-tca.mjs <ficheiro.xlsx> [--dry-run] [--version VERSAO]"
  );
  process.exit(1);
}

const file = resolve(xlsxPath);
if (!existsSync(file)) {
  console.error("Ficheiro não encontrado:", file);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!dryRun && (!url || !key)) {
  console.error(
    "Definir NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ou anon key legada) em .env.local."
  );
  process.exit(1);
}

const wb = XLSX.readFile(file);
const main =
  wb.SheetNames.find((n) => /^INSA\s*-/i.test(n)) ?? wb.SheetNames[0];
const sh = wb.Sheets[main];
const raw = XLSX.utils.sheet_to_json(sh, { header: 1, defval: "", raw: false });
if (raw.length < 3) {
  console.error("Folha inesperada: poucas linhas.");
  process.exit(1);
}

const headerRow = raw[1].map((h) => String(h).replace(/\r\n/g, " ").trim());
const idx = (label) => {
  const i = headerRow.findIndex((h) => h.replace(/\s+/g, " ").includes(label));
  return i;
};
const iCod = idx("Cod") >= 0 ? idx("Cod") : 0;
const iName = idx("Nome do alimento");
const iCarb = headerRow.findIndex((h) => h.includes("Hidratos de carbono"));
const i1 = headerRow.findIndex((h) => h.startsWith("Nível 1"));
const i2 = headerRow.findIndex((h) => h.startsWith("Nível 2"));
const i3 = headerRow.findIndex((h) => h.startsWith("Nível 3"));

if (iName < 0 || iCarb < 0) {
  console.error("Colunas esperadas não encontradas (Nome / Hidratos de carbono).");
  process.exit(1);
}

const rows = [];
for (let r = 2; r < raw.length; r++) {
  const line = raw[r];
  const cod = line[iCod];
  if (cod === "" || cod === undefined || cod === null) continue;
  const name = String(line[iName] ?? "").trim();
  if (!name) continue;
  const carbRaw = line[iCarb];
  const carbs = Number(String(carbRaw).replace(",", "."));
  if (Number.isNaN(carbs) || carbs < 0) {
    console.warn("Ignorar linha (hidratos inválidos):", cod, name);
    continue;
  }
  rows.push({
    cod: String(cod).trim(),
    name,
    carbs_per_100g: carbs,
    foodex_level1: i1 >= 0 ? String(line[i1] ?? "").trim() || null : null,
    foodex_level2: i2 >= 0 ? String(line[i2] ?? "").trim() || null : null,
    foodex_level3: i3 >= 0 ? String(line[i3] ?? "").trim() || null : null,
    tca_version: tcaVersion,
  });
}

console.log(`Folha: ${main} → ${rows.length} alimentos (tca_version=${tcaVersion})`);

if (dryRun) {
  process.exit(0);
}

const supabase = createClient(url, key);
const batchSize = 250;
for (let i = 0; i < rows.length; i += batchSize) {
  const batch = rows.slice(i, i + batchSize);
  const { error } = await supabase.from("tca_foods").upsert(batch, {
    onConflict: "cod",
  });
  if (error) {
    console.error("Erro Supabase:", error.message);
    process.exit(1);
  }
  console.log(`… ${Math.min(i + batchSize, rows.length)} / ${rows.length}`);
}

console.log("Concluído. Na app podes consultar com .from('tca_foods').select(...).ilike('name', ...)");
