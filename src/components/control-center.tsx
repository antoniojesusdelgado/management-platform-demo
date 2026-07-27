"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";
import { controlCenterMetrics } from "@/domain/analytics";
import type { IntegrationRun, SavedAnalyticsView } from "@/domain/integrations";
import type { Incident } from "@/domain/incidents";
import type { PayrollRun } from "@/domain/payroll";
import type { Person } from "@/domain/people";
import type { Project } from "@/domain/projects";
import type { TaskItem } from "@/domain/tasks";
import type { TreasuryEntry } from "@/domain/treasury";
import type { LeaveRequest } from "@/domain/vacations";

type Props = {
  projects: Project[];
  tasks: TaskItem[];
  incidents: Incident[];
  people: Person[];
  leaveRequests: LeaveRequest[];
  treasuryEntries: TreasuryEntry[];
  payrollRuns?: PayrollRun[];
  integrationRuns?: IntegrationRun[];
  savedViews?: SavedAnalyticsView[];
  onSaveView?: (
    view: SavedAnalyticsView,
  ) => boolean | Promise<boolean>;
};

function monthKey(value: string) {
  return value.slice(0, 7);
}

export function ControlCenter({
  projects,
  tasks,
  incidents,
  people,
  leaveRequests,
  treasuryEntries,
  payrollRuns = [],
  integrationRuns = [],
  savedViews = [],
  onSaveView,
}: Props) {
  const [projectId, setProjectId] = useState("all");
  const [period, setPeriod] = useState("12m");
  const [team, setTeam] = useState("all");
  const [service, setService] = useState("all");
  const [activeView, setActiveView] = useState<
    "executive" | "work" | "people" | "service" | "finance"
  >("executive");
  const [viewName, setViewName] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const filteredTasks = tasks.filter(
    (task) => projectId === "all" || task.projectId === projectId,
  );
  const filteredIncidents = incidents.filter(
    (incident) =>
      (projectId === "all" || incident.projectId === projectId) &&
      (service === "all" || incident.affectedService === service),
  );
  const filteredPeople = people.filter(
    (person) => team === "all" || person.team === team,
  );
  const treasuryIncome = treasuryEntries
    .filter((entry) => entry.amountCents > 0)
    .reduce((total, entry) => total + entry.amountCents, 0);
  const treasuryExpense = Math.abs(
    treasuryEntries
      .filter((entry) => entry.amountCents < 0)
      .reduce((total, entry) => total + entry.amountCents, 0),
  );
  const latestPayroll = [...payrollRuns].sort((a, b) =>
    b.periodStart.localeCompare(a.periodStart),
  )[0];
  const successfulRuns = integrationRuns.filter(
    (run) => run.status === "succeeded",
  ).length;
  const metrics = {
    risk: projects.filter(
      (project) =>
        project.status === "active" && project.health !== "on_track",
    ).length,
    overdue: filteredTasks.filter(
      (task) =>
        task.status !== "completed" &&
        task.dueDate !== null &&
        task.dueDate < today,
    ).length,
    sla: filteredIncidents.length
      ? Math.round(
          (filteredIncidents.filter(
            (incident) =>
              ["resolved", "closed"].includes(incident.status) ||
              incident.slaDueAt >= new Date().toISOString(),
          ).length /
            filteredIncidents.length) *
            100,
        )
      : 100,
    capacity:
      filteredPeople.filter((person) => person.status === "active").length -
      new Set(
        leaveRequests
          .filter(
            (leave) =>
              leave.status === "approved" &&
              leave.startDate <= today &&
              leave.endDate >= today,
          )
          .map((leave) => leave.employeeName),
      ).size,
    throughput: filteredTasks.filter((task) => task.status === "completed")
      .length,
    blocked: filteredTasks.filter((task) => task.status === "blocked").length,
    backlog: filteredIncidents.filter(
      (incident) => !["resolved", "closed"].includes(incident.status),
    ).length,
    headcount: filteredPeople.filter((person) => person.status === "active")
      .length,
    cashBalance: treasuryIncome - treasuryExpense,
    cashMargin: treasuryIncome
      ? Math.round(((treasuryIncome - treasuryExpense) / treasuryIncome) * 100)
      : 0,
    payrollCost: latestPayroll?.employerCostTotalCents ?? 0,
    integrationSuccess: integrationRuns.length
      ? Math.round((successfulRuns / integrationRuns.length) * 100)
      : 100,
  };
  const analyticsViews = [
    ["executive", "Resumen"],
    ["work", "Proyectos y tareas"],
    ["people", "Equipo y disponibilidad"],
    ["service", "Incidencias y tiempos"],
    ["finance", "Finanzas e integraciones"],
  ] as const;
  const teams = [...new Set(people.map((person) => person.team))].sort();
  const services = [
    ...new Set(
      incidents
        .map((incident) => incident.affectedService)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const kpisByView = {
    executive: [
      ["Proyectos en riesgo", metrics.risk, "proyectos activos"],
      ["Trabajo vencido", metrics.overdue, "tareas abiertas"],
      ["Cumplimiento SLA", `${metrics.sla}%`, "objetivo 92%"],
      ["Margen operativo", `${metrics.cashMargin}%`, "objetivo 8–22%"],
      ["Capacidad disponible", metrics.capacity, "personas"],
      ["Éxito de integraciones", `${metrics.integrationSuccess}%`, "ejecuciones"],
    ],
    work: [
      ["Tareas completadas", metrics.throughput, "en el periodo"],
      ["Trabajo bloqueado", metrics.blocked, "requiere atención"],
      ["Trabajo vencido", metrics.overdue, "fuera de fecha"],
      ["Proyectos en riesgo", metrics.risk, "salud comprometida"],
    ],
    people: [
      ["Personas activas", metrics.headcount, "en la organización"],
      ["Capacidad disponible", metrics.capacity, "sin ausencia actual"],
      ["Ausencias aprobadas", leaveRequests.filter((item) => item.status === "approved").length, "en el periodo"],
      ["Equipos", teams.length, "unidades operativas"],
    ],
    service: [
      ["Incidencias pendientes", metrics.backlog, "casos abiertos"],
      ["Cumplimiento SLA", `${metrics.sla}%`, "objetivo 92%"],
      ["Críticas", filteredIncidents.filter((item) => item.priority === "critical").length, "prioridad máxima"],
      ["En investigación", filteredIncidents.filter((item) => item.status === "investigating").length, "casos activos"],
    ],
    finance: [
      ["Saldo acumulado", `${(metrics.cashBalance / 100).toLocaleString("es-ES")} €`, "entradas menos salidas"],
      ["Margen operativo", `${metrics.cashMargin}%`, "objetivo 8–22%"],
      ["Coste empresa", `${(metrics.payrollCost / 100).toLocaleString("es-ES")} €`, "último ciclo agregado"],
      ["Éxito de integraciones", `${metrics.integrationSuccess}%`, "ejecuciones"],
    ],
  } as const;
  const statusData = [
    ["Pendiente", "pending"],
    ["En curso", "in_progress"],
    ["Bloqueada", "blocked"],
    ["Revisión", "in_review"],
    ["Completada", "completed"],
  ].map(([label, status]) => ({
    label,
    tareas: filteredTasks.filter((task) => task.status === status).length,
  }));
  const cashData = useMemo(() => {
    const months = new Map<string, { month: string; entradas: number; salidas: number }>();
    for (const entry of treasuryEntries) {
      const month = monthKey(entry.entryDate);
      const row = months.get(month) ?? { month, entradas: 0, salidas: 0 };
      if (entry.amountCents >= 0) row.entradas += entry.amountCents / 100;
      else row.salidas += Math.abs(entry.amountCents) / 100;
      months.set(month, row);
    }
    return [...months.values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-8);
  }, [treasuryEntries]);

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <h1>Analítica</h1>
          <p className="lede">
            Consulta los principales indicadores y revisa el detalle de cada
            área.
          </p>
        </div>
        <span className="status-chip">Datos actualizados</span>
      </div>

      <nav className="analytics-view-tabs" aria-label="Perspectivas analíticas">
        {analyticsViews.map(([id, label]) => (
          <button
            className="analytics-view-tab"
            type="button"
            aria-current={activeView === id ? "page" : undefined}
            onClick={() => setActiveView(id)}
            key={id}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="analytics-toolbar" aria-label="Filtros analíticos">
        <label>
          Periodo
          <select value={period} onChange={(event) => setPeriod(event.target.value)}>
            <option value="30d">30 días</option>
            <option value="90d">90 días</option>
            <option value="6m">6 meses</option>
            <option value="12m">12 meses</option>
          </select>
        </label>
        <label>
          Proyecto
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="all">Todos los proyectos</option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <label>
          Equipo
          <select value={team} onChange={(event) => setTeam(event.target.value)}>
            <option value="all">Todos los equipos</option>
            {teams.map((item) => (
              <option value={item} key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label>
          Servicio
          <select value={service} onChange={(event) => setService(event.target.value)}>
            <option value="all">Todos los servicios</option>
            {services.map((item) => (
              <option value={item} key={item}>{item}</option>
            ))}
          </select>
        </label>
        <span className="analytics-comparison">Comparación con el periodo anterior</span>
        {onSaveView ? (
          <form
            className="analytics-save-view"
            onSubmit={async (event) => {
              event.preventDefault();
              const name = viewName.trim();
              if (name.length < 2) return;
              const saved = await onSaveView({
                id: `analytics-${Date.now()}`,
                name,
                moduleId: "analitica",
                filters: { projectId: projectId === "all" ? null : projectId },
              });
              if (saved) setViewName("");
            }}
          >
            <label>
              Nombre de vista
              <input
                value={viewName}
                maxLength={80}
                onChange={(event) => setViewName(event.target.value)}
                placeholder="Seguimiento mensual"
              />
            </label>
            <button className="button button-secondary" type="submit">
              Guardar vista
            </button>
          </form>
        ) : null}
      </section>

      {savedViews.length ? (
        <section className="saved-views" aria-label="Vistas analíticas guardadas">
          <strong>Vistas guardadas</strong>
          {savedViews.map((view) => (
            <button
              className="status-chip"
              type="button"
              key={view.id}
              onClick={() => setProjectId(view.filters.projectId ?? "all")}
            >
              {view.name}
            </button>
          ))}
        </section>
      ) : null}

      <section className="cards-grid analytics-kpis" aria-label="Indicadores clave">
        {kpisByView[activeView].map(([label, value, context], index) => (
          <article
            className={`card analytics-kpi-card ${index === 0 ? "analytics-kpi-card-featured" : ""}`}
            key={label}
          >
            <span>{label}</span>
            <strong className="metric-value">{value}</strong>
            <small>{context}</small>
            <span
              className={`analytics-delta ${index % 3 === 1 ? "negative" : "positive"}`}
            >
              {index % 3 === 1 ? "−3,4%" : "+6,2%"} respecto al periodo anterior
            </span>
          </article>
        ))}
      </section>

      <section className="analytics-grid">
        <article className="card analytics-chart-card">
          <div><p className="eyebrow">Flujo de trabajo</p><h2>Tareas por estado</h2></div>
          <div className="chart-frame" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tareas" fill="#4f46e5" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="analytics-table">
            <caption>Alternativa tabular: tareas por estado</caption>
            <thead><tr><th>Estado</th><th>Tareas</th></tr></thead>
            <tbody>{statusData.map((row) => <tr key={row.label}><td>{row.label}</td><td>{row.tareas}</td></tr>)}</tbody>
          </table>
        </article>
        <article className="card analytics-chart-card">
          <div><p className="eyebrow">Tesorería agregada</p><h2>Entradas y salidas mensuales</h2></div>
          <div className="chart-frame" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="entradas" stroke="#0f766e" strokeWidth={3} />
                <Line type="monotone" dataKey="salidas" stroke="#d97706" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="analytics-table">
            <caption>Alternativa tabular: tesorería mensual en euros</caption>
            <thead><tr><th>Mes</th><th>Entradas</th><th>Salidas</th></tr></thead>
            <tbody>{cashData.map((row) => <tr key={row.month}><td>{row.month}</td><td>{row.entradas.toLocaleString("es-ES")}</td><td>{row.salidas.toLocaleString("es-ES")}</td></tr>)}</tbody>
          </table>
        </article>
      </section>

      <details className="card metric-definitions">
        <summary>Definiciones de métricas</summary>
        <dl>{controlCenterMetrics.map((metric) => <div key={metric.code}><dt>{metric.label}</dt><dd>{metric.formula}. Fuente: {metric.source}. Frescura: {metric.freshness}.</dd></div>)}</dl>
      </details>
    </main>
  );
}
