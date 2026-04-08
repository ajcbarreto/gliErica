"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { getAppUserId, tryAppUserId } from "@/lib/app-user";
import {
  datetimeLocalToIso,
  loggedOnFromDatetimeLocal,
  toDatetimeLocalValue,
} from "@/lib/datetime-local";
import type { ActivityIntensity, ActivityType } from "@/types/database";
import { ChevronLeft, Dumbbell, Trash2 } from "lucide-react";

const ACTIVITIES: { value: ActivityType; label: string }[] = [
  { value: "walk", label: "Caminhada" },
  { value: "run", label: "Corrida" },
  { value: "cycle", label: "Bicicleta" },
  { value: "sport", label: "Desporto" },
  { value: "workout", label: "Ginásio / treino" },
  { value: "other", label: "Outro" },
];

const INTENSITIES: {
  value: ActivityIntensity;
  label: string;
}[] = [
  { value: "light", label: "Leve" },
  { value: "moderate", label: "Moderada" },
  { value: "vigorous", label: "Vigorosa" },
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function activityLabel(t: ActivityType) {
  return ACTIVITIES.find((a) => a.value === t)?.label ?? t;
}

function intensityLabel(i: ActivityIntensity | null) {
  if (!i) return null;
  return INTENSITIES.find((x) => x.value === i)?.label ?? i;
}

export function ActivityLogClient() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [whenLocal, setWhenLocal] = useState(() =>
    toDatetimeLocalValue(new Date())
  );
  const [activityType, setActivityType] = useState<ActivityType>("walk");
  const [durationStr, setDurationStr] = useState("30");
  const [intensity, setIntensity] = useState<ActivityIntensity | "">("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState<
    {
      id: string;
      started_at: string;
      duration_minutes: number;
      activity_type: ActivityType;
      intensity: ActivityIntensity | null;
      note: string | null;
    }[]
  >([]);

  const refresh = useCallback(async () => {
    setMsg(null);
    const userId = tryAppUserId();
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("activity_entries")
      .select("id, started_at, duration_minutes, activity_type, intensity, note")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(40);

    if (error) {
      setMsg(
        error.message.includes("activity_entries")
          ? "Corre a migração 008_clinical_context (tabela activity_entries)."
          : error.message
      );
      setRows([]);
    } else {
      setRows((data ?? []) as typeof rows);
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const dm = parseInt(durationStr.replace(",", "."), 10);
    if (Number.isNaN(dm) || dm <= 0 || dm > 1440) {
      setMsg("Duração inválida: 1 a 1440 minutos.");
      return;
    }

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setMsg("Sem rede — este registo precisa de ligação.");
      return;
    }

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setMsg("Configura NEXT_PUBLIC_GLIERICA_USER_ID no .env.local.");
      return;
    }

    const startedAt = datetimeLocalToIso(whenLocal);
    const loggedOn = loggedOnFromDatetimeLocal(whenLocal);

    setSaving(true);
    const { error } = await supabase.from("activity_entries").insert({
      user_id: userId,
      logged_on: loggedOn,
      started_at: startedAt,
      duration_minutes: dm,
      activity_type: activityType,
      intensity: intensity === "" ? null : intensity,
      note: note.trim() === "" ? null : note.trim(),
    });
    setSaving(false);

    if (error) {
      setMsg(
        error.message.includes("activity_entries")
          ? "Migração 008 em falta ou tabela inacessível."
          : error.message
      );
      return;
    }

    setNote("");
    setWhenLocal(toDatetimeLocalValue(new Date()));
    void refresh();
  }

  async function remove(id: string) {
    setMsg(null);
    const { error } = await supabase.from("activity_entries").delete().eq("id", id);
    if (error) setMsg(error.message);
    else void refresh();
  }

  if (!tryAppUserId()) {
    return (
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        Configura o UUID da app para usar este ecrã.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/contexto"
        className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        Contexto clínico
      </Link>

      <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <Dumbbell className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">Novo exercício</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Contexto para variabilidade glicémica e consultas.
            </p>
          </div>
        </div>

        <form onSubmit={(e) => void submit(e)} className="mt-4 space-y-3">
          <div>
            <label
              htmlFor="act-when"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Início
            </label>
            <input
              id="act-when"
              type="datetime-local"
              value={whenLocal}
              onChange={(e) => setWhenLocal(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-medium text-zinc-500">
              Tipo
            </span>
            <div className="flex flex-wrap gap-2">
              {ACTIVITIES.map(({ value: av, label }) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setActivityType(av)}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium transition ${
                    activityType === av
                      ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="act-duration"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Duração (minutos)
            </label>
            <input
              id="act-duration"
              inputMode="numeric"
              value={durationStr}
              onChange={(e) => setDurationStr(e.target.value)}
              className="w-full max-w-[12rem] rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
          </div>
          <div>
            <span className="mb-1 block text-[11px] font-medium text-zinc-500">
              Intensidade (opcional)
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setIntensity("")}
                className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium ${
                  intensity === ""
                    ? "border-zinc-400 bg-zinc-100 text-zinc-900"
                    : "border-zinc-200 bg-zinc-50 text-zinc-600"
                }`}
              >
                —
              </button>
              {INTENSITIES.map(({ value: iv, label }) => (
                <button
                  key={iv}
                  type="button"
                  onClick={() => setIntensity(iv)}
                  className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium ${
                    intensity === iv
                      ? "border-emerald-400 bg-emerald-50 text-emerald-950"
                      : "border-zinc-200 bg-zinc-50 text-zinc-600"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label
              htmlFor="act-note"
              className="mb-1 block text-[11px] font-medium text-zinc-500"
            >
              Nota (opcional)
            </label>
            <input
              id="act-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-zinc-900 py-2.5 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "A guardar…" : "Guardar exercício"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card">
        <p className="text-sm font-medium text-zinc-900">Histórico recente</p>
        <p className="mt-0.5 text-xs text-zinc-500">Até 40 sessões.</p>
        {loading ? (
          <p className="mt-3 text-sm text-zinc-500">A carregar…</p>
        ) : rows.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Sem exercício registado.</p>
        ) : (
          <ul className="mt-3 divide-y divide-zinc-100">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-start justify-between gap-2 py-2.5 first:pt-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {activityLabel(r.activity_type)} · {r.duration_minutes} min
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    {formatWhen(r.started_at)}
                    {intensityLabel(r.intensity)
                      ? ` · ${intensityLabel(r.intensity)}`
                      : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(r.id)}
                  className="shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-red-600"
                  aria-label="Apagar exercício"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {msg && (
        <p className="text-xs text-red-600" role="alert">
          {msg}
        </p>
      )}
    </div>
  );
}
