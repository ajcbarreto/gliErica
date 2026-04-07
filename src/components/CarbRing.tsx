"use client";

import { useId } from "react";

type Props = {
  consumed: number;
  goal: number;
  size?: number;
  stroke?: number;
};

export function CarbRing({
  consumed,
  goal,
  size = 168,
  stroke = 14,
}: Props) {
  const gradId = useId().replace(/:/g, "");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = goal > 0 ? consumed / goal : 0;
  const pctVisual = Math.min(Math.max(ratio, 0), 1);
  const offset = c * (1 - pctVisual);

  return (
    <div
      className="relative flex flex-col items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#carbGrad-${gradId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
        <defs>
          <linearGradient id={`carbGrad-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          Hidratos
        </p>
        <p className="mt-0.5 text-2xl font-semibold tabular-nums text-white">
          {formatNum(consumed)}
        </p>
        <p className="text-xs tabular-nums text-zinc-500">
          / {formatNum(goal)} g
        </p>
        {ratio > 1 && (
          <p className="mt-1 text-[10px] font-medium text-amber-400">
            Acima da meta
          </p>
        )}
      </div>
    </div>
  );
}

function formatNum(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
