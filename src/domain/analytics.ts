export type AnalyticsFilter = {
  period: "all" | "30d" | "90d" | "6m" | "12m";
  comparison: "previous_period" | "none";
  projectId: string | null;
  team: string | null;
  ownerId: string | null;
  status: string | null;
  service: string | null;
};

export type AnalyticsServiceDimension = {
  code: string;
  label: string;
  kind: "incident" | "integration";
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
  hasData?: boolean;
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
  value: number;
  unit: AnalyticsKpi["unit"];
  context: string;
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

export type AnalyticsSelection = {
  dimension: "metric" | "period" | "team" | "status" | "service" | "project";
  value: string;
  label: string;
  sourceCode: string;
};

export type AnalyticsInsight = {
  code: string;
  tone: "positive" | "neutral" | "warning";
  title: string;
  summary: string;
  metricCode: string | null;
};

export type AnalyticsDrilldownState = {
  selection: AnalyticsSelection;
  title: string;
  description: string;
};

export function buildAnalyticsInsights(snapshot: AnalyticsSnapshot): AnalyticsInsight[] {
  const insights: AnalyticsInsight[] = snapshot.alerts.slice(0, 2).map((alert) => ({
    code: `attention-${alert.id}`,
    tone: alert.severity === "critical" || alert.severity === "warning" ? "warning" : "neutral",
    title: `${alert.title} requiere seguimiento`,
    summary: `${alert.context}: ${alert.value}. Abre el detalle para revisar el origen antes de tomar una decisión.`,
    metricCode: snapshot.kpis.find((item) => item.label === alert.title)?.code ?? null,
  }));
  const strongestTrend = [...snapshot.kpis]
    .filter((item) => item.variation !== null && item.hasData !== false)
    .sort((left, right) => Math.abs(right.variation ?? 0) - Math.abs(left.variation ?? 0))[0];
  if (strongestTrend) {
    const favorable = strongestTrend.favorableDirection === "neutral"
      ? null
      : strongestTrend.favorableDirection === "increase"
        ? (strongestTrend.variation ?? 0) >= 0
        : (strongestTrend.variation ?? 0) <= 0;
    insights.push({
      code: `trend-${strongestTrend.code}`,
      tone: favorable === null ? "neutral" : favorable ? "positive" : "warning",
      title: `${strongestTrend.label} marca la principal variación`,
      summary: `Cambia un ${Math.abs(strongestTrend.variation!).toLocaleString("es-ES", { maximumFractionDigits: 1 })} % frente al periodo anterior.`,
      metricCode: strongestTrend.code,
    });
  }
  if (!insights.length) {
    insights.push({
      code: "stable-period",
      tone: "positive",
      title: "El periodo se mantiene estable",
      summary: "No se detectan desviaciones relevantes con los filtros actuales.",
      metricCode: snapshot.kpis[0]?.code ?? null,
    });
  }
  return insights.slice(0, 3);
}

export type MetricDefinition = {
  code: string;
  label: string;
  description: string;
  interpretation: string;
  unit: "count" | "percentage" | "days" | "currency";
  sourceLabel: string;
  updateFrequency: string;
  permission: "analytics.dashboards.view" | "analytics.dashboards.export";
};

export const controlCenterMetrics: MetricDefinition[] = [
  {
    code: "projects_at_risk",
    label: "Proyectos en riesgo",
    description: "Proyectos activos que necesitan seguimiento por riesgo o desviación.",
    interpretation: "Un valor bajo indica que la planificación se mantiene estable.",
    unit: "count",
    sourceLabel: "Proyectos",
    updateFrequency: "Se actualiza al cambiar un proyecto o sus tareas",
    permission: "analytics.dashboards.view",
  },
  {
    code: "overdue_work",
    label: "Trabajo vencido",
    description: "Tareas pendientes cuya fecha límite ya ha pasado.",
    interpretation: "Cuanto menor sea el valor, mejor está cumpliéndose la planificación.",
    unit: "count",
    sourceLabel: "Tareas",
    updateFrequency: "Se actualiza al cambiar una tarea o su fecha límite",
    permission: "analytics.dashboards.view",
  },
  {
    code: "sla_compliance",
    label: "Cumplimiento SLA",
    description: "Porcentaje de incidencias atendidas dentro del tiempo comprometido.",
    interpretation: "Un porcentaje alto indica un mejor cumplimiento de los tiempos de servicio.",
    unit: "percentage",
    sourceLabel: "Incidencias",
    updateFrequency: "Se actualiza al registrar o resolver una incidencia",
    permission: "analytics.dashboards.view",
  },
  {
    code: "available_capacity",
    label: "Capacidad disponible",
    description: "Personas activas que no tienen una ausencia aprobada en la fecha consultada.",
    interpretation: "Permite conocer la disponibilidad aproximada del equipo.",
    unit: "count",
    sourceLabel: "Personal y vacaciones",
    updateFrequency: "Se actualiza al cambiar una persona o una solicitud de vacaciones",
    permission: "analytics.dashboards.view",
  },
  {
    code: "cash_margin",
    label: "Margen operativo",
    description: "Porcentaje que queda después de descontar los pagos de los cobros del periodo.",
    interpretation: "Un margen positivo y estable refleja una posición financiera saludable.",
    unit: "percentage",
    sourceLabel: "Tesorería",
    updateFrequency: "Se actualiza al registrar o validar un movimiento",
    permission: "analytics.dashboards.view",
  },
  {
    code: "integration_success",
    label: "Éxito de integraciones",
    description: "Porcentaje de ejecuciones completadas sin errores durante el periodo.",
    interpretation: "Un porcentaje alto indica que las sincronizaciones funcionan con normalidad.",
    unit: "percentage",
    sourceLabel: "Integraciones",
    updateFrequency: "Se actualiza después de cada ejecución",
    permission: "analytics.dashboards.view",
  },
  {
    code: "completed_tasks",
    label: "Tareas completadas",
    description: "Tareas que se han finalizado dentro del periodo seleccionado.",
    interpretation: "Ayuda a seguir el ritmo de entrega del equipo.",
    unit: "count",
    sourceLabel: "Tareas",
    updateFrequency: "Se actualiza al cambiar el estado de una tarea",
    permission: "analytics.dashboards.view",
  },
  {
    code: "blocked_tasks",
    label: "Trabajo bloqueado",
    description: "Tareas que no pueden avanzar hasta resolver una dependencia o impedimento.",
    interpretation: "Un valor bajo indica que el trabajo fluye con menos interrupciones.",
    unit: "count",
    sourceLabel: "Tareas",
    updateFrequency: "Se actualiza al cambiar el estado de una tarea",
    permission: "analytics.dashboards.view",
  },
  {
    code: "active_people",
    label: "Personas activas",
    description: "Personas con acceso activo y participación vigente en la organización.",
    interpretation: "Representa el tamaño actual del equipo disponible.",
    unit: "count",
    sourceLabel: "Personal",
    updateFrequency: "Se actualiza al cambiar el estado de una persona",
    permission: "analytics.dashboards.view",
  },
  {
    code: "approved_leave",
    label: "Ausencias aprobadas",
    description: "Solicitudes de vacaciones aprobadas que coinciden con el periodo consultado.",
    interpretation: "Permite anticipar cambios en la disponibilidad del equipo.",
    unit: "count",
    sourceLabel: "Vacaciones",
    updateFrequency: "Se actualiza al aprobar o cancelar una solicitud",
    permission: "analytics.dashboards.view",
  },
  {
    code: "teams",
    label: "Equipos",
    description: "Equipos que cuentan con al menos una persona activa.",
    interpretation: "Muestra la estructura operativa disponible en el periodo.",
    unit: "count",
    sourceLabel: "Personal",
    updateFrequency: "Se actualiza al cambiar la asignación de equipo",
    permission: "analytics.dashboards.view",
  },
  {
    code: "incident_backlog",
    label: "Incidencias pendientes",
    description: "Incidencias que todavía no se han resuelto ni cerrado.",
    interpretation: "Un valor bajo indica una menor carga pendiente de atención.",
    unit: "count",
    sourceLabel: "Incidencias",
    updateFrequency: "Se actualiza al cambiar el estado de una incidencia",
    permission: "analytics.dashboards.view",
  },
  {
    code: "critical_incidents",
    label: "Incidencias críticas",
    description: "Incidencias registradas con la prioridad más alta.",
    interpretation: "Deben revisarse de forma prioritaria para reducir el impacto.",
    unit: "count",
    sourceLabel: "Incidencias",
    updateFrequency: "Se actualiza al registrar o reclasificar una incidencia",
    permission: "analytics.dashboards.view",
  },
  {
    code: "investigating_incidents",
    label: "En investigación",
    description: "Incidencias cuyo diagnóstico o causa todavía se está analizando.",
    interpretation: "Permite controlar el trabajo que sigue abierto en fase de análisis.",
    unit: "count",
    sourceLabel: "Incidencias",
    updateFrequency: "Se actualiza al cambiar el estado de una incidencia",
    permission: "analytics.dashboards.view",
  },
  {
    code: "cash_balance",
    label: "Saldo del periodo",
    description: "Diferencia entre los cobros y los pagos registrados durante el periodo.",
    interpretation: "Un saldo positivo indica que los cobros superan a los pagos.",
    unit: "currency",
    sourceLabel: "Tesorería",
    updateFrequency: "Se actualiza al registrar o validar un movimiento",
    permission: "analytics.dashboards.view",
  },
  {
    code: "payroll_cost",
    label: "Coste empresa",
    description: "Coste total agregado del último ciclo de nómina incluido en el periodo.",
    interpretation: "Permite seguir la evolución del coste laboral sin mostrar importes individuales.",
    unit: "currency",
    sourceLabel: "Nóminas",
    updateFrequency: "Se actualiza al calcular o cerrar un ciclo",
    permission: "analytics.dashboards.view",
  },
];
