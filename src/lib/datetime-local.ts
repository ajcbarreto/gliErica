import { getLocalDateKey } from "@/lib/date";

/** Valor para `<input type="datetime-local" />` a partir de uma `Date` local. */
export function toDatetimeLocalValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO UTC para gravar em `timestamptz`; `datetime-local` sem timezone = hora local. */
export function datetimeLocalToIso(localValue: string): string {
  const d = new Date(localValue);
  return d.toISOString();
}

/** `logged_on` coerente com o instante escolhido no datetime-local. */
export function loggedOnFromDatetimeLocal(localValue: string): string {
  return getLocalDateKey(new Date(localValue));
}
