"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MealLog } from "@/types/database";

export function useMealLogs(userId: string | null) {
  const supabase = useMemo(() => createClient(), []);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!userId) {
      setLogs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(200);

    setLoading(false);
    if (error) {
      setLogs([]);
      return;
    }
    setLogs((data ?? []) as MealLog[]);
  }, [supabase, userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { logs, loading, reload };
}
