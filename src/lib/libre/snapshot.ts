import { LibreLinkUpClient, mapData } from "@diakem/libre-link-up-api-client";
import type {
  GlucoseDisplayUnit,
  LibreGlucoseSnapshot,
  LibreRangeState,
  LibreTrend,
} from "./types";

/** Evita 429 da Abbott: várias chamadas no mesmo processo partilham o mesmo resultado. */
const CACHE_TTL_MS = 150_000;

function mapUomToUnit(uom: number): GlucoseDisplayUnit {
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

function mapLibreFetchError(e: unknown): Error {
  if (typeof e === "object" && e !== null && "response" in e) {
    const status = (e as { response?: { status?: number } }).response?.status;
    if (status === 429) {
      return new Error(
        "LibreLinkUp limitou pedidos (429). Aguarda 1–2 min. A app atualiza menos vezes para evitar isto."
      );
    }
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/429|too many requests/i.test(msg)) {
    return new Error(
      "LibreLinkUp limitou pedidos. Aguarda 1–2 min e tenta de novo."
    );
  }
  return e instanceof Error ? e : new Error(msg);
}

function isRateLimitedError(e: Error): boolean {
  return e.message.includes("429") || e.message.includes("limitou pedidos");
}

async function fetchLibreGlucoseSnapshotUncached(): Promise<LibreGlucoseSnapshot> {
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

let cache: { data: LibreGlucoseSnapshot; at: number } | null = null;
let sharedPending: Promise<LibreGlucoseSnapshot> | null = null;

export type GetLibreSnapshotOptions = {
  /** Ignora cache (botão “Atualizar” no dashboard). */
  bypassCache?: boolean;
};

/**
 * Glicemia via LibreLinkUp. Usa cache em memória (~2,5 min) e um único pedido em voo
 * para reduzir 429. Com 429, devolve dados em cache se existirem.
 */
export async function getLibreGlucoseSnapshot(
  options?: GetLibreSnapshotOptions
): Promise<LibreGlucoseSnapshot> {
  const bypass = options?.bypassCache === true;
  const now = Date.now();

  if (!bypass && cache !== null && now - cache.at < CACHE_TTL_MS) {
    return cache.data;
  }

  if (!bypass && sharedPending) {
    return sharedPending;
  }

  const work = (async (): Promise<LibreGlucoseSnapshot> => {
    try {
      const data = await fetchLibreGlucoseSnapshotUncached();
      cache = { data, at: Date.now() };
      return data;
    } catch (e) {
      const err = mapLibreFetchError(e);
      if (cache !== null && isRateLimitedError(err)) {
        return cache.data;
      }
      throw err;
    }
  })();

  if (!bypass) {
    sharedPending = work.finally(() => {
      sharedPending = null;
    });
    return sharedPending;
  }

  return work;
}
