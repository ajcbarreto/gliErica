"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import type { GlucoseDisplayUnit } from "@/lib/libre/types";

type Props = {
  value: number;
  unit: GlucoseDisplayUnit;
  className?: string;
};

function formatGlucose(v: number, unit: GlucoseDisplayUnit): string {
  return unit === "mmol/L" ? v.toFixed(1) : String(Math.round(v));
}

/**
 * Valor de glicemia com animação de contagem; respeita prefers-reduced-motion.
 */
export function AnimatedGlucoseValue({ value, unit, className = "" }: Props) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    if (reduce) {
      prevRef.current = value;
      setShown(value);
      return;
    }
    const from = prevRef.current;
    prevRef.current = value;
    const controls = animate(from, value, {
      duration: 0.45,
      ease: "easeOut",
      onUpdate: (v) => setShown(v),
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span className={`tabular-nums tracking-tight ${className}`}>
      {formatGlucose(shown, unit)}
    </span>
  );
}
