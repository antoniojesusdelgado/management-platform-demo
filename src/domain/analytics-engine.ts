import type {
  AnalyticsAlert,
  AnalyticsFilter,
  AnalyticsKpi,
  AnalyticsSeries,
  AnalyticsSnapshot,
  AnalyticsWindow,
} from "@/domain/analytics";
import type { Incident } from "@/domain/incidents";
import type { IntegrationRun } from "@/domain/integrations";
import type { PayrollRun } from "@/domain/payroll";
import type { Person } from "@/domain/people";
import type { Project } from "@/domain/projects";
import type { TaskItem } from "@/domain/tasks";
import type { TreasuryEntry } from "@/domain/treasury";
import type { LeaveRequest } from "@/domain/vacations";

export type AnalyticsView =
  | "executive"
  | "work"
  | "people"
  | "service"
  | "finance";

export type AnalyticsData = {
  projects: Project[];
  tasks: TaskItem[];
  incidents: Incident[];
  people: Person[];
  leaveRequests: LeaveRequest[];
  treasuryEntries: TreasuryEntry[];
  payrollRuns: PayrollRun[];
  integrationRuns: IntegrationRun[];
};

const DAY = 86_400_000;

function toIsoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function firstDayOfRollingMonthWindow(value: Date, months: number) {
  return new Date(Date.UTC(
    value.getUTCFullYear(),
    value.getUTCMonth() - (months - 1),
    1,
  ));
}

export function createAnalyticsWindow(
  period: AnalyticsFilter["period"],
  now = new Date(),
  historyStart = "2025-01-01",
): AnalyticsWindow {
  const to = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    23,
    59,
    59,
    999,
  ));
  const from =
    period === "all"
      ? new Date(`${historyStart}T00:00:00.000Z`)
      : period === "30d"
      ? new Date(to.getTime() - 29 * DAY)
      : period === "90d"
        ? new Date(to.getTime() - 89 * DAY)
        : firstDayOfRollingMonthWindow(to, period === "6m" ? 6 : 12);
  const currentFromDay = Date.UTC(
    from.getUTCFullYear(),
    from.getUTCMonth(),
    from.getUTCDate(),
  );
  const currentToDay = Date.UTC(
    to.getUTCFullYear(),
    to.getUTCMonth(),
    to.getUTCDate(),
  );
  const inclusiveDays = Math.round((currentToDay - currentFromDay) / DAY) + 1;
  const previousTo = new Date(currentFromDay - DAY);
  const previousFrom = new Date(currentFromDay - inclusiveDays * DAY);
  return {
    current: { from: toIsoDate(from), to: toIsoDate(to) },
    previous: {
      from: toIsoDate(previousFrom),
      to: toIsoDate(previousTo),
    },
  };
}

function within(value: string | null | undefined, window: { from: string; to: string }) {
  if (!value) return false;
  const date = value.slice(0, 10);
  return date >= window.from && date <= window.to;
}

export function calculateVariation(current: number, previous: number) {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function kpi(
  code: string,
  label: string,
  value: number,
  previous: number | null,
  unit: AnalyticsKpi["unit"],
  context: string,
  favorableDirection: AnalyticsKpi["favorableDirection"],
  target: number | null = null,
  hasData = true,
): AnalyticsKpi {
  return {
    code,
    label,
    value,
    unit,
    variation: previous === null ? null : calculateVariation(value, previous),
    target,
    sparkline: [],
    favorableDirection,
    context,
    hasData,
  };
}

function filterByRelations(data: AnalyticsData, filters: AnalyticsFilter) {
  const people = data.people.filter(
    (person) =>
      (!filters.team || person.team === filters.team) &&
      (!filters.ownerId || person.id === filters.ownerId),
  );
  const personIds = new Set(people.map((person) => person.id));
  const personNames = new Set(people.map((person) => person.displayName));
  const projects = data.projects.filter(
    (project) =>
      (!filters.projectId || project.id === filters.projectId) &&
      (!filters.ownerId || project.ownerPersonId === filters.ownerId),
  );
  const projectIds = new Set(projects.map((project) => project.id));
  const tasks = data.tasks.filter(
    (task) =>
      (!filters.projectId || Boolean(task.projectId && projectIds.has(task.projectId))) &&
      (!filters.team && !filters.ownerId ||
        Boolean(task.assigneePersonId && personIds.has(task.assigneePersonId)) ||
        Boolean(task.assigneeName && personNames.has(task.assigneeName))) &&
      (!filters.status || task.status === filters.status),
  );
  const incidents = data.incidents.filter(
    (incident) =>
      (!filters.projectId ||
        Boolean(incident.projectId && projectIds.has(incident.projectId))) &&
      (!filters.team && !filters.ownerId ||
        Boolean(incident.assigneePersonId && personIds.has(incident.assigneePersonId)) ||
        Boolean(incident.assigneeName && personNames.has(incident.assigneeName))) &&
      (!filters.status || incident.status === filters.status) &&
      (!filters.service || incident.affectedService === filters.service),
  );
  const leaveRequests = data.leaveRequests.filter(
    (request) => !filters.team && !filters.ownerId || personNames.has(request.employeeName),
  );
  return { people, projects, tasks, incidents, leaveRequests };
}

function slaCompliance(incidents: Incident[], now: string) {
  if (!incidents.length) return 100;
  const compliant = incidents.filter(
    (incident) =>
      ["resolved", "closed"].includes(incident.status) ||
      incident.slaDueAt.slice(0, 10) >= now,
  ).length;
  return (compliant / incidents.length) * 100;
}

function integrationSuccess(runs: IntegrationRun[]) {
  const completed = runs.filter((run) =>
    ["succeeded", "partial", "failed"].includes(run.status),
  );
  if (!completed.length) return null;
  return (
    completed.filter((run) => run.status === "succeeded").length /
    completed.length
  ) * 100;
}

function financeTotals(entries: TreasuryEntry[]) {
  const income = entries
    .filter((entry) => entry.amountCents > 0)
    .reduce((total, entry) => total + entry.amountCents, 0);
  const expense = Math.abs(
    entries
      .filter((entry) => entry.amountCents < 0)
      .reduce((total, entry) => total + entry.amountCents, 0),
  );
  return {
    balance: income - expense,
    margin: income ? ((income - expense) / income) * 100 : 0,
  };
}

function monthKeys(from: string, to: string) {
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const end = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  const keys: string[] = [];
  while (cursor <= end) {
    keys.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return keys;
}

function countSeries<T>(
  code: string,
  label: string,
  values: T[],
  key: (value: T) => string,
  periods: string[] = [],
): AnalyticsSeries {
  const counts = new Map<string, number>(periods.map((period) => [period, 0]));
  for (const value of values) {
    const period = key(value);
    counts.set(period, (counts.get(period) ?? 0) + 1);
  }
  return {
    code,
    label,
    unit: "count",
    points: [...counts.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([period, value]) => ({ period, value })),
  };
}

function sumSeries<T>(
  code: string,
  label: string,
  values: T[],
  key: (value: T) => string,
  amount: (value: T) => number,
  periods: string[] = [],
): AnalyticsSeries {
  const totals = new Map<string, number>(periods.map((period) => [period, 0]));
  for (const value of values) {
    const period = key(value);
    totals.set(period, (totals.get(period) ?? 0) + amount(value));
  }
  return {
    code,
    label,
    unit: "currency",
    points: [...totals.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([period, value]) => ({ period, value })),
  };
}

export function buildAnalyticsSnapshot(
  data: AnalyticsData,
  filters: AnalyticsFilter,
  view: AnalyticsView,
  now = new Date(),
): AnalyticsSnapshot {
  const window = createAnalyticsWindow(filters.period, now);
  const related = filterByRelations(data, filters);
  const currentTasks = related.tasks.filter((task) =>
    within(task.status === "completed" ? task.updatedAt : task.createdAt, window.current),
  );
  const previousTasks = related.tasks.filter((task) =>
    within(task.status === "completed" ? task.updatedAt : task.createdAt, window.previous),
  );
  const currentIncidents = related.incidents.filter((incident) =>
    within(incident.createdAt, window.current),
  );
  const previousIncidents = related.incidents.filter((incident) =>
    within(incident.createdAt, window.previous),
  );
  const currentTreasury = data.treasuryEntries.filter((entry) =>
    within(entry.entryDate, window.current),
  );
  const previousTreasury = data.treasuryEntries.filter((entry) =>
    within(entry.entryDate, window.previous),
  );
  const currentPayroll = data.payrollRuns.filter((run) =>
    within(run.periodStart, window.current),
  );
  const previousPayroll = data.payrollRuns.filter((run) =>
    within(run.periodStart, window.previous),
  );
  const currentRuns = data.integrationRuns.filter((run) =>
    within(run.effectiveDate, window.current) &&
    (!filters.service || run.connectorId === filters.service),
  );
  const previousRuns = data.integrationRuns.filter((run) =>
    within(run.effectiveDate, window.previous) &&
    (!filters.service || run.connectorId === filters.service),
  );
  const currentIntegrationSuccess = integrationSuccess(currentRuns);
  const previousIntegrationSuccess = integrationSuccess(previousRuns);
  const currentLeaves = related.leaveRequests.filter(
    (leave) => leave.status === "approved" && within(leave.startDate, window.current),
  );
  const previousLeaves = related.leaveRequests.filter(
    (leave) => leave.status === "approved" && within(leave.startDate, window.previous),
  );
  const currentFinance = financeTotals(currentTreasury);
  const previousFinance = financeTotals(previousTreasury);
  const today = toIsoDate(now);
  const risk = related.projects.filter(
    (project) => project.status === "active" && project.health !== "on_track",
  ).length;
  const currentOverdue = currentTasks.filter(
    (task) => task.status !== "completed" && Boolean(task.dueDate && task.dueDate < today),
  ).length;
  const previousOverdue = previousTasks.filter(
    (task) =>
      task.status !== "completed" &&
      Boolean(task.dueDate && task.dueDate < window.previous.to),
  ).length;
  const activePeople = related.people.filter((person) => person.status === "active");
  const absentNames = new Set(
    related.leaveRequests
      .filter(
        (leave) =>
          leave.status === "approved" &&
          leave.startDate <= today &&
          leave.endDate >= today,
      )
      .map((leave) => leave.employeeName),
  );
  const capacity = activePeople.filter((person) => !absentNames.has(person.displayName)).length;
  const latestPayroll = [...currentPayroll].sort((a, b) =>
    b.periodStart.localeCompare(a.periodStart),
  )[0];
  const previousLatestPayroll = [...previousPayroll].sort((a, b) =>
    b.periodStart.localeCompare(a.periodStart),
  )[0];
  const scenarioDates = [
    ...data.projects.map((project) => project.startDate),
    ...data.tasks.map((task) => task.createdAt),
    ...data.incidents.map((incident) => incident.createdAt),
    ...data.leaveRequests.map((leave) => leave.startDate),
    ...data.treasuryEntries.map((entry) => entry.entryDate),
    ...data.payrollRuns.map((run) => run.periodStart),
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.slice(0, 10))
    .sort();
  const visibleMonthStart =
    scenarioDates[0] && scenarioDates[0] > window.current.from
      ? scenarioDates[0]
      : window.current.from;
  const visibleMonths = monthKeys(visibleMonthStart, window.current.to);

  const byView: Record<AnalyticsView, AnalyticsKpi[]> = {
    executive: [
      kpi("projects_at_risk", "Proyectos en riesgo", risk, null, "count", "proyectos activos", "decrease"),
      kpi("overdue_work", "Trabajo vencido", currentOverdue, previousOverdue, "count", "tareas abiertas", "decrease"),
      kpi("sla_compliance", "Cumplimiento SLA", slaCompliance(currentIncidents, today), slaCompliance(previousIncidents, window.previous.to), "percentage", "objetivo 92 %", "increase", 92),
      kpi("cash_margin", "Margen operativo", currentFinance.margin, previousFinance.margin, "percentage", "objetivo 10–18 %", "increase", 12),
      kpi("available_capacity", "Capacidad disponible", capacity, null, "count", "personas", "neutral"),
      kpi("integration_success", "Éxito de integraciones", currentIntegrationSuccess ?? 0, previousIntegrationSuccess, "percentage", currentIntegrationSuccess === null ? "sin ejecuciones completadas" : "ejecuciones del periodo", "increase", 95, currentIntegrationSuccess !== null),
    ],
    work: [
      kpi("completed_tasks", "Tareas completadas", currentTasks.filter((task) => task.status === "completed").length, previousTasks.filter((task) => task.status === "completed").length, "count", "en el periodo", "increase"),
      kpi("blocked_tasks", "Trabajo bloqueado", currentTasks.filter((task) => task.status === "blocked").length, previousTasks.filter((task) => task.status === "blocked").length, "count", "requiere atención", "decrease"),
      kpi("overdue_work", "Trabajo vencido", currentOverdue, previousOverdue, "count", "fuera de fecha", "decrease"),
      kpi("projects_at_risk", "Proyectos en riesgo", risk, null, "count", "salud comprometida", "decrease"),
    ],
    people: [
      kpi("active_people", "Personas activas", activePeople.length, null, "count", "en la organización", "neutral"),
      kpi("available_capacity", "Capacidad disponible", capacity, null, "count", "sin ausencia actual", "neutral"),
      kpi("approved_leave", "Ausencias aprobadas", currentLeaves.length, previousLeaves.length, "count", "en el periodo", "neutral"),
      kpi("teams", "Equipos", new Set(activePeople.map((person) => person.team)).size, null, "count", "unidades operativas", "neutral"),
    ],
    service: [
      kpi("incident_backlog", "Incidencias pendientes", currentIncidents.filter((incident) => !["resolved", "closed"].includes(incident.status)).length, previousIncidents.filter((incident) => !["resolved", "closed"].includes(incident.status)).length, "count", "casos abiertos", "decrease"),
      kpi("sla_compliance", "Cumplimiento SLA", slaCompliance(currentIncidents, today), slaCompliance(previousIncidents, window.previous.to), "percentage", "objetivo 92 %", "increase", 92),
      kpi("critical_incidents", "Críticas", currentIncidents.filter((incident) => incident.priority === "critical").length, previousIncidents.filter((incident) => incident.priority === "critical").length, "count", "prioridad máxima", "decrease"),
      kpi("investigating_incidents", "En investigación", currentIncidents.filter((incident) => incident.status === "investigating").length, previousIncidents.filter((incident) => incident.status === "investigating").length, "count", "casos activos", "decrease"),
    ],
    finance: [
      kpi("cash_balance", "Saldo del periodo", currentFinance.balance, previousFinance.balance, "currency", "entradas menos salidas", "increase"),
      kpi("cash_margin", "Margen operativo", currentFinance.margin, previousFinance.margin, "percentage", "objetivo 10–18 %", "increase", 12),
      kpi("payroll_cost", "Coste empresa", latestPayroll?.employerCostTotalCents ?? 0, previousLatestPayroll?.employerCostTotalCents ?? 0, "currency", "último ciclo del periodo", "neutral"),
      kpi("integration_success", "Éxito de integraciones", currentIntegrationSuccess ?? 0, previousIntegrationSuccess, "percentage", currentIntegrationSuccess === null ? "sin ejecuciones completadas" : "ejecuciones del periodo", "increase", 95, currentIntegrationSuccess !== null),
    ],
  };
  const completedTasks = currentTasks.filter((task) => task.status === "completed");
  const bySeries: Record<AnalyticsView, AnalyticsSeries[]> = {
    executive: [
      countSeries(
        "completed_tasks_monthly",
        "Tareas completadas por mes",
        completedTasks,
        (task) => task.updatedAt.slice(0, 7),
        visibleMonths,
      ),
      countSeries(
        "incidents_monthly",
        "Incidencias registradas por mes",
        currentIncidents,
        (incident) => incident.createdAt.slice(0, 7),
        visibleMonths,
      ),
    ],
    work: [
      countSeries(
        "tasks_by_status",
        "Tareas por estado",
        currentTasks,
        (task) => task.status,
        filters.status
          ? [filters.status]
          : ["pending", "in_progress", "blocked", "in_review", "completed"],
      ),
      countSeries(
        "tasks_by_project",
        "Tareas por proyecto",
        currentTasks,
        (task) =>
          related.projects.find((project) => project.id === task.projectId)?.name ??
          "Sin proyecto",
        related.projects.map((project) => project.name),
      ),
    ],
    people: [
      countSeries(
        "leave_by_month",
        "Ausencias aprobadas por mes",
        currentLeaves,
        (leave) => leave.startDate.slice(0, 7),
        visibleMonths,
      ),
      countSeries(
        "people_by_team",
        "Personas activas por equipo",
        activePeople,
        (person) => person.team,
        [...new Set(related.people.map((person) => person.team))],
      ),
    ],
    service: [
      countSeries(
        "incidents_by_status",
        "Incidencias por estado",
        currentIncidents,
        (incident) => incident.status,
        filters.status
          ? [filters.status]
          : [
              "registered",
              "triaged",
              "assigned",
              "investigating",
              "resolved",
              "closed",
            ],
      ),
      countSeries(
        "incidents_by_service",
        "Incidencias por servicio",
        currentIncidents,
        (incident) => incident.affectedService ?? "Sin servicio",
        filters.service
          ? [filters.service]
          : [
              ...new Set(
                related.incidents.map(
                  (incident) => incident.affectedService ?? "Sin servicio",
                ),
              ),
            ],
      ),
    ],
    finance: [
      sumSeries(
        "cash_balance_monthly",
        "Saldo por mes",
        currentTreasury,
        (entry) => entry.entryDate.slice(0, 7),
        (entry) => entry.amountCents,
        visibleMonths,
      ),
      sumSeries(
        "payroll_cost_monthly",
        "Coste de nómina por mes",
        currentPayroll,
        (run) => run.periodStart.slice(0, 7),
        (run) => run.employerCostTotalCents ?? 0,
        visibleMonths,
      ),
    ],
  };
  const kpis = byView[view];
  const alerts: AnalyticsAlert[] = kpis.flatMap((item) => {
    const missesTarget =
      item.target !== null &&
      (item.favorableDirection === "increase"
        ? item.value < item.target
        : item.favorableDirection === "decrease"
          ? item.value > item.target
          : false);
    const requiresAttention =
      missesTarget ||
      (["overdue_work", "blocked_tasks", "critical_incidents"].includes(
        item.code,
      ) &&
        item.value > 0);
    return requiresAttention
      ? [
          {
            id: `alert-${view}-${item.code}`,
            severity: missesTarget ? ("warning" as const) : ("info" as const),
            title: item.label,
            value: item.value,
            unit: item.unit,
            context: item.context,
            targetModule:
              view === "service"
                ? "incidencias"
                : view === "finance"
                  ? "tesoreria"
                  : "tareas",
          },
        ]
      : [];
  });

  return {
    generatedAt: now.toISOString(),
    filters,
    window,
    kpis,
    series: bySeries[view],
    alerts,
  };
}
