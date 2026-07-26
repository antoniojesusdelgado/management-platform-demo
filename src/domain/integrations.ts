import { z } from "zod";

export const integrationKinds = ["financial", "payroll", "people"] as const;
export const integrationRunStatuses = [
  "scheduled",
  "running",
  "succeeded",
  "partial",
  "failed",
  "cancelled",
] as const;

export type IntegrationKind = (typeof integrationKinds)[number];
export type IntegrationRunStatus = (typeof integrationRunStatuses)[number];

export type IntegrationConnector = {
  id: string;
  code: string;
  name: string;
  kind: IntegrationKind;
  enabled: boolean;
  scheduleCron: string;
  lastRunAt: string | null;
};

export type IntegrationRun = {
  id: string;
  connectorId: string;
  effectiveDate: string;
  status: IntegrationRunStatus;
  triggerKind: "manual" | "schedule" | "retry";
  sourceSequence: number;
  processedCount: number;
  importedCount: number;
  duplicateCount: number;
  errorCount: number;
  safeSummary: string;
  startedAt: string;
  finishedAt: string;
};

export type DataQualityIssue = {
  id: string;
  runId: string;
  severity: "info" | "warning" | "error";
  code: string;
  safeMessage: string;
  resolvedAt: string | null;
  createdAt: string;
};

export type SavedAnalyticsView = {
  id: string;
  name: string;
  moduleId: string;
  filters: Record<string, string | null>;
};

export type GuestPreferences = {
  simulatedRole: "admin" | "manager" | "collaborator" | "viewer" | null;
  defaultDashboard: "control-center" | "projects" | "tasks" | "vacations";
  theme: "light" | "dark" | "system";
  density: "comfortable" | "compact";
};

export const integrationConnectorSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(3),
  name: z.string().min(3),
  kind: z.enum(integrationKinds),
  enabled: z.boolean(),
  scheduleCron: z.string().min(5),
  lastRunAt: z.iso.datetime().nullable(),
});

export const integrationRunSchema = z.object({
  id: z.string().min(1),
  connectorId: z.string().min(1),
  effectiveDate: z.iso.date(),
  status: z.enum(integrationRunStatuses),
  triggerKind: z.enum(["manual", "schedule", "retry"]),
  sourceSequence: z.number().int().positive(),
  processedCount: z.number().int().nonnegative(),
  importedCount: z.number().int().nonnegative(),
  duplicateCount: z.number().int().nonnegative(),
  errorCount: z.number().int().nonnegative(),
  safeSummary: z.string().max(240),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
});

export const dataQualityIssueSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  severity: z.enum(["info", "warning", "error"]),
  code: z.string().min(3),
  safeMessage: z.string().min(3).max(240),
  resolvedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});

export const savedAnalyticsViewSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(2).max(80),
  moduleId: z.string().min(1),
  filters: z.record(z.string(), z.string().nullable()),
});

export const guestPreferencesSchema = z.object({
  simulatedRole: z
    .enum(["admin", "manager", "collaborator", "viewer"])
    .nullable(),
  defaultDashboard: z.enum([
    "control-center",
    "projects",
    "tasks",
    "vacations",
  ]),
  theme: z.enum(["light", "dark", "system"]),
  density: z.enum(["comfortable", "compact"]),
});

export function createDefaultIntegrationConnectors(): IntegrationConnector[] {
  return [
    ["financial-source-a", "financial_source_a", "Financial Source A", "financial"],
    ["financial-source-b", "financial_source_b", "Financial Source B", "financial"],
    ["payroll-master", "payroll_master", "Payroll Master", "payroll"],
    ["people-master", "people_master", "People Master", "people"],
  ].map(([id, code, name, kind]) => ({
    id,
    code,
    name,
    kind: kind as IntegrationKind,
    enabled: true,
    scheduleCron: "15 2 * * *",
    lastRunAt: null,
  }));
}

export function simulateGuestIntegrationRun(
  connector: IntegrationConnector,
  previousRuns: readonly IntegrationRun[],
  now = new Date(),
) {
  const processed =
    connector.kind === "financial" ? 36 : connector.kind === "payroll" ? 18 : 24;
  const duplicates = connector.kind === "financial" ? 2 : 0;
  const errors = connector.kind === "payroll" ? 1 : 0;
  const iso = now.toISOString();
  const effectiveDate = iso.slice(0, 10);
  const sourceSequence =
    previousRuns.filter(
      (run) =>
        run.connectorId === connector.id &&
        run.effectiveDate === effectiveDate,
    ).length + 1;
  const run: IntegrationRun = {
    id: `integration-run-${connector.code}-${effectiveDate}-${sourceSequence}`,
    connectorId: connector.id,
    effectiveDate,
    status: errors ? "partial" : "succeeded",
    triggerKind: "manual",
    sourceSequence,
    processedCount: processed,
    importedCount: processed - duplicates - errors,
    duplicateCount: duplicates,
    errorCount: errors,
    safeSummary:
      connector.kind === "financial"
        ? "Movimientos sintéticos mapeados y conciliados."
        : connector.kind === "payroll"
          ? "Ciclo agregado sintético validado."
          : "Cambios sintéticos del maestro de personal sincronizados.",
    startedAt: iso,
    finishedAt: iso,
  };
  const issue: DataQualityIssue | null = errors
    ? {
        id: `quality-${run.id}`,
        runId: run.id,
        severity: "warning",
        code: "aggregate_variation",
        safeMessage:
          "La variación agregada supera el umbral sintético de revisión.",
        resolvedAt: null,
        createdAt: iso,
      }
    : null;
  return { run, issue };
}
