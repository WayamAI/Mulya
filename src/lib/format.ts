/** Currency and number formatting. Estimates are stored in EUR. */

export type Currency = "EUR" | "USD" | "GBP";

export const CURRENCIES: Record<Currency, { symbol: string; rate: number }> = {
  EUR: { symbol: "€", rate: 1 },
  USD: { symbol: "$", rate: 1.08 },
  GBP: { symbol: "£", rate: 0.85 },
};

/** `€ 1,234.50`: converts from EUR at the fixed demo rate. */
export function formatMoney(valueEur: number, currency: Currency = "EUR", digits = 2): string {
  const { symbol, rate } = CURRENCIES[currency];
  const v = valueEur * rate;
  return `${v < 0 ? "−" : ""}${symbol} ${Math.abs(v).toLocaleString("en-GB", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

/** Signed percentage with a true minus sign: `+2.4%`, `−1.0%`. */
export function formatPct(value: number, digits = 1): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits)}%`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("en-GB", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** `14 Jul 2026`. Accepts ISO dates or datetimes; returns input unchanged if unparseable. */
export function formatDate(iso: string): string {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
