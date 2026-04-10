"use client";

import { useState } from "react";
import { DashboardThumbActions } from "@/components/DashboardThumbActions";
import { HypoEmergencyDrawer } from "@/components/HypoEmergencyDrawer";

export function DashboardHypoHost({ children }: { children: React.ReactNode }) {
  const [hypoOpen, setHypoOpen] = useState(false);
  return (
    <>
      {children}
      <DashboardThumbActions onHypoClick={() => setHypoOpen(true)} />
      <HypoEmergencyDrawer open={hypoOpen} onOpenChange={setHypoOpen} />
    </>
  );
}
