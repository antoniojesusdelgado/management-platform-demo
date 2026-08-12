import { z } from "zod";
import { plainTextSchema } from "@/domain/validation";

export const workspaceProviders = ["google_workspace", "microsoft_365"] as const;
export const workspaceCapabilities = ["files", "spreadsheets", "mail", "calendar"] as const;
export const directoryCapabilities = ["directory_users", "directory_teams"] as const;
export const automationTriggers = [
  "task_assigned", "task_due", "task_status_changed", "leave_submitted",
  "leave_approved", "incident_sla_risk", "scheduled_report",
] as const;
export const automationActions = [
  "create_task", "notify", "prepare_export", "prepare_email", "prepare_calendar_event",
] as const;
export const automationConditionFields = ["priority", "status", "team", "due_window"] as const;
export const automationConditionOperators = ["equals", "in", "before"] as const;
export const recurrenceFrequencies = ["daily", "weekly", "monthly"] as const;
export const notificationStatuses = ["unread", "read", "dismissed"] as const;
export const exportTargets = ["csv", "xlsx", "google_sheets", "microsoft_excel"] as const;
export const exportStatuses = ["pending", "ready", "failed", "cancelled"] as const;

export type WorkspaceProvider = (typeof workspaceProviders)[number];
export type WorkspaceCapability = (typeof workspaceCapabilities)[number];
export type DirectoryCapability = (typeof directoryCapabilities)[number];
export type AutomationTrigger = (typeof automationTriggers)[number];
export type AutomationAction = (typeof automationActions)[number];
export type RecurrenceFrequency = (typeof recurrenceFrequencies)[number];
export type NotificationStatus = (typeof notificationStatuses)[number];
export type ExportTarget = (typeof exportTargets)[number];

export type WorkspaceConnection = {
  id: string;
  provider: WorkspaceProvider;
  status: "simulated" | "connected" | "expired" | "revoked";
  capabilities: WorkspaceCapability[];
  accountLabel: string;
  connectedAt: string | null;
  directoryCapabilities?: DirectoryCapability[];
  grantedScopes: string[];
  accountKind: "unknown" | "consumer" | "corporate";
  directoryStatus: "not_configured" | "permission_required" | "ready" | "syncing" | "error" | "paused";
  lastSyncedAt: string | null;
  lastErrorCode: string | null;
  canSyncDirectory: boolean;
};

export type AutomationRule = {
  id: string;
  name: string;
  trigger: AutomationTrigger;
  action: AutomationAction;
  condition: {
    field: (typeof automationConditionFields)[number];
    operator: (typeof automationConditionOperators)[number];
    value: string;
  } | null;
  enabled: boolean;
  lastRunAt: string | null;
};

export type AutomationRun = {
  id: string;
  ruleId: string;
  status: "succeeded" | "failed" | "skipped";
  summary: string;
  createdAt: string;
};

export type ProjectTemplate = {
  id: string;
  name: string;
  description: string;
  taskCount: number;
  durationDays: number;
  roleCodes: string[];
};

export type RecurrenceRule = {
  id: string;
  name: string;
  frequency: RecurrenceFrequency;
  nextRunDate: string;
  enabled: boolean;
};

export type CapacityAllocation = {
  id: string;
  personId: string;
  personName: string;
  projectId: string;
  projectName: string;
  weekStart: string;
  allocatedHours: number;
  availableHours: number;
};

export type OperationalNotification = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: NotificationStatus;
  source: "assignment" | "review" | "deadline" | "automation" | "mention";
  href: string;
  createdAt: string;
};

export type ExportJob = {
  id: string;
  name: string;
  moduleId: string;
  target: ExportTarget;
  status: (typeof exportStatuses)[number];
  rowCount: number;
  createdAt: string;
  externalUrl: string | null;
};

export type OperationsState = {
  workspaceConnections: WorkspaceConnection[];
  automationRules: AutomationRule[];
  automationRuns: AutomationRun[];
  projectTemplates: ProjectTemplate[];
  recurrenceRules: RecurrenceRule[];
  capacityAllocations: CapacityAllocation[];
  operationalNotifications: OperationalNotification[];
  exportJobs: ExportJob[];
};

export const workspaceConnectionSchema = z.object({
  id: z.string().min(1).max(160),
  provider: z.enum(workspaceProviders),
  status: z.enum(["simulated", "connected", "expired", "revoked"]),
  capabilities: z.array(z.enum(workspaceCapabilities)).max(workspaceCapabilities.length),
  accountLabel: plainTextSchema({ min: 2, max: 120 }),
  connectedAt: z.iso.datetime({ offset: true }).nullable(),
  grantedScopes: z.array(z.string().min(1).max(240)).max(32),
  accountKind: z.enum(["unknown", "consumer", "corporate"]),
  directoryStatus: z.enum(["not_configured", "permission_required", "ready", "syncing", "error", "paused"]),
  lastSyncedAt: z.iso.datetime({ offset: true }).nullable(),
  lastErrorCode: z.string().max(120).nullable(),
  canSyncDirectory: z.boolean(),
});

export const automationRuleSchema = z.object({
  id: z.string().min(1).max(160),
  name: plainTextSchema({ min: 3, max: 100 }),
  trigger: z.enum(automationTriggers),
  action: z.enum(automationActions),
  condition: z.object({
    field: z.enum(automationConditionFields),
    operator: z.enum(automationConditionOperators),
    value: plainTextSchema({ min: 1, max: 80 }),
  }).nullable(),
  enabled: z.boolean(),
  lastRunAt: z.iso.datetime({ offset: true }).nullable(),
});

export const automationRuleInputSchema = automationRuleSchema.pick({
  name: true, trigger: true, action: true, condition: true,
});

export const automationRunSchema = z.object({
  id: z.string().min(1).max(160),
  ruleId: z.string().min(1).max(160),
  status: z.enum(["succeeded", "failed", "skipped"]),
  summary: plainTextSchema({ min: 3, max: 240 }),
  createdAt: z.iso.datetime({ offset: true }),
});

export const projectTemplateSchema = z.object({
  id: z.string().min(1).max(160),
  name: plainTextSchema({ min: 3, max: 100 }),
  description: plainTextSchema({ min: 3, max: 500 }),
  taskCount: z.number().int().min(1).max(100),
  durationDays: z.number().int().min(1).max(365),
  roleCodes: z.array(z.string().regex(/^[a-z][a-z0-9_]{1,39}$/)).max(12),
});

export const recurrenceRuleSchema = z.object({
  id: z.string().min(1).max(160),
  name: plainTextSchema({ min: 3, max: 100 }),
  frequency: z.enum(recurrenceFrequencies),
  nextRunDate: z.iso.date(),
  enabled: z.boolean(),
});

export const capacityAllocationSchema = z.object({
  id: z.string().min(1).max(160),
  personId: z.string().min(1).max(160),
  personName: plainTextSchema({ min: 2, max: 100 }),
  projectId: z.string().min(1).max(160),
  projectName: plainTextSchema({ min: 2, max: 120 }),
  weekStart: z.iso.date(),
  allocatedHours: z.number().min(0).max(80),
  availableHours: z.number().min(0).max(80),
});

export const operationalNotificationSchema = z.object({
  id: z.string().min(1).max(160),
  title: plainTextSchema({ min: 3, max: 160 }),
  description: plainTextSchema({ max: 240 }),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(notificationStatuses),
  source: z.enum(["assignment", "review", "deadline", "automation", "mention"]),
  href: z.string().startsWith("/app/").max(240),
  createdAt: z.iso.datetime({ offset: true }),
});

export const exportJobSchema = z.object({
  id: z.string().min(1).max(160),
  name: plainTextSchema({ min: 3, max: 120 }),
  moduleId: z.string().regex(/^[a-z][a-z0-9_-]{1,39}$/),
  target: z.enum(exportTargets),
  status: z.enum(exportStatuses),
  rowCount: z.number().int().min(0).max(25_000),
  createdAt: z.iso.datetime({ offset: true }),
  externalUrl: z.url().nullable(),
});

export const calendarEventInputSchema = z.object({
  provider: z.enum(workspaceProviders),
  title: plainTextSchema({ min: 3, max: 160 }),
  description: plainTextSchema({ max: 1_000 }),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
}).refine((event) => event.endsAt > event.startsAt, {
  message: "La fecha final debe ser posterior a la inicial.",
  path: ["endsAt"],
});

export const operationsStateSchema = z.object({
  workspaceConnections: z.array(workspaceConnectionSchema),
  automationRules: z.array(automationRuleSchema),
  automationRuns: z.array(automationRunSchema),
  projectTemplates: z.array(projectTemplateSchema),
  recurrenceRules: z.array(recurrenceRuleSchema),
  capacityAllocations: z.array(capacityAllocationSchema),
  operationalNotifications: z.array(operationalNotificationSchema),
  exportJobs: z.array(exportJobSchema),
});

export function createDefaultOperationsState(anchorDate = "2026-08-10"): OperationsState {
  const createdAt = `${anchorDate}T09:00:00.000Z`;
  return operationsStateSchema.parse({
    workspaceConnections: workspaceProviders.map((provider) => ({
      id: `connection-${provider}`,
      provider,
      status: "simulated",
      capabilities: [...workspaceCapabilities],
      accountLabel: provider === "google_workspace" ? "Google Workspace de demostración" : "Microsoft 365 de demostración",
      connectedAt: null,
      grantedScopes: [],
      accountKind: "corporate",
      directoryStatus: "ready",
      lastSyncedAt: null,
      lastErrorCode: null,
      canSyncDirectory: true,
    })),
    automationRules: [
      { id: "automation-sla", name: "Avisar antes de incumplir un SLA", trigger: "incident_sla_risk", action: "notify", condition: { field: "priority", operator: "in", value: "high,critical" }, enabled: true, lastRunAt: createdAt },
      { id: "automation-report", name: "Preparar el informe semanal", trigger: "scheduled_report", action: "prepare_export", condition: null, enabled: true, lastRunAt: null },
      { id: "automation-leave", name: "Preparar cobertura tras una aprobación", trigger: "leave_approved", action: "create_task", condition: { field: "team", operator: "equals", value: "Operaciones" }, enabled: false, lastRunAt: null },
    ],
    automationRuns: [
      { id: "automation-run-sla", ruleId: "automation-sla", status: "succeeded", summary: "Se creó un aviso para revisar una incidencia prioritaria.", createdAt },
    ],
    projectTemplates: [
      { id: "template-consulting", name: "Proyecto de consultoría", description: "Descubrimiento, propuesta, ejecución, validación y cierre.", taskCount: 12, durationDays: 45, roleCodes: ["manager", "collaborator"] },
      { id: "template-onboarding", name: "Incorporación de una persona", description: "Accesos, documentación, acompañamiento y revisión inicial.", taskCount: 8, durationDays: 30, roleCodes: ["manager", "collaborator"] },
    ],
    recurrenceRules: [
      { id: "recurrence-weekly-report", name: "Informe de seguimiento", frequency: "weekly", nextRunDate: anchorDate, enabled: true },
      { id: "recurrence-monthly-close", name: "Revisión de cierre", frequency: "monthly", nextRunDate: anchorDate, enabled: true },
    ],
    capacityAllocations: [
      { id: "capacity-1", personId: "capacity-person-1", personName: "Lucía Martín", projectId: "capacity-project-1", projectName: "Modernización operativa", weekStart: anchorDate, allocatedHours: 32, availableHours: 40 },
      { id: "capacity-2", personId: "capacity-person-2", personName: "Hugo Navarro", projectId: "capacity-project-2", projectName: "Mejora de atención", weekStart: anchorDate, allocatedHours: 44, availableHours: 40 },
      { id: "capacity-3", personId: "capacity-person-3", personName: "Sofía Campos", projectId: "capacity-project-1", projectName: "Modernización operativa", weekStart: anchorDate, allocatedHours: 24, availableHours: 32 },
    ],
    operationalNotifications: [
      { id: "notification-sla", title: "Incidencia próxima a su objetivo", description: "Revisa la prioridad y confirma el siguiente paso.", priority: "critical", status: "unread", source: "automation", href: "/app/incidencias", createdAt },
      { id: "notification-review", title: "Informe semanal preparado", description: "La exportación está lista para que confirmes el destino.", priority: "medium", status: "unread", source: "review", href: "/app/operaciones", createdAt },
    ],
    exportJobs: [
      { id: "export-weekly", name: "Seguimiento semanal", moduleId: "analitica", target: "xlsx", status: "ready", rowCount: 48, createdAt, externalUrl: null },
    ],
  });
}

export function capacityStatus(allocation: CapacityAllocation) {
  const remaining = allocation.availableHours - allocation.allocatedHours;
  return {
    remaining,
    utilization: allocation.availableHours === 0 ? 0 : Math.round((allocation.allocatedHours / allocation.availableHours) * 100),
    state: remaining < 0 ? "over" as const : remaining <= 4 ? "risk" as const : "available" as const,
  };
}

export function buildMailComposerUrl(
  provider: WorkspaceProvider,
  input: { to?: string; subject: string; body: string },
) {
  const query = new URLSearchParams({ subject: input.subject, body: input.body });
  if (input.to) query.set(provider === "google_workspace" ? "to" : "to", input.to);
  return provider === "google_workspace"
    ? `https://mail.google.com/mail/?view=cm&fs=1&${query.toString()}`
    : `https://outlook.office.com/mail/deeplink/compose?${query.toString()}`;
}

export function buildMailtoUrl(input: { to?: string; subject: string; body: string }) {
  const query = new URLSearchParams({ subject: input.subject, body: input.body });
  return `mailto:${encodeURIComponent(input.to ?? "")}?${query.toString()}`;
}
