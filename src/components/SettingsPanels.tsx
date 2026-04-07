"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getAppUserId, tryAppUserId } from "@/lib/app-user";

export function CarbGoalPanel() {
  const supabase = createClient();
  const [goal, setGoal] = useState("200");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const userId = tryAppUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").insert({
        id: userId,
        daily_carb_goal: 200,
        daily_water_goal_ml: 2000,
      });
    }

    const { data } = await supabase
      .from("profiles")
      .select("daily_carb_goal")
      .eq("id", userId)
      .maybeSingle();

    if (data?.daily_carb_goal != null) {
      setGoal(String(data.daily_carb_goal));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const v = parseFloat(goal.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      setMsg("Meta inválida.");
      return;
    }

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setMsg("UUID da app não configurado.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ daily_carb_goal: v, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setSaving(false);

    if (error) setMsg(error.message);
    else setMsg("Guardado.");
  }

  if (!tryAppUserId()) {
    return (
      <p className="rounded-2xl border border-amber-500/30 bg-amber-950/30 p-4 text-sm text-amber-100/90">
        Configura <code className="text-xs">NEXT_PUBLIC_GLIERICA_USER_ID</code> no
        .env.local para usar a meta de hidratos.
      </p>
    );
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">A carregar meta…</p>;
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="rounded-2xl border border-white/5 bg-surface p-4 shadow-card"
    >
      <p className="text-sm font-medium text-white">Meta diária de hidratos</p>
      <p className="mt-1 text-xs text-zinc-500">
        Gramas de HC por dia (usado no anel do dashboard).
      </p>
      <div className="mt-3 flex gap-2">
        <input
          inputMode="decimal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-canvas px-3 py-2 text-sm tabular-nums text-white outline-none ring-accent/30 focus:ring-2"
        />
        <span className="flex items-center text-xs text-zinc-500">g / dia</span>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${msg === "Guardado." ? "text-accent" : "text-red-400"}`}
        >
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-white/[0.08] py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "A guardar…" : "Guardar meta"}
      </button>
    </form>
  );
}

export function WaterGoalPanel() {
  const supabase = createClient();
  const [goalMl, setGoalMl] = useState("2000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const userId = tryAppUserId();
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").insert({
        id: userId,
        daily_carb_goal: 200,
        daily_water_goal_ml: 2000,
      });
    }

    const { data } = await supabase
      .from("profiles")
      .select("daily_water_goal_ml")
      .eq("id", userId)
      .maybeSingle();

    const g = data?.daily_water_goal_ml;
    if (typeof g === "number" && g > 0) {
      setGoalMl(String(Math.round(g)));
    }
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const v = parseFloat(goalMl.replace(",", "."));
    if (Number.isNaN(v) || v <= 0) {
      setMsg("Meta inválida (ml tem de ser > 0).");
      return;
    }

    let userId: string;
    try {
      userId = getAppUserId();
    } catch {
      setMsg("UUID da app não configurado.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        daily_water_goal_ml: Math.round(v),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setSaving(false);

    if (error) setMsg(error.message);
    else setMsg("Guardado.");
  }

  if (!tryAppUserId()) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">A carregar meta de água…</p>;
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="rounded-2xl border border-white/5 bg-surface p-4 shadow-card"
    >
      <p className="text-sm font-medium text-white">Meta diária de água</p>
      <p className="mt-1 text-xs text-zinc-500">
        Mililitros por dia (barra de hidratação no dashboard). Ex.: 2000 = 2 L.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          inputMode="numeric"
          value={goalMl}
          onChange={(e) => setGoalMl(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-canvas px-3 py-2 text-sm tabular-nums text-white outline-none ring-accent/30 focus:ring-2"
        />
        <span className="flex items-center text-xs text-zinc-500">ml / dia</span>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${msg === "Guardado." ? "text-accent" : "text-red-400"}`}
        >
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-white/[0.08] py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {saving ? "A guardar…" : "Guardar meta de água"}
      </button>
    </form>
  );
}
