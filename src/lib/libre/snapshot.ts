import { LibreLinkUpClient, mapData } from "@diakem/libre-link-up-api-client";
import type {
  GlucoseDisplayUnit,
  LibreGlucoseSnapshot,
  LibreRangeState,
  LibreTrend,
} from "./types";

/** Evita 429/430: resposta reutilizada no servidor (Abbott limita muito os pedidos). */
const CACHE_TTL_MS = 300_000;

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

/**
 * Cabeçalho `version` que a Abbott valida. Valores antigos (ex. 4.12) devolvem 403.
 * Opcional: LIBRELINKUP_CLIENT_VERSION no .env (ex. 4.17.0) se a Abbott subir o mínimo.
 */
const LLU_CLIENT_VERSION =
  process.env.LIBRELINKUP_CLIENT_VERSION?.trim() || "4.17.0";

function mapLibreFetchError(e: unknown): Error {
  if (typeof e === "object" && e !== null && "response" in e) {
    const res = (e as {
      response?: {
        status?: number;
        data?: { status?: number; data?: { minimumVersion?: string } };
      };
    }).response;
    const status = res?.status;
    if (status === 403) {
      const minV = res?.data?.data?.minimumVersion;
      const hint = minV
        ? ` A API indica versão mínima ${minV}: define LIBRELINKUP_CLIENT_VERSION=${minV} no servidor e faz redeploy.`
        : "";
      return new Error(
        `LibreLinkUp recusou o acesso (403).${hint} Abre a app LibreLinkUp no telemóvel, aceita termos ou atualizações se pedirem, e confirma que a conta de seguidor está ativa.`
      );
    }
    if (status === 429 || status === 430) {
      return new Error(
        status === 430
          ? "LibreLinkUp limitou pedidos (430). Aguarda 1–2 min."
          : "LibreLinkUp limitou pedidos (429). Aguarda 1–2 min. A app atualiza menos vezes para evitar isto."
      );
    }
  }
  const msg = e instanceof Error ? e.message : String(e);
  if (/429|430|too many requests/i.test(msg)) {
    return new Error(
      "LibreLinkUp limitou pedidos. Aguarda 1–2 min e tenta de novo."
    );
  }
  return e instanceof Error ? e : new Error(msg);
}

/** Erros em que não faz sentido mostrar dados antigos em cache (credenciais / conta). */
function isAuthOrConfigError(e: Error): boolean {
  const m = e.message;
  return (
    m.includes("403") ||
    m.includes("recusou o acesso") ||
    m.includes("Bad credentials") ||
    m.includes("Define LIBRELINKUP") ||
    m.includes("não configurados") ||
    m.includes("Additional action required") ||
    m.includes("ambiente do servidor")
  );
}

/** Com cache disponível, servir dados antigos para falhas transitórias ou limite (429/430). */
function shouldServeStaleFromError(e: Error): boolean {
  return !isAuthOrConfigError(e);
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
    clientVersion: LLU_CLIENT_VERSION,
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
let sharedPending: Promise<GetLibreGlucoseResult> | null = null;

export type GetLibreSnapshotOptions = {
  /** Ignora cache (botão “Atualizar” no dashboard). */
  bypassCache?: boolean;
};

export type GetLibreGlucoseResult = {
  snapshot: LibreGlucoseSnapshot;
  /** Dados de um pedido anterior porque o pedido atual falhou ou foi limitado. */
  stale?: boolean;
  /** Para mensagens ao utilizador (ex. limite vs erro genérico). */
  staleKind?: "rate_limit" | "upstream";
};

/**
 * Glicemia via LibreLinkUp. Cache em memória (~5 min) e um único pedido em voo.
 * Com 429/430 ou outra falha não relacionada com credenciais, devolve cache se existir,
 * com `stale: true`, para o cliente poder mostrar o último valor e um aviso.
 */
export async function getLibreGlucoseSnapshot(
  options?: GetLibreSnapshotOptions
): Promise<GetLibreGlucoseResult> {
  const bypass = options?.bypassCache === true;
  const now = Date.now();

  if (!bypass && cache !== null && now - cache.at < CACHE_TTL_MS) {
    return { snapshot: cache.data };
  }

  if (!bypass && sharedPending) {
    return sharedPending;
  }

  const work = (async (): Promise<GetLibreGlucoseResult> => {
    try {
      const data = await fetchLibreGlucoseSnapshotUncached();
      cache = { data, at: Date.now() };
      return { snapshot: data };
    } catch (e) {
      const err = mapLibreFetchError(e);
      if (cache !== null && shouldServeStaleFromError(err)) {
        const rate =
          err.message.includes("limitou pedidos") ||
          /\b429\b|\b430\b/.test(err.message);
        return {
          snapshot: cache.data,
          stale: true,
          staleKind: rate ? "rate_limit" : "upstream",
        };
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
