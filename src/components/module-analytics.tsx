"use client";

import type { ChangelogEntry } from "@/domain/changelog";
import type { Incident } from "@/domain/incidents";
import type { ModuleId } from "@/domain/modules";
import type { PayrollRun } from "@/domain/payroll";
import type { Person } from "@/domain/people";
import type { Project } from "@/domain/projects";
import type { TaskItem } from "@/domain/tasks";
import type { TreasuryEntry } from "@/domain/treasury";
import type { LeaveRequest } from "@/domain/vacations";

type Metric = {
  label: string;
  value: string | number;
  definition: string;
};

type Props = {
  moduleId: ModuleId;
  projects: Project[];
  tasks: TaskItem[];
  incidents: Incident[];
  people: Person[];
  leaveRequests: LeaveRequest[];
  treasuryEntries: TreasuryEntry[];
  payrollRuns: PayrollRun[];
  changelogEntries: ChangelogEntry[];
};

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function metricsFor({
  moduleId,
  projects,
  tasks,
  incidents,
  people,
  leaveRequests,
  treasuryEntries,
  payrollRuns,
  changelogEntries,
}: Props): Metric[] {
  const today = new Date().toISOString().slice(0, 10);
  if (moduleId === "proyectos") {
    return [
      { label: "Activos", value: projects.filter(({ status }) => status === "active").length, definition: "Proyectos en ejecución" },
      { label: "En riesgo", value: projects.filter(({ health }) => health !== "on_track").length, definition: "Salud at_risk u off_track" },
      { label: "Trabajo abierto", value: tasks.filter(({ status }) => status !== "completed").length, definition: "Tareas sin completar" },
      { label: "Incidencias abiertas", value: incidents.filter(({ status }) => !["resolved", "closed"].includes(status)).length, definition: "Incidencias no resueltas" },
    ];
  }
  if (moduleId === "tareas") {
    return [
      { label: "Throughput", value: tasks.filter(({ status }) => status === "completed").length, definition: "Tareas completadas en el escenario" },
      { label: "WIP", value: tasks.filter(({ status }) => ["in_progress", "blocked", "in_review"].includes(status)).length, definition: "Trabajo iniciado no completado" },
      { label: "Bloqueadas", value: tasks.filter(({ status }) => status === "blocked").length, definition: "Tareas en estado blocked" },
      { label: "Vencidas", value: tasks.filter((task) => task.status !== "completed" && task.dueDate !== null && task.dueDate < today).length, definition: "Abiertas con fecha anterior a hoy" },
    ];
  }
  if (moduleId === "vacaciones") {
    return [
      { label: "Días aprobados", value: leaveRequests.filter(({ status }) => status === "approved").reduce((sum, leave) => sum + leave.businessDays, 0), definition: "Suma de días laborables aprobados" },
      { label: "Pendientes", value: leaveRequests.filter(({ status }) => status === "submitted").length, definition: "Solicitudes esperando decisión" },
      { label: "Personas ausentes", value: new Set(leaveRequests.filter((leave) => leave.status === "approved" && leave.startDate <= today && leave.endDate >= today).map(({ employeeName }) => employeeName)).size, definition: "Ausencias aprobadas activas hoy" },
      { label: "Cobertura", value: `${Math.max(0, people.filter(({ status }) => status === "active").length - leaveRequests.filter((leave) => leave.status === "approved" && leave.startDate <= today && leave.endDate >= today).length)}`, definition: "Personas activas disponibles hoy" },
    ];
  }
  if (moduleId === "incidencias") {
    const open = incidents.filter(({ status }) => !["resolved", "closed"].includes(status));
    return [
      { label: "Backlog", value: open.length, definition: "Incidencias aún abiertas" },
      { label: "Fuera de SLA", value: open.filter(({ slaDueAt }) => slaDueAt < new Date().toISOString()).length, definition: "Abiertas con vencimiento SLA superado" },
      { label: "Críticas", value: open.filter(({ priority }) => priority === "critical").length, definition: "Backlog con prioridad critical" },
      { label: "Resueltas", value: incidents.filter(({ status }) => ["resolved", "closed"].includes(status)).length, definition: "Incidencias resueltas o cerradas" },
    ];
  }
  if (moduleId === "tesoreria") {
    const inflow = treasuryEntries.filter(({ amountCents }) => amountCents > 0).reduce((sum, item) => sum + item.amountCents, 0);
    const outflow = treasuryEntries.filter(({ amountCents }) => amountCents < 0).reduce((sum, item) => sum + Math.abs(item.amountCents), 0);
    return [
      { label: "Entradas", value: formatCurrency(inflow), definition: "Importes sintéticos positivos agregados" },
      { label: "Salidas", value: formatCurrency(outflow), definition: "Importes sintéticos negativos agregados" },
      { label: "Saldo", value: formatCurrency(inflow - outflow), definition: "Entradas menos salidas" },
      { label: "Conciliadas", value: treasuryEntries.filter(({ status }) => ["reconciled", "validated", "closed"].includes(status)).length, definition: "Movimientos que superaron conciliación" },
    ];
  }
  if (moduleId === "nominas") {
    const latest = [...payrollRuns].sort((a, b) => b.periodEnd.localeCompare(a.periodEnd))[0];
    return [
      { label: "Ciclos", value: payrollRuns.length, definition: "Periodos agregados sintéticos" },
      { label: "Personas", value: latest?.peopleCount ?? 0, definition: "Volumen agregado del último ciclo" },
      { label: "Total neto", value: formatCurrency(latest?.netTotalCents ?? 0), definition: "Importe agregado del último ciclo" },
      { label: "En revisión", value: payrollRuns.filter(({ status }) => ["validating", "calculated", "reviewed"].includes(status)).length, definition: "Ciclos dentro del control" },
    ];
  }
  if (moduleId === "personal") {
    return [
      { label: "Headcount", value: people.filter(({ status }) => status === "active").length, definition: "Personas sintéticas activas" },
      { label: "Equipos", value: new Set(people.map(({ team }) => team)).size, definition: "Equipos representados" },
      { label: "Ausencias hoy", value: leaveRequests.filter((leave) => leave.status === "approved" && leave.startDate <= today && leave.endDate >= today).length, definition: "Ausencias aprobadas activas" },
      { label: "Disponibilidad", value: people.filter(({ status }) => status === "active").length - leaveRequests.filter((leave) => leave.status === "approved" && leave.startDate <= today && leave.endDate >= today).length, definition: "Personas activas menos ausencias" },
    ];
  }
  if (moduleId === "novedades") {
    return [
      { label: "Publicadas", value: changelogEntries.filter(({ status }) => status === "published").length, definition: "Entradas visibles publicadas" },
      { label: "En revisión", value: changelogEntries.filter(({ status }) => status === "in_review").length, definition: "Entradas pendientes de revisión" },
      { label: "Borradores", value: changelogEntries.filter(({ status }) => status === "draft").length, definition: "Entradas aún no enviadas" },
      { label: "Cadencia", value: `${changelogEntries.filter(({ status }) => status === "published").length}/escenario`, definition: "Publicaciones del escenario sintético" },
    ];
  }
  return [];
}

export function ModuleAnalytics(props: Props) {
  const metrics = metricsFor(props);
  if (!metrics.length) return null;

  return (
    <section className="section-block module-analytics" aria-labelledby={`${props.moduleId}-analytics-title`}>
      <div className="section-header">
        <div>
          <p className="eyebrow">Analítica · tiempo de consulta</p>
          <h2 id={`${props.moduleId}-analytics-title`}>Centro de control del módulo</h2>
          <p className="muted">Indicadores calculados sobre el escenario sintético y sus filtros operativos.</p>
        </div>
        <span className="status-chip">Datos frescos</span>
      </div>
      <div className="cards-grid">
        {metrics.map((metric) => (
          <article className="card" key={metric.label}>
            <span>{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
            <small>{metric.definition}</small>
          </article>
        ))}
      </div>
    </section>
  );
}
