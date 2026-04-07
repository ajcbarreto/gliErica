/**
 * Últimos `count` dias civis em YYYY-MM-DD no fuso dado (ex. Europe/Lisbon),
 * alinhado com `logged_on` no telemóvel em Portugal.
 */
export function getRecentDateKeys(
  count: number,
  timeZone = "Europe/Lisbon"
): string[] {
  const today = new Date().toLocaleDateString("sv-SE", { timeZone });
  const [y, m, d] = today.split("-").map(Number);
  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    const dt = new Date(Date.UTC(y, m - 1, d - i));
    const yk = dt.getUTCFullYear();
    const mk = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dk = String(dt.getUTCDate()).padStart(2, "0");
    keys.push(`${yk}-${mk}-${dk}`);
  }
  return keys.reverse();
}

export function minDateKeyInKeys(keys: string[]): string {
  return keys.length ? keys[0]! : "1970-01-01";
}
