"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGroup, motion } from "framer-motion";
import {
  LayoutDashboard,
  UtensilsCrossed,
  LineChart,
  Settings,
} from "lucide-react";

const items = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/refeicoes", label: "Refeições", Icon: UtensilsCrossed },
  { href: "/graficos", label: "Gráficos", Icon: LineChart },
  { href: "/definicoes", label: "Definições", Icon: Settings },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-surface/85 pb-[env(safe-area-inset-bottom,0px)] shadow-tab backdrop-blur-xl backdrop-saturate-150"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-around px-1 pt-1">
        <LayoutGroup>
          {items.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className="relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2 outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                {active && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-x-2 top-1 bottom-1 -z-10 rounded-2xl bg-zinc-100"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 32,
                    }}
                  />
                )}
                <span className="relative flex flex-col items-center gap-0.5">
                  <Icon
                    className={`h-[22px] w-[22px] shrink-0 transition-colors ${
                      active ? "text-accent" : "text-zinc-500"
                    }`}
                    strokeWidth={active ? 2.25 : 2}
                    aria-hidden
                  />
                  <span
                    className={`max-w-full truncate px-0.5 text-[10px] font-medium leading-tight tracking-tight ${
                      active ? "text-accent" : "text-zinc-500"
                    }`}
                  >
                    {label}
                  </span>
                </span>
              </Link>
            );
          })}
        </LayoutGroup>
      </div>
    </nav>
  );
}
