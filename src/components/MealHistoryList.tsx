"use client";

import { Pencil, Trash2 } from "lucide-react";
import { mealSlotLabelPt, type MealSlot } from "@/lib/meal-slots";
import type { MealLog } from "@/types/database";

function formatDayPt(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function formatTimePt(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-PT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type MealHistoryListProps = {
  logs: MealLog[];
  loading: boolean;
  onEdit: (row: MealLog) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
  /** Desativa editar enquanto carrega itens para edição */
  editBusy?: boolean;
  /** Mostrar só as N entradas mais recentes (útil na pré-visualização) */
  limit?: number;
  /** `compact` para a pré-visualização no topo do registo */
  density?: "comfortable" | "compact";
};

export function MealHistoryList({
  logs,
  loading,
  onEdit,
  onDelete,
  deletingId,
  editBusy = false,
  limit,
  density = "comfortable",
}: MealHistoryListProps) {
  const shown = typeof limit === "number" ? logs.slice(0, limit) : logs;
  const compact = density === "compact";

  if (loading) {
    return (
      <p
        className={
          compact ? "text-xs text-zinc-500" : "mt-2 text-sm text-zinc-500"
        }
      >
        A carregar…
      </p>
    );
  }

  if (logs.length === 0) {
    return (
      <p
        className={
          compact
            ? "rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-4 text-center text-xs text-zinc-500"
            : "mt-2 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-8 text-center text-sm text-zinc-500"
        }
      >
        Ainda não há registos.
      </p>
    );
  }

  return (
    <ul className={compact ? "mt-2 flex flex-col gap-1.5" : "mt-3 flex flex-col gap-2"}>
      {shown.map((row, i) => {
        const prev = shown[i - 1];
        const showDayHeader = i === 0 || row.logged_on !== prev?.logged_on;
        return (
          <li key={row.id} className="space-y-1.5">
            {showDayHeader && (
              <p
                className={
                  compact
                    ? "pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400 first:pt-0"
                    : "pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400 first:pt-0"
                }
              >
                {formatDayPt(row.logged_on)}
              </p>
            )}
            <div
              className={
                compact
                  ? "flex gap-2 rounded-xl border border-zinc-200/90 bg-surface p-2.5 shadow-sm"
                  : "flex gap-3 rounded-2xl border border-zinc-200/90 bg-surface p-3 shadow-card"
              }
            >
              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  className={
                    compact
                      ? "text-[13px] font-medium leading-tight text-zinc-900"
                      : "text-sm font-medium text-zinc-900"
                  }
                >
                  {mealSlotLabelPt(row.meal_slot as MealSlot)}
                  <span
                    className={
                      compact
                        ? "ml-1.5 font-normal tabular-nums text-zinc-500"
                        : "ml-2 font-normal tabular-nums text-zinc-500"
                    }
                  >
                    {formatTimePt(row.logged_at ?? row.created_at)}
                  </span>
                </p>
                <p
                  className={
                    compact
                      ? "text-xs tabular-nums text-zinc-700"
                      : "text-sm tabular-nums text-zinc-700"
                  }
                >
                  <span className="font-semibold text-zinc-900">
                    {row.grams_carbs} g
                  </span>
                  {" · HC"}
                  {row.rapid_insulin_units != null && (
                    <>
                      <span className="mx-1 text-zinc-300">·</span>
                      <span className="font-semibold text-violet-800">
                        {row.rapid_insulin_units} UI
                      </span>
                      {" rápida"}
                    </>
                  )}
                </p>
                {row.note && (
                  <p
                    className={
                      compact
                        ? "line-clamp-2 text-[11px] leading-snug text-zinc-600"
                        : "text-xs leading-relaxed text-zinc-600"
                    }
                  >
                    {row.note}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-0.5 self-start">
                <button
                  type="button"
                  title="Editar registo"
                  disabled={editBusy || deletingId === row.id}
                  onClick={() => onEdit(row)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-accent/40 hover:bg-accent/10 hover:text-accent disabled:opacity-40 sm:h-9 sm:w-9 sm:rounded-xl"
                >
                  <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
                <button
                  type="button"
                  title="Apagar registo"
                  disabled={deletingId === row.id}
                  onClick={() => onDelete(row.id)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40 sm:h-9 sm:w-9 sm:rounded-xl"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
