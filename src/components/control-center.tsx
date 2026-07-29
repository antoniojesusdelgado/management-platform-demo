"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useEffect, useMemo, useState } from "react";
import {
  buildAnalyticsServiceDimensions,
  buildAnalyticsSnapshot,
  resolveAnalyticsServiceCode,
  type AnalyticsView,
} from "@/domain/analytics-engine";
import {
  controlCenterMetrics,
  type AnalyticsFilter,
  type AnalyticsKpi,
  type AnalyticsServiceDimension,
  type AnalyticsSnapshot,
} from "@/domain/analytics";
import type {
  IntegrationConnector,
  IntegrationRun,
  SavedAnalyticsView,
} from "@/domain/integrations";
import type { Incident } from "@/domain/incidents";
import type { PayrollRun } from "@/domain/payroll";
import type { Person } from "@/domain/people";
import type { Project } from "@/domain/projects";
import type { TaskItem } from "@/domain/tasks";
import type { TreasuryEntry } from "@/domain/treasury";
import type { LeaveRequest } from "@/domain/vacations";
import {
  formatAnalyticsValue,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/format";
import {
  formatAnalyticsAxisLabel,
  formatAnalyticsTableLabel,
  getMonthlyTickGap,
} from "@/lib/analytics-labels";
import { isModuleId, type ModuleId } from "@/domain/modules";
import { useTheme } from "@/components/theme-provider";

type Props = {
  projects: Project[];
  tasks: TaskItem[];
  incidents: Incident[];
  people: Person[];
  leaveRequests: LeaveRequest[];
  treasuryEntries: TreasuryEntry[];
  payrollRuns?: PayrollRun[];
  integrationRuns?: IntegrationRun[];
  integrationConnectors?: IntegrationConnector[];
  serviceDimensions?: AnalyticsServiceDimension[];
  savedViews?: SavedAnalyticsView[];
  onLoadSnapshot?: (
    filters: AnalyticsFilter,
    view: AnalyticsView,
  ) => Promise<AnalyticsSnapshot | null>;
  onSaveView?: (view: SavedAnalyticsView) => boolean | Promise<boolean>;
  onNavigate?: (module: ModuleId) => void;
  referenceDate?: Date;
};

const views: Array<[AnalyticsView, string]> = [
  ["executive", "Resumen"],
  ["work", "Proyectos y tareas"],
  ["people", "Equipo y disponibilidad"],
  ["service", "Incidencias y tiempos"],
  ["finance", "Finanzas e integraciones"],
];

function formatKpi(kpi: AnalyticsKpi) {
  if (kpi.hasData === false) return "Sin datos";
  return formatAnalyticsValue(kpi.value, kpi.unit);
}

function deltaState(kpi: AnalyticsKpi) {
  if (kpi.variation === null || kpi.favorableDirection === "neutral") return "neutral";
  const favorable =
    kpi.favorableDirection === "increase"
      ? kpi.variation >= 0
      : kpi.variation <= 0;
  return favorable ? "positive" : "negative";
}

function isMonthlySeries(points: Array<{ period: string; value: number }>) {
  return points.every((point) => /^\d{4}-\d{2}$/.test(point.period));
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
  integrationConnectors = [],
  serviceDimensions,
  savedViews = [],
  onLoadSnapshot,
  onSaveView,
  onNavigate,
  referenceDate = new Date(),
}: Props) {
  const { reducedMotion } = useTheme();
  const [activeView, setActiveView] = useState<AnalyticsView>("executive");
  const [filters, setFilters] = useState<AnalyticsFilter>({
    period: "all",
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
      integrationConnectors,
    }),
    [
      incidents,
      integrationConnectors,
      integrationRuns,
      leaveRequests,
      payrollRuns,
      people,
      projects,
      tasks,
      treasuryEntries,
    ],
  );
  const localSnapshot = useMemo(
    () => buildAnalyticsSnapshot(data, filters, activeView, referenceDate),
    [activeView, data, filters, referenceDate],
  );
  const [remoteSnapshot, setRemoteSnapshot] =
    useState<AnalyticsSnapshot | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  useEffect(() => {
    if (!onLoadSnapshot) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setRemoteSnapshot(null);
      setAnalyticsLoading(true);
    });
    void onLoadSnapshot(filters, activeView).then((next) => {
      if (!active) return;
      setRemoteSnapshot(next);
      setAnalyticsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [activeView, filters, onLoadSnapshot]);
  const snapshot = remoteSnapshot ?? localSnapshot;
  const visibleMetricCodes = useMemo(
    () => new Set(snapshot.kpis.map((item) => item.code)),
    [snapshot.kpis],
  );
  const teams = [...new Set(people.map((person) => person.team))].sort();
  const services = useMemo(
    () => serviceDimensions ?? buildAnalyticsServiceDimensions(data),
    [data, serviceDimensions],
  );
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
  const showService = ["executive", "service", "finance"].includes(activeView);

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
        <span className="status-chip">
          {analyticsLoading ? "Actualizando datos" : "Datos actualizados"}
        </span>
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
            <option value="all">Todo el histórico</option>
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
                <option value={service.code} key={service.code}>
                  {service.label}
                </option>
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
                  service:
                    services.find(
                      (service) => service.code === view.filters.service,
                    )?.code ??
                    resolveAnalyticsServiceCode(view.filters.service, data),
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
                : `${item.variation > 0 ? "+" : ""}${formatPercent(item.variation, 2)} respecto al periodo anterior`}
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
            <div
              className={`chart-frame ${
                isMonthlySeries(series.points)
                ? "chart-frame-timeline"
                  : "chart-frame-categories"
              }`}
              style={
                isMonthlySeries(series.points)
                  ? undefined
                  : { height: `${Math.max(288, series.points.length * 46)}px` }
              }
              aria-hidden="true"
            >
              <ResponsiveContainer width="100%" height="100%">
                {isMonthlySeries(series.points) ? (
                  <LineChart
                    data={series.points}
                    margin={{ top: 12, right: 18, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="period"
                      interval="preserveStartEnd"
                      minTickGap={getMonthlyTickGap(series.points.length)}
                      tickFormatter={formatAnalyticsAxisLabel}
                    />
                    <YAxis
                      allowDecimals={series.unit !== "count"}
                      tickFormatter={(value) =>
                        series.unit === "currency"
                          ? formatNumber(Number(value) / 100)
                          : formatNumber(Number(value))
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        borderRadius: "10px",
                        color: "var(--text)",
                      }}
                      labelStyle={{ color: "var(--text)" }}
                      labelFormatter={(value) => formatAnalyticsTableLabel(String(value))}
                      formatter={(value) =>
                        formatAnalyticsValue(Number(value), series.unit)
                      }
                    />
                    <Line
                      dataKey="value"
                      type="monotone"
                      stroke={
                        index === 0
                          ? "var(--chart-primary)"
                          : "var(--chart-secondary)"
                      }
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                      animationDuration={180}
                      isAnimationActive={!reducedMotion}
                    />
                  </LineChart>
                ) : (
                  <BarChart
                    data={series.points}
                    layout="vertical"
                    margin={{ top: 8, right: 20, bottom: 8, left: 8 }}
                  >
                    <CartesianGrid
                      stroke="var(--chart-grid)"
                      strokeDasharray="3 3"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      allowDecimals={series.unit !== "count"}
                      tickFormatter={(value) =>
                        series.unit === "currency"
                          ? formatNumber(Number(value) / 100)
                          : formatNumber(Number(value))
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="period"
                      width={190}
                      tick={{ fontSize: 11 }}
                      tickFormatter={formatAnalyticsAxisLabel}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        borderRadius: "10px",
                        color: "var(--text)",
                      }}
                      labelStyle={{ color: "var(--text)" }}
                      labelFormatter={(value) => formatAnalyticsTableLabel(String(value))}
                      formatter={(value) =>
                        formatAnalyticsValue(Number(value), series.unit)
                      }
                    />
                    <Bar
                      dataKey="value"
                      fill={
                        index === 0
                          ? "var(--chart-primary)"
                          : "var(--chart-secondary)"
                      }
                      radius={[0, 6, 6, 0]}
                      animationDuration={180}
                      isAnimationActive={!reducedMotion}
                    />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
            <table className="analytics-table">
              <caption>Alternativa tabular: {series.label.toLocaleLowerCase("es")}</caption>
              <thead><tr><th>Periodo o categoría</th><th>Valor</th></tr></thead>
              <tbody>
                {series.points.map((point) => (
                  <tr key={point.period}>
                    <td>{formatAnalyticsTableLabel(point.period)}</td>
                    <td>
                      {formatAnalyticsValue(point.value, series.unit)}
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
                  <span className="muted settings-list-copy">
                    {alert.context}: {formatAnalyticsValue(alert.value, alert.unit)}
                  </span>
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
        <dl>
          {controlCenterMetrics
            .filter((metric) => visibleMetricCodes.has(metric.code))
            .map((metric) => (
              <div key={metric.code}>
                <dt>{metric.label}</dt>
                <dd>
                  {metric.description} {metric.interpretation} Fuente:{" "}
                  {metric.sourceLabel}. {metric.updateFrequency}.
                </dd>
              </div>
            ))}
        </dl>
      </details>
    </main>
  );
}
