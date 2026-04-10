"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthUser } from "@/hooks/useAuthUser";

export function CarbGoalPanel() {
  const supabase = createClient();
  const { userId, loading: authLoading } = useAuthUser();
  const [goal, setGoal] = useState("200");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
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
  }, [supabase, userId]);

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

    if (!userId) {
      setMsg("Inicia sessão para guardar.");
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

  if (authLoading) {
    return <p className="text-sm text-zinc-500">A carregar…</p>;
  }

  if (!userId) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">A carregar meta…</p>;
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
    >
      <p className="text-sm font-medium text-zinc-900">Meta diária de hidratos</p>
      <p className="mt-1 text-xs text-zinc-500">
        Gramas de HC por dia (usado no anel do dashboard).
      </p>
      <div className="mt-3 flex gap-2">
        <input
          inputMode="decimal"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
        />
        <span className="flex items-center text-xs text-zinc-500">g / dia</span>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${msg === "Guardado." ? "text-accent" : "text-red-600"}`}
        >
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        {saving ? "A guardar…" : "Guardar meta"}
      </button>
    </form>
  );
}

export function WaterGoalPanel() {
  const supabase = createClient();
  const { userId, loading: authLoading } = useAuthUser();
  const [goalMl, setGoalMl] = useState("2000");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
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
  }, [supabase, userId]);

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

    if (!userId) {
      setMsg("Inicia sessão para guardar.");
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

  if (authLoading) {
    return <p className="text-sm text-zinc-500">A carregar…</p>;
  }

  if (!userId) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">A carregar meta de água…</p>;
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
    >
      <p className="text-sm font-medium text-zinc-900">Meta diária de água</p>
      <p className="mt-1 text-xs text-zinc-500">
        Mililitros por dia (barra de hidratação no dashboard). Ex.: 2000 = 2 L.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          inputMode="numeric"
          value={goalMl}
          onChange={(e) => setGoalMl(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
        />
        <span className="flex items-center text-xs text-zinc-500">ml / dia</span>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${msg === "Guardado." ? "text-accent" : "text-red-600"}`}
        >
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        {saving ? "A guardar…" : "Guardar meta de água"}
      </button>
    </form>
  );
}

/**
 * Regra opcional: gramas de HC que 1 UI de insulina rápida cobre (definida com a equipa).
 * Usada no dashboard só como comparação orientativa.
 */
export function InsulinRulePanel() {
  const supabase = createClient();
  const { userId, loading: authLoading } = useAuthUser();
  const [grams, setGrams] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("insulin_carb_grams_per_unit")
      .eq("id", userId)
      .maybeSingle();

    const g = data?.insulin_carb_grams_per_unit;
    if (typeof g === "number" && g > 0) {
      setGrams(String(g));
    } else {
      setGrams("");
    }
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const trimmed = grams.trim();
    let value: number | null = null;
    if (trimmed !== "") {
      const v = parseFloat(trimmed.replace(",", "."));
      if (Number.isNaN(v) || v <= 0) {
        setMsg("Indica um número maior que zero ou deixa vazio para limpar.");
        return;
      }
      value = v;
    }

    if (!userId) {
      setMsg("Inicia sessão para guardar.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        insulin_carb_grams_per_unit: value,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setSaving(false);

    if (error) setMsg(error.message);
    else setMsg("Guardado.");
  }

  if (authLoading) {
    return <p className="text-sm text-zinc-500">A carregar…</p>;
  }

  if (!userId) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">A carregar regra de insulina…</p>;
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
    >
      <p className="text-sm font-medium text-zinc-900">
        Regra HC / insulina rápida (opcional)
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Quantos <strong>gramas de hidratos</strong> costumam ser cobertos por{" "}
        <strong>1 UI</strong> de insulina rápida (valor acordado com o médico ou
        educador). Ex.: se a regra for 1 UI por 12 g, coloca 12. O dashboard
        compara com os HC registados <em>só como ajuda visual</em>.
      </p>
      <div className="mt-3 flex gap-2">
        <input
          inputMode="decimal"
          placeholder="ex: 12"
          value={grams}
          onChange={(e) => setGrams(e.target.value)}
          className="min-w-0 flex-1 rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
        />
        <span className="flex items-center text-xs text-zinc-500">g / UI</span>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${msg === "Guardado." ? "text-accent" : "text-red-600"}`}
        >
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        {saving ? "A guardar…" : "Guardar regra"}
      </button>
    </form>
  );
}

/**
 * ISF e alvo de correção em mg/dL (armazenamento canónico na BD).
 * Serve de referência para futuras UIs; não calcula doses automaticamente.
 */
export function CorrectionSensitivityPanel() {
  const supabase = createClient();
  const { userId, loading: authLoading } = useAuthUser();
  const [isf, setIsf] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("isf_drop_mg_dl_per_unit, correction_target_mg_dl")
      .eq("id", userId)
      .maybeSingle();

    const i = data?.isf_drop_mg_dl_per_unit;
    if (typeof i === "number" && i > 0) setIsf(String(i));
    else setIsf("");

    const t = data?.correction_target_mg_dl;
    if (typeof t === "number" && t > 0) setTarget(String(t));
    else setTarget("");

    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    let isfVal: number | null = null;
    const isfTrim = isf.trim();
    if (isfTrim !== "") {
      const v = parseFloat(isfTrim.replace(",", "."));
      if (Number.isNaN(v) || v <= 0) {
        setMsg("ISF inválido: indica mg/dL por UI ou deixa vazio.");
        return;
      }
      isfVal = v;
    }

    let targetVal: number | null = null;
    const targetTrim = target.trim();
    if (targetTrim !== "") {
      const v = parseFloat(targetTrim.replace(",", "."));
      if (Number.isNaN(v) || v <= 0) {
        setMsg("Alvo inválido: indica mg/dL ou deixa vazio.");
        return;
      }
      targetVal = v;
    }

    if (!userId) {
      setMsg("Inicia sessão para guardar.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        isf_drop_mg_dl_per_unit: isfVal,
        correction_target_mg_dl: targetVal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setSaving(false);

    if (error) setMsg(error.message);
    else setMsg("Guardado.");
  }

  if (authLoading) {
    return <p className="text-sm text-zinc-500">A carregar…</p>;
  }

  if (!userId) {
    return null;
  }

  if (loading) {
    return (
      <p className="text-sm text-zinc-500">
        A carregar sensibilidade à insulina…
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
    >
      <p className="text-sm font-medium text-zinc-900">
        Correção e sensibilidade (opcional)
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        Valores acordados com a equipa: quantos <strong>mg/dL</strong> baixa{" "}
        <strong>1 UI</strong> de insulina rápida (fator de sensibilidade / ISF) e
        o teu <strong>alvo em mg/dL</strong> para correções. Guardados para
        referência; a app <em>não</em> sugere doses de correção.
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <label
            htmlFor="isf-mgdl"
            className="mb-1 block text-[11px] font-medium text-zinc-500"
          >
            Queda por 1 UI (mg/dL)
          </label>
          <input
            id="isf-mgdl"
            inputMode="decimal"
            placeholder="ex: 50"
            value={isf}
            onChange={(e) => setIsf(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
          />
        </div>
        <div>
          <label
            htmlFor="correction-target"
            className="mb-1 block text-[11px] font-medium text-zinc-500"
          >
            Alvo de correção (mg/dL)
          </label>
          <input
            id="correction-target"
            inputMode="decimal"
            placeholder="ex: 100"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
          />
        </div>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${msg === "Guardado." ? "text-accent" : "text-red-600"}`}
        >
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        {saving ? "A guardar…" : "Guardar"}
      </button>
    </form>
  );
}

/** Contacto opcional para o modo hipo (atalho de chamada; a app não envia SMS). */
export function EmergencyContactPanel() {
  const supabase = createClient();
  const { userId, loading: authLoading } = useAuthUser();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("emergency_contact_name, emergency_contact_phone")
      .eq("id", userId)
      .maybeSingle();
    setName(data?.emergency_contact_name?.trim() ?? "");
    setPhone(data?.emergency_contact_phone?.trim() ?? "");
    setLoading(false);
  }, [supabase, userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!userId) {
      setMsg("Inicia sessão para guardar.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        emergency_contact_name: name.trim() || null,
        emergency_contact_phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);
    setSaving(false);
    if (error) setMsg(error.message);
    else setMsg("Guardado.");
  }

  if (authLoading) {
    return <p className="text-sm text-zinc-500">A carregar…</p>;
  }
  if (!userId) return null;
  if (loading) {
    return (
      <p className="text-sm text-zinc-500">A carregar contacto de emergência…</p>
    );
  }

  return (
    <form
      onSubmit={(e) => void save(e)}
      className="rounded-2xl border border-zinc-200/90 bg-surface p-4 shadow-card"
    >
      <p className="text-sm font-medium text-zinc-900">Contacto de confiança (hipo)</p>
      <p className="mt-1 text-xs text-zinc-500">
        Opcional: usado no modo <strong>Hipo</strong> para atalho de chamada e
        texto de partilha. A app não envia SMS nem alertas automáticos a terceiros.
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <label
            htmlFor="emergency-name"
            className="mb-1 block text-[11px] font-medium text-zinc-500"
          >
            Nome
          </label>
          <input
            id="emergency-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm text-zinc-900 outline-none ring-accent/30 focus:ring-2"
          />
        </div>
        <div>
          <label
            htmlFor="emergency-phone"
            className="mb-1 block text-[11px] font-medium text-zinc-500"
          >
            Telefone
          </label>
          <input
            id="emergency-phone"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            placeholder="+351…"
            className="w-full rounded-xl border border-zinc-200 bg-canvas px-3 py-2 text-sm tabular-nums text-zinc-900 outline-none ring-accent/30 focus:ring-2"
          />
        </div>
      </div>
      {msg && (
        <p
          className={`mt-2 text-xs ${msg === "Guardado." ? "text-accent" : "text-red-600"}`}
        >
          {msg}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-3 w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-medium text-zinc-900 disabled:opacity-50"
      >
        {saving ? "A guardar…" : "Guardar contacto"}
      </button>
    </form>
  );
}
