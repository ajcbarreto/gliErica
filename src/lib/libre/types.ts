/** Resposta serializável para API / cliente (datas em ISO). */
export type LibreGlucosePoint = {
  at: string;
  value: number;
};

export type LibreTrend =
  | "SingleDown"
  | "FortyFiveDown"
  | "Flat"
  | "FortyFiveUp"
  | "SingleUp"
  | "NotComputable";

export type LibreRangeState = "hypo" | "hyper" | "target";

export type GlucoseDisplayUnit = "mg/dL" | "mmol/L";

export type LibreGlucoseSnapshot = {
  /** Unidade dos valores (Libre `uom`). */
  glucoseUnit: GlucoseDisplayUnit;
  current: {
    value: number;
    trend: LibreTrend;
    at: string;
    isHigh: boolean;
    isLow: boolean;
  };
  targetLow: number;
  targetHigh: number;
  /** Histórico ~últimas 3 h (pontos do gráfico Abbott). */
  history3h: LibreGlucosePoint[];
  /** Série para gráfico 24 h. */
  chart24h: LibreGlucosePoint[];
  rangeState: LibreRangeState;
};
