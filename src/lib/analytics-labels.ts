const monthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "short",
  timeZone: "UTC",
});

const fullMonthFormatter = new Intl.DateTimeFormat("es-ES", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const userLabels: Record<string, string> = {
  blocked: "Bloqueadas",
  completed: "Completadas",
  in_progress: "En curso",
  in_review: "En revisión",
  pending: "Pendientes",
  assigned: "Asignadas",
  closed: "Cerradas",
  investigating: "En investigación",
  registered: "Registradas",
  resolved: "Resueltas",
  triaged: "Clasificadas",
};

export function formatAnalyticsAxisLabel(period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) return userLabels[period] ?? period;
  const [year, month] = period.split("-").map(Number);
  const label = monthFormatter
    .format(new Date(Date.UTC(year!, month! - 1, 1)))
    .replace(".", "");

  return month === 1 ? `${label} ${String(year).slice(-2)}` : label;
}

export function formatAnalyticsTableLabel(period: string) {
  if (!/^\d{4}-\d{2}$/.test(period)) return userLabels[period] ?? period;
  const [year, month] = period.split("-").map(Number);
  const label = fullMonthFormatter.format(
    new Date(Date.UTC(year!, month! - 1, 1)),
  );

  return `${label.charAt(0).toLocaleUpperCase("es")}${label.slice(1)}`;
}

export function getMonthlyTickGap(pointCount: number) {
  if (pointCount <= 6) return 20;
  if (pointCount <= 12) return 32;
  return 44;
}
