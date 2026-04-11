"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { HypoEmergencyDrawer } from "@/components/HypoEmergencyDrawer";

type HypoCtx = { openHypo: () => void };

const HypoEmergencyContext = createContext<HypoCtx | null>(null);

export function useHypoEmergency(): HypoCtx {
  const v = useContext(HypoEmergencyContext);
  if (!v) {
    throw new Error("useHypoEmergency must be used within DashboardHypoHost");
  }
  return v;
}

export function DashboardHypoHost({ children }: { children: ReactNode }) {
  const [hypoOpen, setHypoOpen] = useState(false);
  const value = useMemo(
    () => ({ openHypo: () => setHypoOpen(true) }),
    [],
  );
  return (
    <HypoEmergencyContext.Provider value={value}>
      {children}
      <HypoEmergencyDrawer open={hypoOpen} onOpenChange={setHypoOpen} />
    </HypoEmergencyContext.Provider>
  );
}
