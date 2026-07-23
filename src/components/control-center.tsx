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
import type { SavedAnalyticsView } from "@/domain/integrations";
import type { Incident } from "@/domain/incidents";
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
  savedViews = [],
  onSaveView,
}: Props) {
  const [projectId, setProjectId] = useState("all");
  const [viewName, setViewName] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const filteredTasks = tasks.filter(
    (task) => projectId === "all" || task.projectId === projectId,
  );
  const filteredIncidents = incidents.filter(
    (incident) => projectId === "all" || incident.projectId === projectId,
  );
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
      people.filter((person) => person.status === "active").length -
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
  };
  const statusData = useMemo(
    () =>
      [
        ["Pendiente", "pending"],
        ["En curso", "in_progress"],
        ["Bloqueada", "blocked"],
        ["Revisión", "in_review"],
        ["Completada", "completed"],
      ].map(([label, status]) => ({
        label,
        tareas: filteredTasks.filter((task) => task.status === status).length,
      })),
    [filteredTasks],
  );
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
          <p className="eyebrow">Business Intelligence · operación</p>
          <h1>Centro de control</h1>
          <p className="lede">
            Señales accionables, definiciones visibles y drill-down sobre datos
            exclusivamente sintéticos.
          </p>
        </div>
        <span className="status-chip">Actualizado ahora</span>
      </div>

      <section className="analytics-toolbar" aria-label="Filtros analíticos">
        <label>
          Proyecto
          <select value={projectId} onChange={(event) => setProjectId(event.target.value)}>
            <option value="all">Todo el portfolio</option>
            {projects.map((project) => (
              <option value={project.id} key={project.id}>{project.name}</option>
            ))}
          </select>
        </label>
        <span>Periodo: últimos 12 meses</span>
        <span>Comparación: periodo anterior</span>
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
                moduleId: "centro-control",
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
                placeholder="Mi portfolio"
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
        <article className="card"><span>Proyectos en riesgo</span><strong className="metric-value">{metrics.risk}</strong><small>Activos · salud distinta de en plazo</small></article>
        <article className="card"><span>Trabajo vencido</span><strong className="metric-value">{metrics.overdue}</strong><small>Tareas abiertas · fecha anterior a hoy</small></article>
        <article className="card"><span>Cumplimiento SLA</span><strong className="metric-value">{metrics.sla}%</strong><small>Resueltas o dentro de plazo</small></article>
        <article className="card"><span>Capacidad disponible</span><strong className="metric-value">{metrics.capacity}</strong><small>Personas activas sin ausencia actual</small></article>
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
            <caption>Alternativa tabular: tesorería mensual en euros sintéticos</caption>
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
