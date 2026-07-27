"use client";

import {
  IconAlertTriangle,
  IconArrowsExchange,
  IconCheck,
  IconClock,
  IconPlayerPlay,
} from "@tabler/icons-react";
import type {
  DataQualityIssue,
  IntegrationConnector,
  IntegrationKind,
  IntegrationRun,
} from "@/domain/integrations";
import { EmptyState } from "@/components/empty-state";

type Props = {
  connectors: IntegrationConnector[];
  runs: IntegrationRun[];
  issues: DataQualityIssue[];
  kind?: IntegrationKind;
  pending?: boolean;
  canManage?: boolean;
  onSimulate: (connectorId: string) => boolean | Promise<boolean>;
};

const kindLabels: Record<IntegrationKind, string> = {
  financial: "Tesorería",
  payroll: "Nóminas agregadas",
  people: "Maestro de personal",
};

const connectorLabels: Record<string, string> = {
  financial_source_a: "Fuente financiera A",
  financial_source_b: "Fuente financiera B",
  payroll_master: "Maestro de nóminas",
  people_master: "Maestro de personal",
};

export function IntegrationsCenter({
  connectors,
  runs,
  issues,
  kind,
  pending = false,
  canManage = true,
  onSimulate,
}: Props) {
  const visibleConnectors = kind
    ? connectors.filter((connector) => connector.kind === kind)
    : connectors;
  const connectorIds = new Set(visibleConnectors.map(({ id }) => id));
  const visibleRuns = runs
    .filter((run) => connectorIds.has(run.connectorId))
    .slice(0, 12);
  const openIssues = issues.filter(
    (issue) =>
      issue.resolvedAt === null &&
      visibleRuns.some((run) => run.id === issue.runId),
  );
  const successful = visibleRuns.filter(
    (run) => run.status === "succeeded",
  ).length;
  const processed = visibleRuns.reduce(
    (total, run) => total + run.processedCount,
    0,
  );

  return (
    <section className="section-block integration-center" aria-labelledby="integrations-title">
      <div className="section-header">
        <div>
          <p className="eyebrow">Automatización neutral · 02:15 UTC</p>
          <h2 id="integrations-title">
            {kind ? `Sincronización de ${kindLabels[kind]}` : "Integraciones"}
          </h2>
          <p className="muted">
            Consulta el estado de las sincronizaciones, los registros procesados
            y las incidencias que requieren revisión.
          </p>
        </div>
        <span className="status-chip">
          <IconClock aria-hidden="true" size={16} />
          Programación preparada
        </span>
      </div>

      <div className="cards-grid integration-metrics">
        <article className="card">
          <span>Conectores activos</span>
          <strong className="metric-value">
            {visibleConnectors.filter((connector) => connector.enabled).length}
          </strong>
        </article>
        <article className="card">
          <span>Ejecuciones correctas</span>
          <strong className="metric-value">{successful}</strong>
        </article>
        <article className="card">
          <span>Registros procesados</span>
          <strong className="metric-value">{processed}</strong>
        </article>
        <article className="card">
          <span>Excepciones abiertas</span>
          <strong className="metric-value">{openIssues.length}</strong>
        </article>
      </div>

      <div className="integration-connectors">
        {visibleConnectors.map((connector) => {
          const lastRun = visibleRuns.find(
            (run) => run.connectorId === connector.id,
          );
          return (
            <article className="card integration-connector" key={connector.id}>
              <span className="attention-icon cyan">
                <IconArrowsExchange aria-hidden="true" size={20} />
              </span>
              <div>
                <strong>{connectorLabels[connector.code] ?? connector.name}</strong>
                <p className="muted">
                  {kindLabels[connector.kind]} · {connector.scheduleCron}
                </p>
                {lastRun ? (
                  <p className="integration-run-summary">
                    {lastRun.status === "succeeded" ? (
                      <IconCheck aria-hidden="true" size={16} />
                    ) : (
                      <IconAlertTriangle aria-hidden="true" size={16} />
                    )}
                    {lastRun.importedCount} importados ·{" "}
                    {lastRun.duplicateCount} duplicados · {lastRun.errorCount}{" "}
                    excepciones
                  </p>
                ) : (
                  <p className="muted">Sin ejecuciones en esta sesión.</p>
                )}
              </div>
              {canManage ? (
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={pending || !connector.enabled}
                  onClick={() => void onSimulate(connector.id)}
                >
                  <IconPlayerPlay aria-hidden="true" size={17} />
                  Simular ahora
                </button>
              ) : null}
            </article>
          );
        })}
      </div>
      {!visibleConnectors.length ? (
        <EmptyState
          kind="integrations"
          title="No hay conectores configurados"
          description="Activa una fuente desde Configuración para probar la sincronización."
        />
      ) : null}

      {openIssues.length ? (
        <div className="inline-alert" role="status">
          <strong>Revisión de calidad necesaria</strong>
          <span>{openIssues[0].safeMessage}</span>
        </div>
      ) : null}
    </section>
  );
}
