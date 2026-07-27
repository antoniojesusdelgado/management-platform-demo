export type AnalyticsFilter = {
  period: "30d" | "90d" | "6m" | "12m";
  comparison: "previous_period" | "none";
  projectId: string | null;
  team: string | null;
  ownerId: string | null;
  status: string | null;
  service: string | null;
};

export type AnalyticsKpi = {
  code: string;
  label: string;
  value: number;
  unit: "count" | "percentage" | "days" | "currency";
  variation: number | null;
  target: number | null;
  sparkline: number[];
  favorableDirection: "increase" | "decrease" | "neutral";
  context: string;
};

export type AnalyticsWindow = {
  current: { from: string; to: string };
  previous: { from: string; to: string };
};

export type AnalyticsSeries = {
  code: string;
  label: string;
  unit: AnalyticsKpi["unit"];
  points: Array<{ period: string; value: number }>;
};

export type AnalyticsAlert = {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  targetModule: string;
};

export type AnalyticsSnapshot = {
  generatedAt: string;
  filters: AnalyticsFilter;
  window: AnalyticsWindow;
  kpis: AnalyticsKpi[];
  series: AnalyticsSeries[];
  alerts: AnalyticsAlert[];
};

export type MetricDefinition = {
  code: string;
  label: string;
  formula: string;
  unit: "count" | "percentage" | "days" | "currency";
  source: string;
  grain: string;
  freshness: string;
  permission: "analytics.dashboards.view" | "analytics.dashboards.export";
};

export const controlCenterMetrics: MetricDefinition[] = [
  {
    code: "projects_at_risk",
    label: "Proyectos en riesgo",
    formula: "Proyectos activos cuya salud no es on_track",
    unit: "count",
    source: "projects",
    grain: "workspace",
    freshness: "Actualización inmediata",
    permission: "analytics.dashboards.view",
  },
  {
    code: "overdue_work",
    label: "Trabajo vencido",
    formula: "Tareas abiertas con due_date anterior a hoy",
    unit: "count",
    source: "tasks",
    grain: "workspace",
    freshness: "Actualización inmediata",
    permission: "analytics.dashboards.view",
  },
  {
    code: "sla_compliance",
    label: "Cumplimiento SLA",
    formula: "Incidencias cerradas o dentro de SLA / incidencias totales",
    unit: "percentage",
    source: "incidents",
    grain: "workspace",
    freshness: "Actualización inmediata",
    permission: "analytics.dashboards.view",
  },
  {
    code: "available_capacity",
    label: "Capacidad disponible",
    formula: "Personas activas sin ausencia aprobada actual",
    unit: "count",
    source: "people + leave_requests",
    grain: "workspace",
    freshness: "Actualización inmediata",
    permission: "analytics.dashboards.view",
  },
];
