import Decimal from "decimal.js";

const LAKH = 1_00_000;
const CRORE = 1_00_00_000;

/** "247500" -> "2,47,500" (last 3 digits, then groups of 2 — the Indian numbering system). */
function groupIndian(digits: string): string {
  if (digits.length <= 3) return digits;
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${grouped},${last3}`;
}

export function formatINR(
  value: number | string,
  options?: { compact?: boolean },
): string {
  const decimal = new Decimal(value);
  const negative = decimal.isNegative();
  const sign = negative ? "-" : "";
  const abs = decimal.abs();

  if (options?.compact) {
    if (abs.greaterThanOrEqualTo(CRORE)) {
      return `${sign}₹${abs.dividedBy(CRORE).toFixed(2)}Cr`;
    }
    if (abs.greaterThanOrEqualTo(LAKH)) {
      return `${sign}₹${abs.dividedBy(LAKH).toFixed(2)}L`;
    }
  }

  const [intPart, decPart] = abs.toFixed(2).split(".");
  return `${sign}₹${groupIndian(intPart)}.${decPart}`;
}

/** Same as formatINR, but always carries an explicit +/− sign — including zero. */
export function formatSignedINR(
  value: number | string,
  options?: { compact?: boolean },
): string {
  const decimal = new Decimal(value);
  const prefix = decimal.isNegative() ? "−" : "+";
  return `${prefix}${formatINR(decimal.abs().toString(), options)}`;
}

/** Indian-grouped integer, no currency symbol, no decimals — for share quantities. */
export function formatQty(qty: number | string): string {
  const decimal = new Decimal(qty);
  const negative = decimal.isNegative();
  return `${negative ? "-" : ""}${groupIndian(decimal.abs().toFixed(0))}`;
}

/** value is a 0-1 fraction (0.0735, not 7.35) — matches netPnlPct / winRate / adherence's own convention. */
export function formatPct(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

/** '14d' under a month, '3m 12d' under a year, '1y 4m' beyond — deliberately approximate (30-day months, 365-day years), not calendar-exact. */
export function formatHolding(days: number): string {
  if (days < DAYS_PER_MONTH) return `${days}d`;

  if (days < DAYS_PER_YEAR) {
    const months = Math.floor(days / DAYS_PER_MONTH);
    const remDays = days % DAYS_PER_MONTH;
    return `${months}m ${remDays}d`;
  }

  const years = Math.floor(days / DAYS_PER_YEAR);
  const remMonths = Math.floor((days % DAYS_PER_YEAR) / DAYS_PER_MONTH);
  return `${years}y ${remMonths}m`;
}
