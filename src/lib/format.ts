const numberFormatters = new Map<string, Intl.NumberFormat>();

function getNumberFormatter(
  key: string,
  options: Intl.NumberFormatOptions,
) {
  const existing = numberFormatters.get(key);
  if (existing) return existing;
  const formatter = new Intl.NumberFormat("es-ES", options);
  numberFormatters.set(key, formatter);
  return formatter;
}

export function formatCurrency(
  amountCents: number,
  currency = "EUR",
) {
  return getNumberFormatter(`currency:${currency}`, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: "always",
  }).format(amountCents / 100);
}

export function formatNumber(value: number, fractionDigits = 0) {
  return getNumberFormatter(`number:${fractionDigits}`, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatPercent(value: number, fractionDigits = 1) {
  return getNumberFormatter(`percent:${fractionDigits}`, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value / 100);
}

export type AnalyticsDisplayUnit =
  | "count"
  | "percentage"
  | "days"
  | "currency";

export function formatAnalyticsValue(
  value: number,
  unit: AnalyticsDisplayUnit,
) {
  if (unit === "currency") return formatCurrency(value);
  if (unit === "percentage") return formatPercent(value, 2);
  if (unit === "days") return `${formatNumber(value, 2)} días`;
  return formatNumber(value);
}

export function formatDate(value: string) {
  const normalized = value.length === 10 ? `${value}T12:00:00` : value;
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(normalized));
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
