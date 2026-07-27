"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo, useState } from "react";
import {
  buildAnalyticsSnapshot,
  type AnalyticsView,
} from "@/domain/analytics-engine";
import { controlCenterMetrics, type AnalyticsFilter, type AnalyticsKpi } from "@/domain/analytics";
import type { IntegrationRun, SavedAnalyticsView } from "@/domain/integrations";
import type { Incident } from "@/domain/incidents";
import type { PayrollRun } from "@/domain/payroll";
import type { Person } from "@/domain/people";
import type { Project } from "@/domain/projects";
import type { TaskItem } from "@/domain/tasks";
import type { TreasuryEntry } from "@/domain/treasury";
import type { LeaveRequest } from "@/domain/vacations";
import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/format";
import { isModuleId, type ModuleId } from "@/domain/modules";

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
  onSaveView?: (view: SavedAnalyticsView) => boolean | Promise<boolean>;
  onNavigate?: (module: ModuleId) => void;
};

const views: Array<[AnalyticsView, string]> = [
  ["executive", "Resumen"],
  ["work", "Proyectos y tareas"],
  ["people", "Equipo y disponibilidad"],
  ["service", "Incidencias y tiempos"],
  ["finance", "Finanzas e integraciones"],
];

function formatKpi(kpi: AnalyticsKpi) {
  if (kpi.unit === "currency") return formatCurrency(kpi.value);
  if (kpi.unit === "percentage") return formatPercent(kpi.value);
  if (kpi.unit === "days") return `${formatNumber(kpi.value, 1)} días`;
  return formatNumber(kpi.value);
}

function deltaState(kpi: AnalyticsKpi) {
  if (kpi.variation === null || kpi.favorableDirection === "neutral") return "neutral";
  const favorable =
    kpi.favorableDirection === "increase"
      ? kpi.variation >= 0
      : kpi.variation <= 0;
  return favorable ? "positive" : "negative";
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
  onNavigate,
}: Props) {
  const [activeView, setActiveView] = useState<AnalyticsView>("executive");
  const [filters, setFilters] = useState<AnalyticsFilter>({
    period: "12m",
    comparison: "previous_period",
    projectId: null,
    team: null,
    ownerId: null,
    status: null,
    service: null,
  });
  const [viewName, setViewName] = useState("");
  const data = useMemo(
    () => ({
      projects,
      tasks,
      incidents,
      people,
      leaveRequests,
      treasuryEntries,
      payrollRuns,
      integrationRuns,
    }),
    [
      incidents,
      integrationRuns,
      leaveRequests,
      payrollRuns,
      people,
      projects,
      tasks,
      treasuryEntries,
    ],
  );
  const snapshot = useMemo(
    () => buildAnalyticsSnapshot(data, filters, activeView),
    [activeView, data, filters],
  );
  const teams = [...new Set(people.map((person) => person.team))].sort();
  const services = [
    ...new Set(
      incidents
        .map((incident) => incident.affectedService)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const statusOptions =
    activeView === "service"
      ? [
          ["registered", "Registrada"],
          ["triaged", "Clasificada"],
          ["assigned", "Asignada"],
          ["investigating", "En investigación"],
          ["resolved", "Resuelta"],
          ["closed", "Cerrada"],
        ]
      : [
          ["pending", "Pendiente"],
          ["in_progress", "En curso"],
          ["blocked", "Bloqueada"],
          ["in_review", "En revisión"],
          ["completed", "Completada"],
        ];
  const showProject = ["executive", "work", "service"].includes(activeView);
  const showTeam = ["executive", "work", "people", "service"].includes(activeView);
  const showOwner = ["work", "service"].includes(activeView);
  const showStatus = ["work", "service"].includes(activeView);
  const showService = ["executive", "service"].includes(activeView);

  function updateFilter<K extends keyof AnalyticsFilter>(
    key: K,
    value: AnalyticsFilter[K],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <h1>Analítica</h1>
          <p className="lede">
            Consulta los principales indicadores y revisa el detalle de cada área.
          </p>
        </div>
        <span className="status-chip">Datos actualizados</span>
      </div>

      <nav className="analytics-view-tabs" aria-label="Vistas de Analítica">
        {views.map(([id, label]) => (
          <button
            className="analytics-view-tab"
            type="button"
            aria-current={activeView === id ? "page" : undefined}
            onClick={() => {
              setActiveView(id);
              setFilters((current) => ({ ...current, status: null }));
            }}
            key={id}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="analytics-toolbar" aria-label="Filtros de Analítica">
        <label>
          Periodo
          <select
            value={filters.period}
            onChange={(event) =>
              updateFilter("period", event.target.value as AnalyticsFilter["period"])
            }
          >
            <option value="30d">30 días</option>
            <option value="90d">90 días</option>
            <option value="6m">6 meses</option>
            <option value="12m">12 meses</option>
          </select>
        </label>
        {showProject ? (
          <label>
            Proyecto
            <select
              value={filters.projectId ?? "all"}
              onChange={(event) =>
                updateFilter("projectId", event.target.value === "all" ? null : event.target.value)
              }
            >
              <option value="all">Todos los proyectos</option>
              {projects.map((project) => (
                <option value={project.id} key={project.id}>{project.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        {showTeam ? (
          <label>
            Equipo
            <select
              value={filters.team ?? "all"}
              onChange={(event) =>
                updateFilter("team", event.target.value === "all" ? null : event.target.value)
              }
            >
              <option value="all">Todos los equipos</option>
              {teams.map((team) => <option value={team} key={team}>{team}</option>)}
            </select>
          </label>
        ) : null}
        {showOwner ? (
          <label>
            Responsable
            <select
              value={filters.ownerId ?? "all"}
              onChange={(event) =>
                updateFilter("ownerId", event.target.value === "all" ? null : event.target.value)
              }
            >
              <option value="all">Todas las personas</option>
              {people.map((person) => (
                <option value={person.id} key={person.id}>{person.displayName}</option>
              ))}
            </select>
          </label>
        ) : null}
        {showStatus ? (
          <label>
            Estado
            <select
              value={filters.status ?? "all"}
              onChange={(event) =>
                updateFilter("status", event.target.value === "all" ? null : event.target.value)
              }
            >
              <option value="all">Todos los estados</option>
              {statusOptions.map(([value, label]) => (
                <option value={value} key={value}>{label}</option>
              ))}
            </select>
          </label>
        ) : null}
        {showService ? (
          <label>
            Servicio
            <select
              value={filters.service ?? "all"}
              onChange={(event) =>
                updateFilter("service", event.target.value === "all" ? null : event.target.value)
              }
            >
              <option value="all">Todos los servicios</option>
              {services.map((service) => (
                <option value={service} key={service}>{service}</option>
              ))}
            </select>
          </label>
        ) : null}
        <span className="analytics-comparison">
          Del {formatDate(snapshot.window.current.from)} al{" "}
          {formatDate(snapshot.window.current.to)}
        </span>
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
                filters: Object.fromEntries(
                  Object.entries(filters).map(([key, value]) => [key, value]),
                ),
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
            <button className="button button-secondary" type="submit">Guardar vista</button>
          </form>
        ) : null}
      </section>

      {savedViews.length ? (
        <section className="saved-views" aria-label="Vistas guardadas">
          <strong>Vistas guardadas</strong>
          {savedViews.map((view) => (
            <button
              className="status-chip"
              type="button"
              key={view.id}
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  period: (view.filters.period as AnalyticsFilter["period"]) ?? current.period,
                  projectId: view.filters.projectId ?? null,
                  team: view.filters.team ?? null,
                  ownerId: view.filters.ownerId ?? null,
                  status: view.filters.status ?? null,
                  service: view.filters.service ?? null,
                }))
              }
            >
              {view.name}
            </button>
          ))}
        </section>
      ) : null}

      <section className="cards-grid analytics-kpis" aria-label="Indicadores">
        {snapshot.kpis.map((item, index) => (
          <article
            className={`card analytics-kpi-card ${index === 0 ? "analytics-kpi-card-featured" : ""}`}
            key={item.code}
          >
            <span>{item.label}</span>
            <strong className="metric-value">{formatKpi(item)}</strong>
            <small>{item.context}</small>
            <span className={`analytics-delta ${deltaState(item)}`}>
              {item.variation === null
                ? "Sin comparación"
                : `${item.variation > 0 ? "+" : ""}${formatPercent(item.variation)} respecto al periodo anterior`}
            </span>
          </article>
        ))}
      </section>

      <section className="analytics-grid">
        {snapshot.series.map((series, index) => (
          <article className="card analytics-chart-card" key={series.code}>
            <div>
              <p className="eyebrow">Evolución del periodo</p>
              <h2>{series.label}</h2>
            </div>
            <div className="chart-frame" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series.points}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" />
                  <YAxis
                    allowDecimals={series.unit !== "count"}
                    tickFormatter={(value) =>
                      series.unit === "currency"
                        ? formatNumber(Number(value) / 100)
                        : formatNumber(Number(value))
                    }
                  />
                  <Tooltip
                    formatter={(value) =>
                      series.unit === "currency"
                        ? formatCurrency(Number(value))
                        : formatNumber(Number(value))
                    }
                  />
                  <Bar
                    dataKey="value"
                    fill={index === 0 ? "#2563eb" : "#0f766e"}
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="analytics-table">
              <caption>Alternativa tabular: {series.label.toLocaleLowerCase("es")}</caption>
              <thead><tr><th>Periodo o categoría</th><th>Valor</th></tr></thead>
              <tbody>
                {series.points.map((point) => (
                  <tr key={point.period}>
                    <td>{point.period}</td>
                    <td>
                      {series.unit === "currency"
                        ? formatCurrency(point.value)
                        : formatNumber(point.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </article>
        ))}
      </section>

      {snapshot.alerts.length ? (
        <section className="card analytics-alerts" aria-label="Avisos del periodo">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h2>Avisos del periodo</h2>
          </div>
          <ul className="activity-list">
            {snapshot.alerts.map((alert) => (
              <li className="activity-item" key={alert.id}>
                <span>
                  <strong>{alert.title}</strong>
                  <span className="muted settings-list-copy">{alert.description}</span>
                </span>
                {onNavigate && isModuleId(alert.targetModule) ? (
                  <button
                    className="button button-quiet"
                    type="button"
                    onClick={() => onNavigate(alert.targetModule as ModuleId)}
                  >
                    Ver detalle
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <details className="card metric-definitions">
        <summary>Definiciones de métricas</summary>
        <dl>{controlCenterMetrics.map((metric) => <div key={metric.code}><dt>{metric.label}</dt><dd>{metric.formula}. Fuente: {metric.source}. Actualización: {metric.freshness}.</dd></div>)}</dl>
      </details>
    </main>
  );
}
