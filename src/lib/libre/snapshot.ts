import { LibreLinkUpClient, mapData } from "@diakem/libre-link-up-api-client";
import type {
  GlucoseDisplayUnit,
  LibreGlucoseSnapshot,
  LibreRangeState,
  LibreTrend,
} from "./types";

function mapUomToUnit(uom: number): GlucoseDisplayUnit {
  // Abbott: 1 ≈ mg/dL, 2 ≈ mmol/L (valores da API LibreLink)
  return uom === 2 ? "mmol/L" : "mg/dL";
}

function computeRangeState(
  value: number,
  isLow: boolean,
  isHigh: boolean,
  targetLow: number,
  targetHigh: number
): LibreRangeState {
  if (isLow || value < targetLow) return "hypo";
  if (isHigh || value > targetHigh) return "hyper";
  return "target";
}

function toPoint(at: Date, value: number) {
  return { at: at.toISOString(), value };
}

/**
 * Obtém glicemia atual, tendência, histórico ~3 h e série ~24 h via LibreLinkUp.
 * Credenciais só em servidor (env).
 */
export async function getLibreGlucoseSnapshot(): Promise<LibreGlucoseSnapshot> {
  const login = process.env.LIBRELINKUP_LOGIN;
  const password = process.env.LIBRELINKUP_PASSWORD;

  if (!login?.trim() || !password) {
    throw new Error(
      "Define LIBRELINKUP_LOGIN e LIBRELINKUP_PASSWORD no ambiente do servidor."
    );
  }

  const client = LibreLinkUpClient({
    username: login.trim(),
    password,
  });

  const raw = await client.readRaw();
  const conn = raw.connection;

  const currentMapped = mapData(conn.glucoseMeasurement);
  const historyMapped = raw.graphData.map(mapData);

  const all = [...historyMapped];
  const curTime = currentMapped.date.getTime();
  const duplicate = all.some(
    (p) => Math.abs(p.date.getTime() - curTime) < 45_000
  );
  if (!duplicate) {
    all.push(currentMapped);
  }
  all.sort((a, b) => a.date.getTime() - b.date.getTime());

  const now = Date.now();
  const ms24h = 24 * 60 * 60 * 1000;
  const ms3h = 3 * 60 * 60 * 1000;

  const in24 = all.filter((p) => now - p.date.getTime() <= ms24h);
  const in3 = in24.filter((p) => now - p.date.getTime() <= ms3h);

  const targetLow = Number(conn.targetLow);
  const targetHigh = Number(conn.targetHigh);

  const rangeState = computeRangeState(
    currentMapped.value,
    currentMapped.isLow,
    currentMapped.isHigh,
    targetLow,
    targetHigh
  );

  return {
    glucoseUnit: mapUomToUnit(Number(conn.uom)),
    current: {
      value: currentMapped.value,
      trend: currentMapped.trend as LibreTrend,
      at: currentMapped.date.toISOString(),
      isHigh: currentMapped.isHigh,
      isLow: currentMapped.isLow,
    },
    targetLow,
    targetHigh,
    history3h: in3.map((p) => toPoint(p.date, p.value)),
    chart24h: in24.map((p) => toPoint(p.date, p.value)),
    rangeState,
  };
}
