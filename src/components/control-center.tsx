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
import { IconAdjustmentsHorizontal, IconBulb, IconRefresh, IconX } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import {
  buildAnalyticsServiceDimensions,
  buildAnalyticsSnapshot,
  resolveAnalyticsServiceCode,
  type AnalyticsView,
} from "@/domain/analytics-engine";
import {
  buildAnalyticsInsights,
  controlCenterMetrics,
  type AnalyticsDrilldownState,
  type AnalyticsFilter,
  type AnalyticsKpi,
  type AnalyticsSelection,
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
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [drilldown, setDrilldown] = useState<AnalyticsDrilldownState | null>(null);
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
  const insights = useMemo(() => buildAnalyticsInsights(snapshot), [snapshot]);
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

  function resetFilters() {
    setFilters({ period: "all", comparison: "previous_period", projectId: null, team: null, ownerId: null, status: null, service: null });
    setDrilldown(null);
  }

  function clearFilter(key: keyof AnalyticsFilter) {
    setFilters((current) => ({ ...current, [key]: key === "period" ? "all" : key === "comparison" ? "previous_period" : null }));
  }

  function openSelection(selection: AnalyticsSelection, description: string) {
    setDrilldown({ selection, title: selection.label, description });
  }

  function selectSeriesPoint(seriesCode: string, value: string, label: string) {
    if (seriesCode === "people_by_team") updateFilter("team", value);
    else if (["tasks_by_status", "incidents_by_status"].includes(seriesCode)) updateFilter("status", value);
    else if (seriesCode === "tasks_by_project") updateFilter("projectId", projects.find((project) => project.name === value)?.id ?? null);
    else if (seriesCode === "incidents_by_service") updateFilter("service", services.find((service) => service.label === value)?.code ?? null);
    openSelection({ dimension: /^\d{4}-\d{2}$/.test(value) ? "period" : seriesCode === "people_by_team" ? "team" : seriesCode.includes("status") ? "status" : seriesCode.includes("service") ? "service" : seriesCode.includes("project") ? "project" : "period", value, label, sourceCode: seriesCode }, `Selección aplicada desde ${label.toLocaleLowerCase("es")}. Los indicadores y el detalle respetan los filtros activos.`);
  }

  const activeFilterChips = [
    filters.period !== "all" ? { key: "period", label: `Periodo: ${filters.period}` } : null,
    filters.projectId ? { key: "projectId", label: `Proyecto: ${projects.find((item) => item.id === filters.projectId)?.name ?? "seleccionado"}` } : null,
    filters.team ? { key: "team", label: `Equipo: ${filters.team}` } : null,
    filters.ownerId ? { key: "ownerId", label: `Responsable: ${people.find((item) => item.id === filters.ownerId)?.displayName ?? "seleccionado"}` } : null,
    filters.status ? { key: "status", label: `Estado: ${formatAnalyticsTableLabel(filters.status)}` } : null,
    filters.service ? { key: "service", label: `Servicio: ${services.find((item) => item.code === filters.service)?.label ?? "seleccionado"}` } : null,
  ].filter((item): item is { key: keyof AnalyticsFilter; label: string } => Boolean(item));

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Información para decidir</p>
          <h1>Analítica</h1>
          <p className="lede">
            Explora indicadores, compara periodos y llega al detalle sin perder el contexto.
          </p>
        </div>
        <div className="analytics-heading-actions"><span className="status-chip">{analyticsLoading ? "Actualizando datos" : "Datos actualizados"}</span><button className="button button-secondary" type="button" aria-expanded={filterPanelOpen} onClick={() => setFilterPanelOpen((current) => !current)}><IconAdjustmentsHorizontal size={18} />{filterPanelOpen ? "Ocultar filtros" : "Mostrar filtros"}</button></div>
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

      <div className="analytics-context-bar"><div className="analytics-filter-chips" aria-label="Filtros activos">{activeFilterChips.length ? activeFilterChips.map((chip) => <button type="button" className="analytics-filter-chip" key={chip.key} onClick={() => clearFilter(chip.key)}>{chip.label}<IconX size={14} aria-hidden="true" /></button>) : <span>Sin filtros adicionales</span>}</div>{activeFilterChips.length ? <button className="button button-quiet" type="button" onClick={resetFilters}><IconRefresh size={16} />Restablecer</button> : null}</div>

      {filterPanelOpen ? <section className="analytics-toolbar" aria-label="Filtros de Analítica">
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
      </section> : null}

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
          <button
            type="button"
            className={`card analytics-kpi-card ${index === 0 ? "analytics-kpi-card-featured" : ""}`}
            key={item.code}
            onClick={() => openSelection({ dimension: "metric", value: item.code, label: item.label, sourceCode: item.code }, `${item.context}. La variación y los avisos se calculan con el mismo periodo y los mismos filtros que el resto del panel.`)}
          >
            <span>{item.label}</span>
            <strong className="metric-value">{formatKpi(item)}</strong>
            <small>{item.context}</small>
            <span className={`analytics-delta ${deltaState(item)}`}>
              {item.variation === null
                ? "Sin comparación"
                : `${item.variation > 0 ? "+" : ""}${formatPercent(item.variation, 2)} respecto al periodo anterior`}
            </span>
            <span className="analytics-kpi-action">Explorar detalle</span>
          </button>
        ))}
      </section>

      <section className="analytics-insights" aria-label="Lecturas destacadas">
        <div className="analytics-section-heading"><div><p className="eyebrow">Lectura guiada</p><h2>Lo que merece atención</h2></div><span>Generado a partir de los filtros actuales</span></div>
        <div className="analytics-insight-grid">{insights.map((insight) => <article className={`analytics-insight analytics-insight-${insight.tone}`} key={insight.code}><IconBulb size={20} aria-hidden="true" /><span><strong>{insight.title}</strong><small>{insight.summary}</small></span>{insight.metricCode ? <button type="button" className="button button-quiet" onClick={() => { const metric = snapshot.kpis.find((item) => item.code === insight.metricCode); if (metric) openSelection({ dimension: "metric", value: metric.code, label: metric.label, sourceCode: metric.code }, metric.context); }}>Ver dato</button> : null}</article>)}</div>
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
            <div className="analytics-series-actions" aria-label={`Puntos disponibles ${index + 1}`}>{series.points.filter((point) => point.value !== 0).slice(-6).map((point) => <button type="button" className="status-chip" key={point.period} onClick={() => selectSeriesPoint(series.code, point.period, formatAnalyticsTableLabel(point.period))}>{formatAnalyticsTableLabel(point.period)}</button>)}</div>
          </article>
        ))}
      </section>

      {drilldown ? <section className="card analytics-drilldown" aria-live="polite"><div className="analytics-drilldown-heading"><div><p className="eyebrow">Detalle contextual</p><h2>{drilldown.title}</h2><p className="muted">{drilldown.description}</p></div><button className="icon-button" type="button" aria-label="Cerrar detalle analítico" onClick={() => setDrilldown(null)}><IconX size={18} /></button></div><dl className="analytics-drilldown-facts"><div><dt>Vista</dt><dd>{views.find(([id]) => id === activeView)?.[1]}</dd></div><div><dt>Periodo</dt><dd>{formatDate(snapshot.window.current.from)} – {formatDate(snapshot.window.current.to)}</dd></div><div><dt>Selección</dt><dd>{drilldown.selection.label}</dd></div><div><dt>Indicadores visibles</dt><dd>{snapshot.kpis.length}</dd></div></dl></section> : null}

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
