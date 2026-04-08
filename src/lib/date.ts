/** Dia local do dispositivo no formato YYYY-MM-DD (para coluna logged_on). */
export function getLocalDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** HH:mm no relógio local (ex.: para input type="time"). */
export function formatLocalTimeHm(d = new Date()): string {
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${min}`;
}

/** ISO UTC → HH:mm local. */
export function parseIsoToLocalTimeHm(iso: string): string {
  return formatLocalTimeHm(new Date(iso));
}

/**
 * Combina data local (YYYY-MM-DD) e hora (HH:mm) num instante ISO UTC
 * (para `timestamptz` no Supabase).
 */
export function localDateAndTimeToUtcIso(dateKey: string, timeHm: string): string {
  const [hhRaw, mmRaw] = timeHm.split(":");
  const hh = parseInt(hhRaw ?? "0", 10);
  const mm = parseInt(mmRaw ?? "0", 10);
  const [y, mo, d] = dateKey.split("-").map((x) => parseInt(x, 10));
  const dt = new Date(y, mo - 1, d, Number.isFinite(hh) ? hh : 0, Number.isFinite(mm) ? mm : 0, 0, 0);
  return dt.toISOString();
}
