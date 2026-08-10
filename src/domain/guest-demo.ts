import { z } from "zod";
import {
  canTransitionChangelog,
  changelogInputSchema,
  changelogStatuses,
  transitionChangelog,
  type ChangelogEntry,
  type ChangelogEvent,
  type ChangelogInput,
  type ChangelogStatus,
} from "@/domain/changelog";
import {
  calculateSyntheticSlaDueAt,
  canTransitionIncident,
  incidentCategories,
  incidentPriorities,
  incidentStatuses,
  transitionIncident,
  type Incident,
  type IncidentEvent,
  type IncidentInput,
  type IncidentStatus,
} from "@/domain/incidents";
import { moduleIds, type ModuleId } from "@/domain/modules";
import {
  defaultWorkspaceConfiguration,
  workspaceConfigurationSchema,
  type WorkspaceConfiguration,
} from "@/domain/workspace-configuration";
import {
  createDefaultIntegrationConnectors,
  dataQualityIssueSchema,
  guestPreferencesSchema,
  integrationConnectorSchema,
  integrationRunSchema,
  savedAnalyticsViewSchema,
  simulateGuestIntegrationRun,
  type DataQualityIssue,
  type GuestPreferences,
  type IntegrationConnector,
  type IntegrationRun,
  type SavedAnalyticsView,
} from "@/domain/integrations";
import {
  canTransitionPayroll,
  payrollCurrencies,
  payrollInputSchema,
  payrollStatuses,
  payrollParticipantInclusionStatuses,
  payrollParticipantValidationStatuses,
  transitionPayrollRun,
  type PayrollEvent,
  type PayrollInput,
  type PayrollRun,
  type PayrollParticipant,
  type PayrollStatus,
} from "@/domain/payroll";
import { permissionCatalog, type PermissionCode } from "@/domain/permissions";
import {
  employmentContractTypes,
  personRoleCodes,
  personStatuses,
  type Person,
  type PersonEvent,
  type PersonInput,
} from "@/domain/people";
import {
  projectHealthValues,
  projectInputSchema,
  projectStatuses,
  synchronizeProjectWithTasks,
  synchronizeProjectsWithTasks,
  type Project,
  type ProjectEvent,
  type ProjectInput,
} from "@/domain/projects";
import {
  createDefaultModuleSettings,
  invitationInputSchema,
  roleMetadataSchema,
  rolePermissionsSchema,
  workspaceMembershipStatuses,
  type AdminAuditEvent,
  type ConfigurableRole,
  type ModuleSetting,
  type WorkspaceInvitation,
  type WorkspaceMembership,
  type WorkspaceMembershipStatus,
} from "@/domain/settings";
import {
  canTransitionTask,
  createsTaskDependencyCycle,
  taskPriorities,
  taskStatuses,
  transitionTask,
  type TaskComment,
  type TaskDependency,
  type TaskEvent,
  type TaskInput,
  type TaskItem,
  type TaskStatus,
} from "@/domain/tasks";
import {
  canTransitionTreasury,
  transitionTreasuryEntry,
  treasuryCurrencies,
  treasuryInputSchema,
  treasuryStatuses,
  type TreasuryEntry,
  type TreasuryEvent,
  type TreasuryInput,
  type TreasuryStatus,
} from "@/domain/treasury";
import {
  calculateBusinessDays,
  canTransitionLeaveRequest,
  leaveRequestStatuses,
  transitionLeaveRequest,
  type LeaveRequest,
  type LeaveRequestEvent,
  type LeaveRequestInput,
  type LeaveRequestStatus,
} from "@/domain/vacations";
import {
  generateDemoScenario,
  getScenarioGeneratedThroughDate,
  SCENARIO_START_DATE,
} from "@/demo-data/scenario";
import {
  automationRuleInputSchema,
  capacityAllocationSchema,
  createDefaultOperationsState,
  exportTargets,
  operationsStateSchema,
  type AutomationAction,
  type AutomationTrigger,
  type CapacityAllocation,
  type ExportTarget,
  type NotificationStatus,
  type OperationsState,
  type WorkspaceProvider,
} from "@/domain/operations";

export type GuestDemoState = OperationsState & {
  version: 21;
  scenarioVersion: 7;
  scenarioAnchorDate: string;
  scenarioStartDate: string;
  scenarioGeneratedThroughDate: string;
  activeModule: ModuleId;
  organizationName: string;
  leaveRequests: LeaveRequest[];
  leaveEvents: LeaveRequestEvent[];
  tasks: TaskItem[];
  taskDependencies: TaskDependency[];
  taskComments: TaskComment[];
  taskEvents: TaskEvent[];
  incidents: Incident[];
  incidentEvents: IncidentEvent[];
  people: Person[];
  peopleEvents: PersonEvent[];
  projects: Project[];
  projectEvents: ProjectEvent[];
  changelogEntries: ChangelogEntry[];
  changelogEvents: ChangelogEvent[];
  moduleSettings: ModuleSetting[];
  roles: ConfigurableRole[];
  memberships: WorkspaceMembership[];
  invitations: WorkspaceInvitation[];
  adminAuditEvents: AdminAuditEvent[];
  treasuryEntries: TreasuryEntry[];
  treasuryEvents: TreasuryEvent[];
  payrollRuns: PayrollRun[];
  payrollParticipants: PayrollParticipant[];
  payrollEvents: PayrollEvent[];
  integrationConnectors: IntegrationConnector[];
  integrationRuns: IntegrationRun[];
  dataQualityIssues: DataQualityIssue[];
  preferences: GuestPreferences;
  savedAnalyticsViews: SavedAnalyticsView[];
  workspaceConfiguration: WorkspaceConfiguration;
};

const leaveRequestSchema = z.object({
  id: z.string().min(1),
  employeeName: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  businessDays: z.number().int().nonnegative(),
  type: z.enum(["vacation", "personal"]),
  reason: z.string(),
  status: z.enum(leaveRequestStatuses),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const leaveEventSchema = z.object({
  id: z.string().min(1),
  requestId: z.string().min(1),
  from: z.enum(leaveRequestStatuses).nullable(),
  to: z.enum(leaveRequestStatuses),
  note: z.string(),
  actorName: z.string().min(1),
  createdAt: z.iso.datetime(),
});

const guestDemoStateV1Schema = z.object({
  version: z.literal(1),
  activeModule: z.enum(moduleIds),
  organizationName: z.string().min(1),
  leaveRequests: z.array(leaveRequestSchema),
  leaveEvents: z.array(leaveEventSchema),
});

const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3).max(160),
  description: z.string().max(2_000),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  projectId: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  assigneePersonId: z.string().nullable().optional(),
  assigneeName: z.string().min(2).max(100).nullable(),
  dueDate: z.iso.date().nullable(),
  createdBy: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const taskDependencySchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  dependsOnTaskId: z.string().min(1),
  createdAt: z.iso.datetime(),
});

const taskCommentSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  authorName: z.string().min(1),
  body: z.string().min(2).max(1_000),
  createdAt: z.iso.datetime(),
});

const taskEventSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  kind: z.enum(["created", "updated", "assigned", "status", "comment", "dependency"]),
  fromStatus: z.enum(taskStatuses).nullable(),
  toStatus: z.enum(taskStatuses).nullable(),
  note: z.string().min(1).max(1_000),
  actorName: z.string().min(1),
  createdAt: z.iso.datetime(),
});

const guestDemoStateV2Schema = guestDemoStateV1Schema.extend({
  version: z.literal(2),
  tasks: z.array(taskSchema),
  taskDependencies: z.array(taskDependencySchema),
  taskComments: z.array(taskCommentSchema),
  taskEvents: z.array(taskEventSchema),
});

const incidentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3).max(160),
  description: z.string().min(3).max(2_000),
  status: z.enum(incidentStatuses),
  priority: z.enum(incidentPriorities),
  category: z.enum(incidentCategories),
  affectedService: z.string().min(2).max(120).optional(),
  impactScope: z.enum(["individual", "team", "workspace"]).optional(),
  detectionChannel: z.enum(["monitoring", "support", "team", "automation"]).optional(),
  rootCause: z.string().max(2_000).nullable().optional(),
  firstResponseAt: z.iso.datetime().nullable().optional(),
  correctiveTaskId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  projectName: z.string().nullable().optional(),
  requesterPersonId: z.string().optional(),
  requesterName: z.string().min(1),
  assigneePersonId: z.string().nullable().optional(),
  assigneeName: z.string().min(2).max(100).nullable(),
  slaDueAt: z.iso.datetime(),
  resolution: z.string().max(2_000).nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const incidentEventSchema = z.object({
  id: z.string().min(1),
  incidentId: z.string().min(1),
  kind: z.enum(["created", "updated", "assigned", "status", "priority"]),
  fromStatus: z.enum(incidentStatuses).nullable(),
  toStatus: z.enum(incidentStatuses).nullable(),
  note: z.string().min(1).max(2_000),
  actorName: z.string().min(1),
  createdAt: z.iso.datetime(),
});

const personSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(2).max(100),
  team: z.string().min(2).max(100),
  positionTitle: z.string().min(2).max(120),
  managerPersonId: z.string().nullable().optional(),
  employmentContractType: z
    .enum(employmentContractTypes)
    .default("indefinite_ordinary"),
  employmentStartDate: z.iso.date().default(SCENARIO_START_DATE),
  employmentEndDate: z.iso.date().nullable().default(null),
  status: z.enum(personStatuses),
  roleCode: z.enum(personRoleCodes),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const personEventSchema = z.object({
  id: z.string().min(1),
  personId: z.string().min(1),
  kind: z.enum(["created", "updated", "status", "role"]),
  note: z.string().min(1).max(1_000),
  actorName: z.string().min(1),
  createdAt: z.iso.datetime(),
});

const guestDemoStateV3Schema = guestDemoStateV2Schema.extend({
  version: z.literal(3),
  incidents: z.array(incidentSchema),
  incidentEvents: z.array(incidentEventSchema),
  people: z.array(personSchema),
  peopleEvents: z.array(personEventSchema),
});

const changelogEntrySchema = z.object({
  id: z.string().min(1), version: z.string().min(1).max(30), title: z.string().min(3).max(120),
  summary: z.string().min(8).max(1_000), status: z.enum(changelogStatuses), createdBy: z.string().min(1),
  publishedAt: z.iso.datetime().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
const changelogEventSchema = z.object({
  id: z.string().min(1), entryId: z.string().min(1), fromStatus: z.enum(changelogStatuses).nullable(),
  toStatus: z.enum(changelogStatuses), note: z.string().min(3).max(1_000), actorName: z.string().min(1), createdAt: z.iso.datetime(),
});
const moduleSettingSchema = z.object({ moduleId: z.enum(moduleIds), enabled: z.boolean(), sortOrder: z.number().int().nonnegative() });
const roleSchema = z.object({ id: z.string().min(1), code: z.string().min(1), name: z.string().min(2).max(60), color: z.string().regex(/^#[0-9a-fA-F]{6}$/), permissionCodes: z.array(z.enum(permissionCatalog)) });
const membershipSchema = z.object({ id: z.string().min(1), personId: z.string().min(1), displayName: z.string().min(2), roleId: z.string().min(1), status: z.enum(workspaceMembershipStatuses) });
const invitationSchema = z.object({ id: z.string().min(1), email: z.email(), roleId: z.string().min(1), status: z.enum(["pending", "accepted", "revoked", "expired"]), expiresAt: z.iso.datetime(), createdAt: z.iso.datetime() });
const adminAuditEventSchema = z.object({ id: z.string().min(1), eventType: z.string().min(3), entityType: z.string().min(3), entityId: z.string().nullable(), actorName: z.string().min(1), summary: z.string().min(3), createdAt: z.iso.datetime() });

const guestDemoStateV4Schema = guestDemoStateV3Schema.extend({
  version: z.literal(4),
  changelogEntries: z.array(changelogEntrySchema), changelogEvents: z.array(changelogEventSchema),
  moduleSettings: z.array(moduleSettingSchema), roles: z.array(roleSchema), memberships: z.array(membershipSchema),
  invitations: z.array(invitationSchema), adminAuditEvents: z.array(adminAuditEventSchema),
});

const treasuryEntrySchema = z.object({
  id: z.string().min(1), entryDate: z.iso.date(), concept: z.string().min(3).max(160),
  category: z.string().min(2).max(80).optional(), source: z.enum(["Financial Source A", "Financial Source B", "Manual"]).optional(),
  amountCents: z.number().int(), currency: z.enum(treasuryCurrencies), status: z.enum(treasuryStatuses),
  createdBy: z.string().min(1), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
});
const treasuryEventSchema = z.object({
  id: z.string().min(1), entryId: z.string().min(1), kind: z.enum(["created", "updated", "status"]),
  fromStatus: z.enum(treasuryStatuses).nullable(), toStatus: z.enum(treasuryStatuses),
  note: z.string().min(3).max(1_000), actorName: z.string().min(1), createdAt: z.iso.datetime(),
});

const guestDemoStateV5Schema = guestDemoStateV4Schema.extend({
  version: z.literal(5),
  treasuryEntries: z.array(treasuryEntrySchema),
  treasuryEvents: z.array(treasuryEventSchema),
});

const payrollRunSchema = z.object({
  id: z.string().min(1), periodStart: z.iso.date(), periodEnd: z.iso.date(), peopleCount: z.number().int().positive(),
  grossTotalCents: z.number().int().positive(), deductionTotalCents: z.number().int().nonnegative(), netTotalCents: z.number().int().nonnegative(),
  employerCostTotalCents: z.number().int().positive().optional(),
  currency: z.enum(payrollCurrencies), notes: z.string().max(1_000), status: z.enum(payrollStatuses), createdBy: z.string().min(1),
  createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
}).refine((run) => run.periodEnd >= run.periodStart && run.deductionTotalCents <= run.grossTotalCents && run.netTotalCents === run.grossTotalCents - run.deductionTotalCents);
const payrollEventSchema = z.object({
  id: z.string().min(1), runId: z.string().min(1), kind: z.enum(["created", "updated", "status"]),
  fromStatus: z.enum(payrollStatuses).nullable(), toStatus: z.enum(payrollStatuses), note: z.string().min(3).max(1_000),
  actorName: z.string().min(1), createdAt: z.iso.datetime(),
});
const payrollParticipantSchema = z.object({
  id: z.string().min(1),
  runId: z.string().min(1),
  personId: z.string().min(1),
  personName: z.string().min(2),
  team: z.string().min(2),
  positionTitle: z.string().min(2),
  inclusionStatus: z.enum(payrollParticipantInclusionStatuses),
  validationStatus: z.enum(payrollParticipantValidationStatuses),
});

const guestDemoStateV6Schema = guestDemoStateV5Schema.extend({
  version: z.literal(6),
  payrollRuns: z.array(payrollRunSchema),
  payrollEvents: z.array(payrollEventSchema),
});

const projectSchema = z.object({
  id: z.string().min(1),
  code: z.string().min(2).max(16),
  name: z.string().min(3).max(120),
  summary: z.string().max(1_000),
  status: z.enum(projectStatuses),
  health: z.enum(projectHealthValues),
  ownerPersonId: z.string().nullable(),
  ownerName: z.string().nullable(),
  startDate: z.iso.date().nullable(),
  targetDate: z.iso.date().nullable(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  memberIds: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const projectEventSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  kind: z.enum(["created", "updated", "status", "health", "member"]),
  note: z.string().min(3).max(1_000),
  actorName: z.string().min(1),
  createdAt: z.iso.datetime(),
});

const guestDemoStateV7Schema = guestDemoStateV6Schema.extend({
  version: z.literal(7),
  scenarioVersion: z.literal(1),
  projects: z.array(projectSchema),
  projectEvents: z.array(projectEventSchema),
});

const guestDemoStateV8Schema = guestDemoStateV7Schema.extend({
  version: z.literal(8),
  integrationConnectors: z.array(integrationConnectorSchema),
  integrationRuns: z.array(integrationRunSchema),
  dataQualityIssues: z.array(dataQualityIssueSchema),
});

const guestDemoStateV9Schema = guestDemoStateV8Schema.extend({
  version: z.literal(9),
  preferences: guestPreferencesSchema,
  savedAnalyticsViews: z.array(savedAnalyticsViewSchema),
});

const guestDemoStateV10Schema = guestDemoStateV9Schema.extend({
  version: z.literal(10),
  scenarioVersion: z.literal(2),
  workspaceConfiguration: workspaceConfigurationSchema,
});

const guestDemoStateV11Schema = guestDemoStateV10Schema.extend({
  version: z.literal(11),
  scenarioVersion: z.literal(3),
});

const guestDemoStateV12Schema = guestDemoStateV11Schema.extend({
  version: z.literal(12),
  scenarioVersion: z.literal(4),
});

const guestDemoStateV13Schema = guestDemoStateV12Schema.extend({
  version: z.literal(13),
  scenarioVersion: z.literal(5),
  scenarioAnchorDate: z.iso.date(),
  payrollParticipants: z.array(payrollParticipantSchema),
});

const guestDemoStateV14Schema = guestDemoStateV13Schema.extend({
  version: z.literal(14),
  scenarioVersion: z.literal(6),
});

const guestDemoStateV15Schema = guestDemoStateV14Schema.extend({
  version: z.literal(15),
  scenarioVersion: z.literal(7),
  scenarioStartDate: z.iso.date(),
  scenarioGeneratedThroughDate: z.iso.date(),
});

const guestDemoStateV16Schema = guestDemoStateV15Schema.extend({
  version: z.literal(16),
});

const guestDemoStateV17Schema = guestDemoStateV16Schema.extend({
  version: z.literal(17),
});

const guestDemoStateV18Schema = guestDemoStateV17Schema.extend({
  version: z.literal(18),
});

const guestDemoStateV19Schema = guestDemoStateV18Schema.extend({
  version: z.literal(19),
});

const guestDemoStateV20Schema = guestDemoStateV19Schema.extend({
  version: z.literal(20),
});

export const guestDemoStateSchema = guestDemoStateV20Schema.extend({
  version: z.literal(21),
  ...operationsStateSchema.shape,
});

function normalizeLegacyAnalyticsModule(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  const state = structuredClone(value) as Record<string, unknown>;
  if (state.activeModule === "centro-control") state.activeModule = "analitica";

  if (Array.isArray(state.moduleSettings)) {
    state.moduleSettings = state.moduleSettings.map((setting) => {
      if (!setting || typeof setting !== "object" || Array.isArray(setting)) {
        return setting;
      }
      const normalized = { ...(setting as Record<string, unknown>) };
      if (normalized.moduleId === "centro-control") {
        normalized.moduleId = "analitica";
      }
      return normalized;
    });
  }

  if (Array.isArray(state.savedAnalyticsViews)) {
    state.savedAnalyticsViews = state.savedAnalyticsViews.map((view) => {
      if (!view || typeof view !== "object" || Array.isArray(view)) return view;
      const normalized = { ...(view as Record<string, unknown>) };
      if (normalized.moduleId === "centro-control") {
        normalized.moduleId = "analitica";
      }
      return normalized;
    });
  }

  if (
    state.preferences &&
    typeof state.preferences === "object" &&
    !Array.isArray(state.preferences)
  ) {
    const preferences = {
      ...(state.preferences as Record<string, unknown>),
    };
    if (preferences.defaultDashboard === "control-center") {
      preferences.defaultDashboard = "analytics";
    }
    if (preferences.theme === "system") {
      preferences.theme = "light";
    }
    state.preferences = preferences;
  }

  return state;
}

export function parseGuestDemoState(value: unknown): GuestDemoState | null {
  const normalized = normalizeLegacyAnalyticsModule(value);
  const result = guestDemoStateSchema.safeParse(normalized);
  if (result.success) return result.data;

  const version20 = guestDemoStateV20Schema.safeParse(normalized);
  if (version20.success) return migrateVersion20(version20.data);

  const version19 = guestDemoStateV19Schema.safeParse(normalized);
  if (version19.success) return migrateVersion19(version19.data);

  const version18 = guestDemoStateV18Schema.safeParse(normalized);
  if (version18.success) return migrateVersion18(version18.data);

  const version17 = guestDemoStateV17Schema.safeParse(normalized);
  if (version17.success) return migrateVersion17(version17.data);

  const version16 = guestDemoStateV16Schema.safeParse(normalized);
  if (version16.success) return migrateVersion16(version16.data);

  const version15 = guestDemoStateV15Schema.safeParse(normalized);
  if (version15.success) return migrateVersion15(version15.data);

  const version14 = guestDemoStateV14Schema.safeParse(normalized);
  if (version14.success) return migrateVersion14(version14.data);

  const version13 = guestDemoStateV13Schema.safeParse(normalized);
  if (version13.success) return migrateVersion13(version13.data);

  const version12 = guestDemoStateV12Schema.safeParse(normalized);
  if (version12.success) return migrateVersion12(version12.data);

  const version11 = guestDemoStateV11Schema.safeParse(normalized);
  if (version11.success) return migrateVersion11(version11.data);

  const version10 = guestDemoStateV10Schema.safeParse(normalized);
  if (version10.success) return migrateVersion10(version10.data);

  const version9 = guestDemoStateV9Schema.safeParse(normalized);
  if (version9.success) return migrateVersion9(version9.data);

  const version8 = guestDemoStateV8Schema.safeParse(normalized);
  if (version8.success) return migrateVersion8(version8.data);

  const version7 = guestDemoStateV7Schema.safeParse(normalized);
  if (version7.success) return migrateVersion8(migrateVersion7(version7.data));

  const version6 = guestDemoStateV6Schema.safeParse(normalized);
  if (version6.success) return migrateVersion8(migrateVersion7(migrateVersion6(version6.data)));

  const version5 = guestDemoStateV5Schema.safeParse(normalized);
  if (version5.success) return migrateVersion8(migrateVersion7(migrateVersion6(migrateVersion5(version5.data))));

  const version4 = guestDemoStateV4Schema.safeParse(normalized);
  if (version4.success) return migrateVersion8(migrateVersion7(migrateVersion6(migrateVersion5(migrateVersion4(version4.data)))));

  const version3 = guestDemoStateV3Schema.safeParse(normalized);
  if (version3.success) return migrateVersion8(migrateVersion7(migrateVersion6(migrateVersion5(migrateVersion4(migrateVersion3(version3.data))))));

  const version2 = guestDemoStateV2Schema.safeParse(normalized);
  if (version2.success) return migrateVersion8(migrateVersion7(migrateVersion6(migrateVersion5(migrateVersion4(migrateVersion3(migrateVersion2(version2.data)))))));

  const version1 = guestDemoStateV1Schema.safeParse(normalized);
  if (!version1.success) return null;
  return migrateVersion8(migrateVersion7(migrateVersion6(migrateVersion5(migrateVersion4(migrateVersion3(migrateVersion2({ ...version1.data, version: 2, ...createInitialTaskState() })))))));
}

export type GuestDemoAction =
  | { type: "hydrate"; state: GuestDemoState }
  | { type: "navigate"; module: ModuleId }
  | { type: "create-leave"; input: LeaveRequestInput }
  | {
      type: "transition-leave";
      requestId: string;
      status: LeaveRequestStatus;
      note: string;
    }
  | { type: "create-task"; input: TaskInput }
  | { type: "update-task"; taskId: string; input: TaskInput }
  | { type: "transition-task"; taskId: string; status: TaskStatus; note: string }
  | { type: "add-task-comment"; taskId: string; body: string; mentionedPersonId?: string }
  | { type: "add-task-dependency"; taskId: string; dependsOnTaskId: string }
  | { type: "create-incident"; input: IncidentInput }
  | { type: "update-incident"; incidentId: string; input: IncidentInput }
  | { type: "transition-incident"; incidentId: string; status: IncidentStatus; note: string }
  | { type: "create-person"; input: PersonInput }
  | { type: "update-person"; personId: string; input: PersonInput }
  | { type: "create-project"; input: ProjectInput }
  | { type: "update-project"; projectId: string; input: ProjectInput }
  | { type: "create-changelog"; input: ChangelogInput }
  | { type: "update-changelog"; entryId: string; input: ChangelogInput }
  | { type: "transition-changelog"; entryId: string; status: ChangelogStatus; note: string }
  | { type: "create-treasury"; input: TreasuryInput }
  | { type: "update-treasury"; entryId: string; input: TreasuryInput }
  | { type: "transition-treasury"; entryId: string; status: TreasuryStatus; note: string }
  | { type: "create-payroll"; input: PayrollInput }
  | { type: "update-payroll"; runId: string; input: PayrollInput }
  | { type: "transition-payroll"; runId: string; status: PayrollStatus; note: string }
  | { type: "update-module-setting"; moduleId: ModuleId; enabled: boolean; sortOrder: number }
  | { type: "update-role-metadata"; roleId: string; name: string; color: string }
  | { type: "update-role-permissions"; roleId: string; permissionCodes: PermissionCode[] }
  | { type: "create-invitation"; email: string; roleId: string }
  | { type: "update-membership"; membershipId: string; roleId: string; status: WorkspaceMembershipStatus }
  | { type: "rename-organization"; name: string }
  | { type: "simulate-integration"; connectorId: string }
  | { type: "update-preferences"; preferences: GuestPreferences }
  | { type: "save-analytics-view"; view: SavedAnalyticsView }
  | { type: "create-automation-rule"; input: { name: string; trigger: AutomationTrigger; action: AutomationAction } }
  | { type: "toggle-automation-rule"; ruleId: string; enabled: boolean }
  | { type: "run-automation-rule"; ruleId: string }
  | { type: "apply-project-template"; templateId: string }
  | { type: "add-capacity-allocation"; input: Omit<CapacityAllocation, "id" | "personName" | "projectName"> }
  | { type: "mark-notification"; notificationId: string; status: NotificationStatus }
  | { type: "create-export-job"; input: { name: string; moduleId: string; target: ExportTarget } }
  | { type: "disconnect-workspace"; provider: WorkspaceProvider }
  | {
      type: "update-workspace-configuration";
      configuration: WorkspaceConfiguration;
    }
  | { type: "reset" };

function createInitialTaskState(): Pick<
  GuestDemoState,
  "tasks" | "taskDependencies" | "taskComments" | "taskEvents"
> {
  return {
    tasks: [
      {
        id: "task-001",
        title: "Preparar el informe semanal",
        description: "Consolidar los avances del equipo y preparar la revisión.",
        status: "in_progress",
        priority: "high",
        projectId: "project-001",
        projectName: "Eficiencia operativa",
        assigneePersonId: null,
        assigneeName: "Usuario invitado",
        dueDate: "2026-07-24",
        createdBy: "Lucía Martín",
        createdAt: "2026-07-18T08:30:00.000Z",
        updatedAt: "2026-07-21T10:15:00.000Z",
      },
      {
        id: "task-002",
        title: "Validar la documentación técnica",
        description: "Comprobar la estructura, los enlaces y los ejemplos antes de publicar.",
        status: "pending",
        priority: "medium",
        projectId: "project-001",
        projectName: "Eficiencia operativa",
        assigneePersonId: "person-001",
        assigneeName: "Elena Martín",
        dueDate: "2026-07-29",
        createdBy: "Lucía Martín",
        createdAt: "2026-07-19T09:00:00.000Z",
        updatedAt: "2026-07-19T09:00:00.000Z",
      },
      {
        id: "task-003",
        title: "Revisar el flujo de permisos",
        description: "Verificar la matriz de permisos antes de pasar el cambio a revisión.",
        status: "blocked",
        priority: "urgent",
        projectId: "project-002",
        projectName: "Calidad del dato",
        assigneePersonId: null,
        assigneeName: "Usuario invitado",
        dueDate: "2026-07-23",
        createdBy: "Lucía Martín",
        createdAt: "2026-07-17T12:00:00.000Z",
        updatedAt: "2026-07-21T16:40:00.000Z",
      },
      {
        id: "task-004",
        title: "Publicar notas de la iteración",
        description: "Preparar un resumen interno sin referencias a proyectos u organizaciones reales.",
        status: "in_review",
        priority: "low",
        projectId: "project-003",
        projectName: "Experiencia de usuario",
        assigneePersonId: null,
        assigneeName: null,
        dueDate: null,
        createdBy: "Lucía Martín",
        createdAt: "2026-07-20T10:00:00.000Z",
        updatedAt: "2026-07-22T08:10:00.000Z",
      },
    ],
    taskDependencies: [
      {
        id: "dependency-001",
        taskId: "task-004",
        dependsOnTaskId: "task-002",
        createdAt: "2026-07-20T10:05:00.000Z",
      },
    ],
    taskComments: [
      {
        id: "comment-001",
        taskId: "task-003",
        authorName: "Usuario invitado",
        body: "Pendiente de confirmar el alcance de los permisos.",
        createdAt: "2026-07-21T16:40:00.000Z",
      },
    ],
    taskEvents: [
      {
        id: "task-event-001",
        taskId: "task-003",
        kind: "status",
        fromStatus: "in_progress",
        toStatus: "blocked",
        note: "Bloqueada hasta validar el alcance.",
        actorName: "Usuario invitado",
        createdAt: "2026-07-21T16:40:00.000Z",
      },
    ],
  };
}

function createInitialIncidentPeopleState(): Pick<
  GuestDemoState,
  "incidents" | "incidentEvents" | "people" | "peopleEvents"
> {
  return {
    incidents: [
      {
        id: "incident-001",
        title: "Acceso bloqueado al entorno de pruebas",
        description: "Una cuenta con acceso suspendido no puede entrar en la aplicación.",
        status: "investigating",
        priority: "high",
        category: "access",
        projectId: "project-001",
        projectName: "Eficiencia operativa",
        requesterPersonId: "person-003",
        requesterName: "Marta Soler",
        assigneePersonId: "person-001",
        assigneeName: "Elena Martín",
        slaDueAt: "2026-07-23T08:30:00.000Z",
        resolution: null,
        createdAt: "2026-07-22T08:30:00.000Z",
        updatedAt: "2026-07-22T10:00:00.000Z",
      },
      {
        id: "incident-002",
        title: "Error al aplicar el filtro de fechas",
        description: "El filtro de fechas devuelve un resultado incompleto.",
        status: "registered",
        priority: "medium",
        category: "software",
        projectId: "project-002",
        projectName: "Calidad del dato",
        requesterPersonId: "person-002",
        requesterName: "Diego Santos",
        assigneePersonId: null,
        assigneeName: null,
        slaDueAt: "2026-07-25T09:00:00.000Z",
        resolution: null,
        createdAt: "2026-07-22T09:00:00.000Z",
        updatedAt: "2026-07-22T09:00:00.000Z",
      },
    ],
    incidentEvents: [
      {
        id: "incident-event-001",
        incidentId: "incident-001",
        kind: "status",
        fromStatus: "assigned",
        toStatus: "investigating",
        note: "Diagnóstico iniciado con una revisión de los filtros.",
        actorName: "Elena Martín",
        createdAt: "2026-07-22T10:00:00.000Z",
      },
    ],
    people: [
      {
        id: "person-001",
        displayName: "Elena Martín",
        team: "Operaciones",
        positionTitle: "Responsable de operaciones",
        employmentContractType: "indefinite_ordinary",
        employmentStartDate: "2025-01-01",
        employmentEndDate: null,
        status: "active",
        roleCode: "manager",
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-01T08:00:00.000Z",
      },
      {
        id: "person-002",
        displayName: "Diego Santos",
        team: "Producto",
        positionTitle: "Especialista de producto",
        employmentContractType: "indefinite_ordinary",
        employmentStartDate: "2025-01-01",
        employmentEndDate: null,
        status: "active",
        roleCode: "collaborator",
        createdAt: "2026-07-02T08:00:00.000Z",
        updatedAt: "2026-07-02T08:00:00.000Z",
      },
      {
        id: "person-003",
        displayName: "Marta Soler",
        team: "Tecnología",
        positionTitle: "Desarrolladora",
        employmentContractType: "temporary_production",
        employmentStartDate: "2026-06-01",
        employmentEndDate: null,
        status: "invited",
        roleCode: "collaborator",
        createdAt: "2026-07-20T08:00:00.000Z",
        updatedAt: "2026-07-20T08:00:00.000Z",
      },
    ],
    peopleEvents: [],
  };
}

function migrateVersion2(state: z.infer<typeof guestDemoStateV2Schema>): z.infer<typeof guestDemoStateV3Schema> {
  return { ...state, version: 3, ...createInitialIncidentPeopleState() };
}

function createInitialChangelogSettingsState(): Pick<
  GuestDemoState,
  "changelogEntries" | "changelogEvents" | "moduleSettings" | "roles" | "memberships" | "invitations" | "adminAuditEvents"
> {
  return {
    changelogEntries: [
      {
        id: "changelog-001", version: "0.3.0", title: "Incidencias y directorio seguro",
        summary: "Añade flujos de incidencias y perfiles separados de la autorización.", status: "published",
        createdBy: "Lucía Martín", publishedAt: "2026-07-22T15:00:00.000Z", createdAt: "2026-07-22T11:00:00.000Z", updatedAt: "2026-07-22T15:00:00.000Z",
      },
      {
        id: "changelog-002", version: "0.4.0", title: "Configuración verificable",
        summary: "Prepara la matriz de permisos, el orden de módulos y la auditoría administrativa.", status: "in_review",
        createdBy: "Usuario invitado", publishedAt: null, createdAt: "2026-07-22T16:00:00.000Z", updatedAt: "2026-07-22T16:00:00.000Z",
      },
    ],
    changelogEvents: [
      { id: "changelog-event-001", entryId: "changelog-001", fromStatus: "in_review", toStatus: "published", note: "Contenido revisado y publicado.", actorName: "Lucía Martín", createdAt: "2026-07-22T15:00:00.000Z" },
    ],
    moduleSettings: createDefaultModuleSettings(),
    roles: [
      { id: "role-admin", code: "admin", name: "Administración", color: "#2563eb", permissionCodes: [...permissionCatalog] },
      { id: "role-manager", code: "manager", name: "Responsable", color: "#0891b2", permissionCodes: ["vacations.requests.view", "vacations.requests.approve", "tasks.items.view", "tasks.items.manage", "incidents.tickets.view", "incidents.tickets.manage", "treasury.entries.view", "people.profiles.view", "changelog.entries.view", "changelog.entries.manage"] },
      { id: "role-collaborator", code: "collaborator", name: "Colaboración", color: "#64748b", permissionCodes: ["vacations.requests.view", "vacations.requests.create", "tasks.items.view", "incidents.tickets.view", "people.profiles.view", "changelog.entries.view"] },
    ],
    memberships: [
      { id: "membership-001", personId: "person-001", displayName: "Elena Martín", roleId: "role-manager", status: "active" },
      { id: "membership-002", personId: "person-002", displayName: "Diego Santos", roleId: "role-collaborator", status: "active" },
      { id: "membership-003", personId: "person-003", displayName: "Marta Soler", roleId: "role-collaborator", status: "invited" },
    ],
    invitations: [
      { id: "invitation-001", email: "invitacion@example.test", roleId: "role-collaborator", status: "pending", expiresAt: "2026-08-05T12:00:00.000Z", createdAt: "2026-07-22T12:00:00.000Z" },
    ],
    adminAuditEvents: [],
  };
}

function migrateVersion3(state: z.infer<typeof guestDemoStateV3Schema>): z.infer<typeof guestDemoStateV4Schema> {
  return guestDemoStateV4Schema.parse({ ...state, version: 4, ...createInitialChangelogSettingsState() });
}

function createInitialTreasuryState(): Pick<GuestDemoState, "treasuryEntries" | "treasuryEvents"> {
  return {
    treasuryEntries: [
      {
        id: "treasury-001", entryDate: "2026-07-01", concept: "Ingresos por servicios",
        amountCents: 1_250_000, currency: "EUR", status: "closed", createdBy: "Lucía Martín",
        createdAt: "2026-07-02T08:30:00.000Z", updatedAt: "2026-07-08T12:00:00.000Z",
      },
      {
        id: "treasury-002", entryDate: "2026-07-15", concept: "Servicios digitales",
        amountCents: -184_500, currency: "EUR", status: "validated", createdBy: "Lucía Martín",
        createdAt: "2026-07-16T09:00:00.000Z", updatedAt: "2026-07-21T11:20:00.000Z",
      },
      {
        id: "treasury-003", entryDate: "2026-07-21", concept: "Operaciones internas",
        amountCents: -72_000, currency: "EUR", status: "registered", createdBy: "Usuario invitado",
        createdAt: "2026-07-21T14:00:00.000Z", updatedAt: "2026-07-21T14:00:00.000Z",
      },
    ],
    treasuryEvents: [
      { id: "treasury-event-001", entryId: "treasury-001", kind: "status", fromStatus: "validated", toStatus: "closed", note: "Periodo cerrado.", actorName: "Daniel Ortega", createdAt: "2026-07-08T12:00:00.000Z" },
      { id: "treasury-event-002", entryId: "treasury-002", kind: "status", fromStatus: "reconciled", toStatus: "validated", note: "Importe agregado validado.", actorName: "Daniel Ortega", createdAt: "2026-07-21T11:20:00.000Z" },
      { id: "treasury-event-003", entryId: "treasury-003", kind: "created", fromStatus: null, toStatus: "draft", note: "Movimiento creado.", actorName: "Usuario invitado", createdAt: "2026-07-21T13:45:00.000Z" },
      { id: "treasury-event-004", entryId: "treasury-003", kind: "status", fromStatus: "draft", toStatus: "registered", note: "Movimiento registrado.", actorName: "Usuario invitado", createdAt: "2026-07-21T14:00:00.000Z" },
    ],
  };
}

function migrateVersion4(state: z.infer<typeof guestDemoStateV4Schema>): z.infer<typeof guestDemoStateV5Schema> {
  return { ...state, version: 5, ...createInitialTreasuryState() };
}

function createInitialPayrollState(): Pick<GuestDemoState, "payrollRuns" | "payrollEvents"> {
  return {
    payrollRuns: [
      { id: "payroll-001", periodStart: "2026-06-01", periodEnd: "2026-06-30", peopleCount: 18, grossTotalCents: 512_000, deductionTotalCents: 94_000, netTotalCents: 418_000, currency: "EUR", notes: "Ciclo agregado cerrado.", status: "closed", createdBy: "Bruno Molina", createdAt: "2026-06-20T09:00:00.000Z", updatedAt: "2026-06-28T12:00:00.000Z" },
      { id: "payroll-002", periodStart: "2026-07-01", periodEnd: "2026-07-31", peopleCount: 19, grossTotalCents: 546_000, deductionTotalCents: 101_000, netTotalCents: 445_000, currency: "EUR", notes: "Revisión agregada del periodo.", status: "reviewed", createdBy: "Bruno Molina", createdAt: "2026-07-18T09:00:00.000Z", updatedAt: "2026-07-22T12:00:00.000Z" },
      { id: "payroll-003", periodStart: "2026-08-01", periodEnd: "2026-08-31", peopleCount: 19, grossTotalCents: 548_500, deductionTotalCents: 102_500, netTotalCents: 446_000, currency: "EUR", notes: "Estimación agregada en recopilación.", status: "collecting", createdBy: "Usuario invitado", createdAt: "2026-07-22T14:00:00.000Z", updatedAt: "2026-07-22T14:00:00.000Z" },
    ],
    payrollEvents: [
      { id: "payroll-event-001", runId: "payroll-001", kind: "status", fromStatus: "reviewed", toStatus: "closed", note: "Ciclo agregado cerrado.", actorName: "Bruno Molina", createdAt: "2026-06-28T12:00:00.000Z" },
      { id: "payroll-event-002", runId: "payroll-002", kind: "status", fromStatus: "calculated", toStatus: "reviewed", note: "Totales agregados revisados.", actorName: "Bruno Molina", createdAt: "2026-07-22T12:00:00.000Z" },
      { id: "payroll-event-003", runId: "payroll-003", kind: "created", fromStatus: null, toStatus: "collecting", note: "Ciclo agregado creado.", actorName: "Usuario invitado", createdAt: "2026-07-22T14:00:00.000Z" },
    ],
  };
}

function migrateVersion5(
  state: z.infer<typeof guestDemoStateV5Schema>,
): z.infer<typeof guestDemoStateV6Schema> {
  return { ...state, version: 6, ...createInitialPayrollState() };
}

function createInitialProjectState(): Pick<
  GuestDemoState,
  "projects" | "projectEvents"
> {
  return {
    projects: [
      {
        id: "project-001",
        code: "OPS-01",
        name: "Eficiencia operativa",
        summary:
          "Mejora del flujo interno de solicitudes y tiempos de respuesta.",
        status: "active",
        health: "on_track",
        ownerPersonId: "person-001",
        ownerName: "Elena Martín",
        startDate: "2026-04-01",
        targetDate: "2026-09-30",
        color: "#4f46e5",
        memberIds: ["person-001", "person-002"],
        createdAt: "2026-04-01T08:00:00.000Z",
        updatedAt: "2026-07-20T11:30:00.000Z",
      },
      {
        id: "project-002",
        code: "DATA-02",
        name: "Calidad del dato",
        summary:
          "Controles de integridad y trazabilidad para los módulos.",
        status: "active",
        health: "at_risk",
        ownerPersonId: "person-002",
        ownerName: "Diego Santos",
        startDate: "2026-05-15",
        targetDate: "2026-08-31",
        color: "#0d9488",
        memberIds: ["person-002", "person-003"],
        createdAt: "2026-05-15T08:00:00.000Z",
        updatedAt: "2026-07-21T15:00:00.000Z",
      },
      {
        id: "project-003",
        code: "EXP-03",
        name: "Experiencia de usuario",
        summary:
          "Evolución accesible y adaptable de la experiencia de gestión.",
        status: "planned",
        health: "on_track",
        ownerPersonId: "person-003",
        ownerName: "Marta Soler",
        startDate: "2026-08-01",
        targetDate: "2026-11-15",
        color: "#d97706",
        memberIds: ["person-001", "person-003"],
        createdAt: "2026-07-01T08:00:00.000Z",
        updatedAt: "2026-07-18T09:00:00.000Z",
      },
    ],
    projectEvents: [
      {
        id: "project-event-001",
        projectId: "project-001",
        kind: "health",
        note: "Revisión semanal completada; el proyecto continúa en plazo.",
        actorName: "Elena Martín",
        createdAt: "2026-07-20T11:30:00.000Z",
      },
      {
        id: "project-event-002",
        projectId: "project-002",
        kind: "health",
        note: "Se identifica riesgo por dependencias bloqueadas.",
        actorName: "Diego Santos",
        createdAt: "2026-07-21T15:00:00.000Z",
      },
    ],
  };
}

function migrateVersion6(
  state: z.infer<typeof guestDemoStateV6Schema>,
): z.infer<typeof guestDemoStateV7Schema> {
  const initialProjects = createInitialProjectState();
  const projectNames = new Map(
    initialProjects.projects.map((project) => [project.id, project.name]),
  );
  return guestDemoStateV7Schema.parse({
    ...state,
    version: 7,
    scenarioVersion: 1,
    ...initialProjects,
    tasks: state.tasks.map((task, index) => ({
      ...task,
      projectId:
        task.projectId ?? initialProjects.projects[index % 2]?.id ?? null,
      projectName:
        task.projectName ??
        projectNames.get(
          task.projectId ?? initialProjects.projects[index % 2]?.id ?? "",
        ) ??
        null,
      assigneePersonId:
        task.assigneePersonId ??
        state.people.find((person) => person.displayName === task.assigneeName)
          ?.id ??
        null,
    })),
    incidents: state.incidents.map((incident, index) => ({
      ...incident,
      projectId:
        incident.projectId ??
        initialProjects.projects[index % 2]?.id ??
        null,
      projectName:
        incident.projectName ??
        projectNames.get(
          incident.projectId ??
            initialProjects.projects[index % 2]?.id ??
            "",
        ) ??
        null,
      requesterPersonId:
        incident.requesterPersonId ??
        state.people.find(
          (person) => person.displayName === incident.requesterName,
        )?.id ?? "person-001",
      assigneePersonId:
        incident.assigneePersonId ??
        state.people.find(
          (person) => person.displayName === incident.assigneeName,
        )?.id ?? null,
    })),
  });
}

function migrateVersion7(
  state: z.infer<typeof guestDemoStateV7Schema>,
): z.infer<typeof guestDemoStateV8Schema> {
  return guestDemoStateV8Schema.parse({
    ...state,
    version: 8,
    integrationConnectors: createDefaultIntegrationConnectors(),
    integrationRuns: [],
    dataQualityIssues: [],
  });
}

function migrateVersion8(
  state: z.infer<typeof guestDemoStateV8Schema>,
): GuestDemoState {
  return migrateVersion9(guestDemoStateV9Schema.parse({
    ...state,
    version: 9,
    preferences: {
      simulatedRole: null,
      defaultDashboard: "analytics",
      theme: "light",
      density: "comfortable",
    },
    savedAnalyticsViews: [],
  }));
}

function migrateVersion9(
  state: z.infer<typeof guestDemoStateV9Schema>,
): GuestDemoState {
  const rebuilt = addStandardScenario({
    ...initialGuestDemoStateBase,
    organizationName: state.organizationName,
    activeModule: state.activeModule,
    preferences: state.preferences,
    savedAnalyticsViews: state.savedAnalyticsViews.map((view) => ({
      ...view,
      moduleId:
        view.moduleId === "centro-control" ? "analitica" : view.moduleId,
    })),
  });
  return guestDemoStateSchema.parse(rebuilt);
}

function migrateVersion10(
  state: z.infer<typeof guestDemoStateV10Schema>,
): GuestDemoState {
  return guestDemoStateSchema.parse(
    addStandardScenario({
      ...initialGuestDemoStateBase,
      organizationName: state.organizationName,
      activeModule: state.activeModule,
      preferences: state.preferences,
      savedAnalyticsViews: state.savedAnalyticsViews,
      workspaceConfiguration: state.workspaceConfiguration,
    }),
  );
}

function migrateVersion11(
  state: z.infer<typeof guestDemoStateV11Schema>,
): GuestDemoState {
  return guestDemoStateSchema.parse(
    addStandardScenario({
      ...initialGuestDemoStateBase,
      organizationName: state.organizationName,
      activeModule: state.activeModule,
      preferences: state.preferences,
      savedAnalyticsViews: state.savedAnalyticsViews,
      workspaceConfiguration: state.workspaceConfiguration,
    }),
  );
}

function migrateVersion12(
  state: z.infer<typeof guestDemoStateV12Schema>,
): GuestDemoState {
  return guestDemoStateSchema.parse(
    addStandardScenario({
      ...initialGuestDemoStateBase,
      organizationName: state.organizationName,
      activeModule: state.activeModule,
      preferences: state.preferences,
      savedAnalyticsViews: state.savedAnalyticsViews,
      workspaceConfiguration: state.workspaceConfiguration,
    }),
  );
}

function migrateVersion13(
  state: z.infer<typeof guestDemoStateV13Schema>,
): GuestDemoState {
  return guestDemoStateSchema.parse(
    addStandardScenario({
      ...initialGuestDemoStateBase,
      organizationName: state.organizationName,
      activeModule: state.activeModule,
      preferences: state.preferences,
      savedAnalyticsViews: state.savedAnalyticsViews,
      workspaceConfiguration: state.workspaceConfiguration,
      scenarioAnchorDate: state.scenarioAnchorDate,
    }),
  );
}

function migrateVersion14(
  state: z.infer<typeof guestDemoStateV14Schema>,
): GuestDemoState {
  const generated = addStandardScenario({
    ...state,
    version: 21,
    scenarioVersion: 7,
    scenarioStartDate: SCENARIO_START_DATE,
    scenarioGeneratedThroughDate: state.scenarioAnchorDate,
    ...createDefaultOperationsState(state.scenarioAnchorDate),
  });
  const mergeById = <T extends { id: string }>(
    existing: T[],
    additions: T[],
  ) => [
    ...existing,
    ...additions.filter(
      (addition) => !existing.some((item) => item.id === addition.id),
    ),
  ];

  return migrateVersion15(guestDemoStateV15Schema.parse({
    ...generated,
    version: 15,
    organizationName: state.organizationName,
    activeModule: state.activeModule,
    preferences: state.preferences,
    savedAnalyticsViews: state.savedAnalyticsViews,
    workspaceConfiguration: state.workspaceConfiguration,
    people: mergeById(state.people, generated.people),
    peopleEvents: mergeById(state.peopleEvents, generated.peopleEvents),
    projects: mergeById(state.projects, generated.projects),
    projectEvents: mergeById(state.projectEvents, generated.projectEvents),
    tasks: mergeById(state.tasks, generated.tasks),
    taskDependencies: mergeById(
      state.taskDependencies,
      generated.taskDependencies,
    ),
    taskComments: mergeById(state.taskComments, generated.taskComments),
    taskEvents: mergeById(state.taskEvents, generated.taskEvents),
    leaveRequests: mergeById(state.leaveRequests, generated.leaveRequests),
    leaveEvents: mergeById(state.leaveEvents, generated.leaveEvents),
    incidents: mergeById(state.incidents, generated.incidents),
    incidentEvents: mergeById(state.incidentEvents, generated.incidentEvents),
    treasuryEntries: mergeById(
      state.treasuryEntries,
      generated.treasuryEntries,
    ),
    treasuryEvents: mergeById(state.treasuryEvents, generated.treasuryEvents),
    payrollRuns: mergeById(state.payrollRuns, generated.payrollRuns),
    payrollParticipants: mergeById(
      state.payrollParticipants,
      generated.payrollParticipants,
    ),
    payrollEvents: mergeById(state.payrollEvents, generated.payrollEvents),
    integrationConnectors: mergeById(
      state.integrationConnectors,
      generated.integrationConnectors,
    ),
    integrationRuns: mergeById(
      state.integrationRuns,
      generated.integrationRuns,
    ),
    dataQualityIssues: mergeById(
      state.dataQualityIssues,
      generated.dataQualityIssues,
    ),
    changelogEntries: state.changelogEntries,
    changelogEvents: state.changelogEvents,
  }));
}

function migrateVersion15(
  state: z.infer<typeof guestDemoStateV15Schema>,
): GuestDemoState {
  const generated = addStandardScenario({
    ...initialGuestDemoStateBase,
    scenarioAnchorDate: state.scenarioAnchorDate,
    scenarioGeneratedThroughDate: state.scenarioGeneratedThroughDate,
  });
  const release = generated.changelogEntries.find(
    (entry) => entry.version === "1.3.0",
  );
  const releaseEvent = release
    ? generated.changelogEvents.find((event) => event.entryId === release.id)
    : null;

  return migrateVersion16(guestDemoStateV16Schema.parse({
    ...state,
    version: 16,
    changelogEntries:
      release &&
      !state.changelogEntries.some((entry) => entry.version === release.version)
        ? [...state.changelogEntries, release]
        : state.changelogEntries,
    changelogEvents:
      releaseEvent &&
      !state.changelogEvents.some((event) => event.id === releaseEvent.id)
        ? [...state.changelogEvents, releaseEvent]
        : state.changelogEvents,
  }));
}

function migrateVersion16(
  state: z.infer<typeof guestDemoStateV16Schema>,
): GuestDemoState {
  const generated = addStandardScenario({
    ...initialGuestDemoStateBase,
    scenarioAnchorDate: state.scenarioAnchorDate,
    scenarioGeneratedThroughDate: state.scenarioGeneratedThroughDate,
  });
  const release = generated.changelogEntries.find(
    (entry) => entry.version === "1.3.1",
  );
  const releaseEvent = release
    ? generated.changelogEvents.find((event) => event.entryId === release.id)
    : null;

  return migrateVersion17(guestDemoStateV17Schema.parse({
    ...state,
    version: 17,
    changelogEntries:
      release &&
      !state.changelogEntries.some((entry) => entry.version === release.version)
        ? [...state.changelogEntries, release]
        : state.changelogEntries,
    changelogEvents:
      releaseEvent &&
      !state.changelogEvents.some((event) => event.id === releaseEvent.id)
        ? [...state.changelogEvents, releaseEvent]
        : state.changelogEvents,
  }));
}

function migrateVersion17(
  state: z.infer<typeof guestDemoStateV17Schema>,
): GuestDemoState {
  const generated = addStandardScenario({
    ...initialGuestDemoStateBase,
    scenarioAnchorDate: state.scenarioAnchorDate,
    scenarioGeneratedThroughDate: state.scenarioGeneratedThroughDate,
  });
  const canonicalEntries = new Map(
    generated.changelogEntries.map((entry) => [entry.version, entry]),
  );
  const legacyCanonicalTitles = new Map([
    ["0.1.0", "Base de la plataforma"],
    ["0.2.0", "Gestión de vacaciones"],
    ["0.3.0", "Proyectos y tareas"],
    ["0.4.0", "Incidencias y personal"],
    ["0.5.0", "Tesorería y nóminas"],
    ["0.6.0", "Integraciones y automatización"],
    ["0.7.0", "Migración de datos"],
    ["1.0.0", "Primera versión estable"],
    ["1.1.0", "Analítica y experiencia de uso"],
    ["1.2.0", "Datos equilibrados y análisis dinámico"],
    ["1.2.1", "Ajustes finales de presentación"],
    ["1.2.2", "Interfaz y datos revisados"],
    ["1.3.0", "Tema y experiencia responsive"],
    ["1.3.1", "Corrección responsive y seguridad"],
  ]);
  const release = canonicalEntries.get("1.3.2");
  const releaseEvent = release
    ? generated.changelogEvents.find((event) => event.entryId === release.id)
    : null;

  return migrateVersion18(guestDemoStateV18Schema.parse({
    ...state,
    version: 18,
    changelogEntries: [
      ...state.changelogEntries.map((entry) => {
        const canonical = canonicalEntries.get(entry.version);
        const legacyTitle = legacyCanonicalTitles.get(entry.version);
        return canonical &&
          (entry.title === canonical.title || entry.title === legacyTitle)
          ? {
              ...entry,
              title: canonical.title,
              summary: canonical.summary,
            }
          : entry;
      }),
      ...(release &&
      !state.changelogEntries.some((entry) => entry.version === release.version)
        ? [release]
        : []),
    ],
    changelogEvents:
      releaseEvent &&
      !state.changelogEvents.some((event) => event.id === releaseEvent.id)
        ? [...state.changelogEvents, releaseEvent]
        : state.changelogEvents,
  }));
}

function migrateVersion18(
  state: z.infer<typeof guestDemoStateV18Schema>,
): GuestDemoState {
  const generated = addStandardScenario({
    ...initialGuestDemoStateBase,
    scenarioAnchorDate: state.scenarioAnchorDate,
    scenarioGeneratedThroughDate: state.scenarioGeneratedThroughDate,
  });
  const pendingVersions = new Set(["1.4.0", "1.4.1", "1.5.0", "1.5.1"]);
  const missingEntries = generated.changelogEntries.filter(
    (entry) =>
      pendingVersions.has(entry.version) &&
      !state.changelogEntries.some((current) => current.version === entry.version),
  );
  const missingEntryIds = new Set(missingEntries.map((entry) => entry.id));
  const missingEvents = generated.changelogEvents.filter(
    (event) =>
      missingEntryIds.has(event.entryId) &&
      !state.changelogEvents.some((current) => current.id === event.id),
  );

  return migrateVersion19(guestDemoStateV19Schema.parse({
    ...state,
    version: 19,
    changelogEntries: [...state.changelogEntries, ...missingEntries],
    changelogEvents: [...state.changelogEvents, ...missingEvents],
  }));
}

function migrateVersion19(
  state: z.infer<typeof guestDemoStateV19Schema>,
): GuestDemoState {
  const generated = addStandardScenario({
    ...initialGuestDemoStateBase,
    scenarioAnchorDate: state.scenarioAnchorDate,
    scenarioGeneratedThroughDate: state.scenarioGeneratedThroughDate,
  });
  const release = generated.changelogEntries.find((entry) => entry.version === "1.6.0");
  const releaseEvent = release
    ? generated.changelogEvents.find((event) => event.entryId === release.id)
    : null;
  return migrateVersion20(guestDemoStateV20Schema.parse({
    ...state,
    version: 20,
    changelogEntries: release && !state.changelogEntries.some((entry) => entry.version === release.version)
      ? [...state.changelogEntries, release]
      : state.changelogEntries,
    changelogEvents: releaseEvent && !state.changelogEvents.some((event) => event.id === releaseEvent.id)
      ? [...state.changelogEvents, releaseEvent]
      : state.changelogEvents,
  }));
}

function migrateVersion20(
  state: z.infer<typeof guestDemoStateV20Schema>,
): GuestDemoState {
  const generated = addStandardScenario({
    ...initialGuestDemoStateBase,
    scenarioAnchorDate: state.scenarioAnchorDate,
    scenarioGeneratedThroughDate: state.scenarioGeneratedThroughDate,
  });
  const release = generated.changelogEntries.find((entry) => entry.version === "1.7.0");
  const releaseEvent = release
    ? generated.changelogEvents.find((event) => event.entryId === release.id)
    : null;

  return guestDemoStateSchema.parse({
    ...state,
    version: 21,
    changelogEntries: release && !state.changelogEntries.some((entry) => entry.version === release.version)
      ? [...state.changelogEntries, release]
      : state.changelogEntries,
    changelogEvents: releaseEvent && !state.changelogEvents.some((event) => event.id === releaseEvent.id)
      ? [...state.changelogEvents, releaseEvent]
      : state.changelogEvents,
    ...createDefaultOperationsState(state.scenarioAnchorDate),
  });
}

const initialGuestDemoStateBase: GuestDemoState = {
  version: 21,
  scenarioVersion: 7,
  scenarioAnchorDate: getScenarioGeneratedThroughDate(),
  scenarioStartDate: SCENARIO_START_DATE,
  scenarioGeneratedThroughDate: getScenarioGeneratedThroughDate(),
  activeModule: "inicio",
  organizationName: "Organización Aurora",
  integrationConnectors: createDefaultIntegrationConnectors(),
  integrationRuns: [],
  payrollParticipants: [],
  dataQualityIssues: [],
  preferences: {
    simulatedRole: null,
    defaultDashboard: "analytics",
    theme: "light",
    density: "comfortable",
  },
  savedAnalyticsViews: [],
  workspaceConfiguration: structuredClone(defaultWorkspaceConfiguration),
  ...createDefaultOperationsState(getScenarioGeneratedThroughDate()),
  leaveRequests: [
    {
      id: "leave-001",
      employeeName: "Elena Martín",
      startDate: "2026-08-03",
      endDate: "2026-08-07",
      businessDays: 5,
      type: "vacation",
      reason: "Descanso anual planificado.",
      status: "submitted",
      createdAt: "2026-07-18T09:20:00.000Z",
      updatedAt: "2026-07-18T09:20:00.000Z",
    },
    {
      id: "leave-002",
      employeeName: "Diego Santos",
      startDate: "2026-07-24",
      endDate: "2026-07-24",
      businessDays: 1,
      type: "personal",
      reason: "Gestión personal programada.",
      status: "approved",
      createdAt: "2026-07-11T08:30:00.000Z",
      updatedAt: "2026-07-12T10:15:00.000Z",
    },
    {
      id: "leave-003",
      employeeName: "Marta Soler",
      startDate: "2026-09-14",
      endDate: "2026-09-18",
      businessDays: 5,
      type: "vacation",
      reason: "Descanso anual pendiente de revisión.",
      status: "draft",
      createdAt: "2026-07-19T12:05:00.000Z",
      updatedAt: "2026-07-19T12:05:00.000Z",
    },
  ],
  leaveEvents: [
    {
      id: "event-001",
      requestId: "leave-001",
      from: null,
      to: "submitted",
      note: "Solicitud registrada.",
      actorName: "Elena Martín",
      createdAt: "2026-07-18T09:20:00.000Z",
    },
    {
      id: "event-002",
      requestId: "leave-002",
      from: "submitted",
      to: "approved",
      note: "Cobertura del equipo validada.",
      actorName: "Lucía Martín",
      createdAt: "2026-07-12T10:15:00.000Z",
    },
  ],
  ...createInitialTaskState(),
  ...createInitialIncidentPeopleState(),
  ...createInitialProjectState(),
  ...createInitialChangelogSettingsState(),
  ...createInitialTreasuryState(),
  ...createInitialPayrollState(),
};

function addStandardScenario(base: GuestDemoState): GuestDemoState {
  const scenario = generateDemoScenario(
    "management-platform-standard-v7",
    base.scenarioGeneratedThroughDate,
  );
  const peopleById = new Map(
    scenario.people.map((person) => [person.id, person]),
  );
  const projectsById = new Map(
    scenario.projects.map((project) => [project.id, project]),
  );
  const taskEvents: TaskEvent[] = scenario.tasks.map((task) => ({
    id: `event-${task.id}`,
    taskId: task.id,
    kind: "created",
    fromStatus: null,
    toStatus: task.status,
    note: "Tarea incorporada a los datos iniciales.",
    actorName: "Sistema",
    createdAt: task.createdAt,
  }));
  const incidentEvents: IncidentEvent[] = scenario.incidents.map(
    (incident) => ({
      id: `event-${incident.id}`,
      incidentId: incident.id,
      kind: "created",
      fromStatus: null,
      toStatus: incident.status,
      note: "Incidencia incorporada a los datos iniciales.",
      actorName: "Sistema",
      createdAt: incident.createdAt,
    }),
  );

  return {
    ...base,
    version: 21,
    scenarioVersion: 7,
    scenarioAnchorDate: scenario.scenarioGeneratedThroughDate,
    scenarioStartDate: scenario.scenarioStartDate,
    scenarioGeneratedThroughDate: scenario.scenarioGeneratedThroughDate,
    people: [
      ...scenario.people.map((person) => ({
        ...person,
        createdAt: scenario.generatedAt,
        updatedAt: scenario.generatedAt,
      })),
    ],
    peopleEvents: [
      ...scenario.people.map((person) => ({
        id: `event-${person.id}`,
        personId: person.id,
        kind: "created" as const,
        note: "Perfil incorporado a los datos iniciales.",
        actorName: "Sistema",
        createdAt: scenario.generatedAt,
      })),
    ],
    projects: [
      ...scenario.projects.map((project) => ({
        ...project,
        ownerName:
          peopleById.get(project.ownerPersonId)?.displayName ?? null,
        createdAt: scenario.generatedAt,
        updatedAt: scenario.generatedAt,
      })),
    ],
    projectEvents: [
      ...scenario.projects.map((project) => ({
        id: `event-${project.id}`,
        projectId: project.id,
        kind: "created" as const,
        note: "Proyecto incorporado a los datos iniciales.",
        actorName: "Sistema",
        createdAt: scenario.generatedAt,
      })),
    ],
    tasks: [
      ...scenario.tasks.map((task) => ({
        ...task,
        projectName: projectsById.get(task.projectId)?.name ?? null,
      assigneeName: task.assigneePersonId
        ? peopleById.get(task.assigneePersonId)?.displayName ?? null
        : null,
        createdBy: "Sistema",
      })),
    ],
    taskDependencies: [
      ...scenario.taskDependencies.map((dependency) => ({
        ...dependency,
        createdAt: scenario.generatedAt,
      })),
    ],
    taskComments: [
      ...scenario.taskComments.map((comment) => ({
        id: comment.id,
        taskId: comment.taskId,
        authorName:
          peopleById.get(comment.authorPersonId)?.displayName ??
          "Persona sin asignar",
        body: comment.body,
        createdAt: comment.createdAt,
      })),
    ],
    taskEvents,
    leaveRequests: [
      ...scenario.leaveRequests.map((request) => ({
        id: request.id,
        employeeName:
          peopleById.get(request.personId)?.displayName ??
          "Persona sin asignar",
        startDate: request.startDate,
        endDate: request.endDate,
        businessDays: calculateBusinessDays(
          request.startDate,
          request.endDate,
        ),
        type: request.type,
        reason: request.reason,
        status: request.status,
        createdAt: scenario.generatedAt,
        updatedAt: scenario.generatedAt,
      })),
    ],
    leaveEvents: [
      ...scenario.leaveRequests.map((request) => ({
        id: `event-${request.id}`,
        requestId: request.id,
        from: null,
        to: request.status,
        note: "Solicitud incorporada a los datos iniciales.",
        actorName: "Sistema",
        createdAt: scenario.generatedAt,
      })),
    ],
    incidents: [
      ...scenario.incidents.map((incident) => ({
        ...incident,
        projectName:
          projectsById.get(incident.projectId)?.name ?? null,
        requesterName:
          peopleById.get(incident.requesterPersonId)?.displayName ??
          "Persona sin asignar",
        assigneeName: incident.assigneePersonId
          ? peopleById.get(incident.assigneePersonId)?.displayName ?? null
          : null,
      })),
    ],
    incidentEvents,
    treasuryEntries: [
      ...scenario.treasuryEntries.map((entry) => ({
        id: entry.id,
        entryDate: entry.entryDate,
        concept: entry.concept,
        category: entry.category,
        source: entry.source,
        amountCents: entry.amountCents,
        currency: entry.currency,
        status: entry.status,
        createdBy: entry.source,
        createdAt: scenario.generatedAt,
        updatedAt: scenario.generatedAt,
      })),
    ],
    treasuryEvents: [
      ...scenario.treasuryEntries.map((entry) => ({
        id: `event-${entry.id}`,
        entryId: entry.id,
        kind: "created" as const,
        fromStatus: null,
        toStatus: entry.status,
        note: `Importación completada desde ${entry.source}.`,
        actorName: "Integración programada",
        createdAt: scenario.generatedAt,
      })),
    ],
    payrollRuns: [
      ...scenario.payrollRuns.map((run) => ({
        ...run,
        notes:
          "Ciclo agregado sin retribuciones individuales.",
        createdBy: "Payroll Master",
        createdAt: scenario.generatedAt,
        updatedAt: scenario.generatedAt,
      })),
    ],
    payrollParticipants: [...scenario.payrollParticipants],
    payrollEvents: [
      ...scenario.payrollRuns.map((run) => ({
        id: `event-${run.id}`,
        runId: run.id,
        kind: "created" as const,
        fromStatus: null,
        toStatus: run.status,
        note: "Ciclo agregado incorporado por Payroll Master.",
        actorName: "Integración programada",
        createdAt: scenario.generatedAt,
      })),
    ],
    integrationRuns: [...scenario.integrationRuns],
    changelogEntries: [
      ...scenario.changelogEntries.map((entry) => ({
        ...entry,
        createdBy: "Equipo de producto",
        createdAt: scenario.generatedAt,
        updatedAt: entry.publishedAt ?? scenario.generatedAt,
      })),
    ],
    changelogEvents: [
      ...scenario.changelogEntries.map((entry) => ({
        id: `event-${entry.id}`,
        entryId: entry.id,
        fromStatus: null,
        toStatus: entry.status,
        note: "Entrada editorial incorporada a los datos iniciales.",
        actorName: "Sistema",
        createdAt: entry.publishedAt ?? scenario.generatedAt,
      })),
    ],
  };
}

export function createInitialGuestDemoState(
  anchorDate = getScenarioGeneratedThroughDate(),
) {
  return addStandardScenario({
    ...structuredClone(initialGuestDemoStateBase),
    scenarioAnchorDate: anchorDate,
    scenarioGeneratedThroughDate: anchorDate,
  });
}

export const initialGuestDemoState = createInitialGuestDemoState();

function stableId(prefix: string, state: GuestDemoState) {
  return `${prefix}-${String(
    state.leaveRequests.length +
      state.leaveEvents.length +
      state.tasks.length +
      state.taskDependencies.length +
      state.taskComments.length +
      state.taskEvents.length +
      state.incidents.length +
      state.incidentEvents.length +
      state.people.length +
      state.peopleEvents.length +
      state.projects.length +
      state.projectEvents.length +
      state.changelogEntries.length +
      state.changelogEvents.length +
      state.treasuryEntries.length +
      state.treasuryEvents.length +
      state.payrollRuns.length +
      state.payrollEvents.length +
      state.integrationRuns.length +
      state.dataQualityIssues.length +
      state.adminAuditEvents.length +
      1,
  ).padStart(3, "0")}`;
}

export function guestDemoReducer(
  state: GuestDemoState,
  action: GuestDemoAction,
): GuestDemoState {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "navigate":
      return { ...state, activeModule: action.module };
    case "create-leave": {
      const createdAt = new Date().toISOString();
      const id = stableId("leave", state);
      const request: LeaveRequest = {
        id,
        employeeName: "Usuario invitado",
        ...action.input,
        businessDays: calculateBusinessDays(
          action.input.startDate,
          action.input.endDate,
        ),
        status: "submitted",
        createdAt,
        updatedAt: createdAt,
      };

      return {
        ...state,
        leaveRequests: [request, ...state.leaveRequests],
        leaveEvents: [
          {
            id: stableId("event", state),
            requestId: id,
            from: null,
            to: "submitted",
            note: "Solicitud creada en modo invitado.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.leaveEvents,
        ],
      };
    }
    case "transition-leave": {
      const current = state.leaveRequests.find(
        (request) => request.id === action.requestId,
      );

      if (!current) return state;
      if (!canTransitionLeaveRequest(current.status, action.status)) return state;

      const createdAt = new Date().toISOString();
      const updated = transitionLeaveRequest(
        current,
        action.status,
        createdAt,
      );

      return {
        ...state,
        leaveRequests: state.leaveRequests.map((request) =>
          request.id === updated.id ? updated : request,
        ),
        leaveEvents: [
          {
            id: stableId("event", state),
            requestId: updated.id,
            from: current.status,
            to: updated.status,
            note: action.note,
            actorName: "Lucía Martín",
            createdAt,
          },
          ...state.leaveEvents,
        ],
      };
    }
    case "create-task": {
      const createdAt = new Date().toISOString();
      const id = stableId("task", state);
      const task: TaskItem = {
        id,
        ...action.input,
        projectId: action.input.projectId ?? null,
        projectName:
          state.projects.find(
            (project) => project.id === action.input.projectId,
          )?.name ?? null,
        assigneePersonId:
          state.people.find(
            (person) => person.displayName === action.input.assigneeName,
          )?.id ?? null,
        status: "pending",
        createdBy: "Usuario invitado",
        createdAt,
        updatedAt: createdAt,
      };
      const tasks = [task, ...state.tasks];
      return {
        ...state,
        tasks,
        projects: synchronizeProjectsWithTasks(
          state.projects,
          tasks,
          createdAt,
        ),
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: id,
            kind: "created",
            fromStatus: null,
            toStatus: "pending",
            note: "Tarea creada en modo invitado.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
      };
    }
    case "update-task": {
      const current = state.tasks.find((task) => task.id === action.taskId);
      if (!current) return state;
      const createdAt = new Date().toISOString();
      const assignmentChanged = current.assigneeName !== action.input.assigneeName;
      const tasks = state.tasks.map((task) =>
        task.id === action.taskId
          ? {
              ...task,
              ...action.input,
              projectId: action.input.projectId ?? null,
              projectName:
                state.projects.find(
                  (project) => project.id === action.input.projectId,
                )?.name ?? null,
              assigneePersonId:
                state.people.find(
                  (person) =>
                    person.displayName === action.input.assigneeName,
                )?.id ?? null,
              updatedAt: createdAt,
            }
          : task,
      );
      return {
        ...state,
        tasks,
        projects: synchronizeProjectsWithTasks(
          state.projects,
          tasks,
          createdAt,
        ),
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: action.taskId,
            kind: assignmentChanged ? "assigned" : "updated",
            fromStatus: current.status,
            toStatus: current.status,
            note: assignmentChanged
              ? `Responsable actualizado a ${action.input.assigneeName ?? "Sin asignar"}.`
              : "Datos de la tarea actualizados.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
      };
    }
    case "transition-task": {
      const current = state.tasks.find((task) => task.id === action.taskId);
      if (!current || !canTransitionTask(current.status, action.status)) return state;
      const createdAt = new Date().toISOString();
      const updated = transitionTask(current, action.status, createdAt);
      const tasks = state.tasks.map((task) =>
        task.id === action.taskId ? updated : task,
      );
      return {
        ...state,
        tasks,
        projects: synchronizeProjectsWithTasks(
          state.projects,
          tasks,
          createdAt,
        ),
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: action.taskId,
            kind: "status",
            fromStatus: current.status,
            toStatus: action.status,
            note: action.note.trim(),
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
      };
    }
    case "create-project": {
      const parsed = projectInputSchema.safeParse(action.input);
      if (
        !parsed.success ||
        state.projects.some((project) => project.code === parsed.data.code)
      ) {
        return state;
      }
      const createdAt = new Date().toISOString();
      const id = stableId("project", state);
      const owner =
        state.people.find(
          (person) => person.id === parsed.data.ownerPersonId,
        ) ?? null;
      return {
        ...state,
        projects: [
          {
            id,
            ...parsed.data,
            ownerName: owner?.displayName ?? null,
            createdAt,
            updatedAt: createdAt,
          },
          ...state.projects,
        ],
        projectEvents: [
          {
            id: stableId("project-event", state),
            projectId: id,
            kind: "created",
            note: "Proyecto creado en modo invitado.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.projectEvents,
        ],
      };
    }
    case "update-project": {
      const current = state.projects.find(
        (project) => project.id === action.projectId,
      );
      const parsed = projectInputSchema.safeParse(action.input);
      if (
        !current ||
        !parsed.success ||
        state.projects.some(
          (project) =>
            project.id !== action.projectId &&
            project.code === parsed.data.code,
        )
      ) {
        return state;
      }
      const createdAt = new Date().toISOString();
      const owner =
        state.people.find(
          (person) => person.id === parsed.data.ownerPersonId,
        ) ?? null;
      const kind: ProjectEvent["kind"] =
        current.status !== parsed.data.status
          ? "status"
          : current.health !== parsed.data.health
            ? "health"
            : "updated";
      const updatedProject = synchronizeProjectWithTasks(
        {
          ...current,
          ...parsed.data,
          ownerName: owner?.displayName ?? null,
          updatedAt: createdAt,
        },
        state.tasks,
        createdAt,
      );
      return {
        ...state,
        projects: state.projects.map((project) =>
          project.id === action.projectId
            ? updatedProject
            : project,
        ),
        projectEvents: [
          {
            id: stableId("project-event", state),
            projectId: action.projectId,
            kind,
            note:
              kind === "status"
                ? "Estado del proyecto actualizado."
                : kind === "health"
                  ? "Salud del proyecto actualizada."
                  : "Proyecto actualizado.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.projectEvents,
        ],
      };
    }
    case "add-task-comment": {
      if (!state.tasks.some((task) => task.id === action.taskId)) return state;
      const body = action.body.trim();
      if (body.length < 2 || body.length > 1_000) return state;
      const createdAt = new Date().toISOString();
      const mentionedPerson = action.mentionedPersonId
        ? state.people.find((person) => person.id === action.mentionedPersonId)
        : null;
      return {
        ...state,
        taskComments: [
          {
            id: stableId("comment", state),
            taskId: action.taskId,
            authorName: "Usuario invitado",
            body,
            createdAt,
          },
          ...state.taskComments,
        ],
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: action.taskId,
            kind: "comment",
            fromStatus: null,
            toStatus: null,
            note: "Comentario añadido.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
        operationalNotifications: mentionedPerson ? [{
          id: stableId("mention-notification", state),
          title: `Mención para ${mentionedPerson.displayName}`,
          description: state.tasks.find((task) => task.id === action.taskId)?.title ?? "Tarea",
          priority: "medium",
          status: "unread",
          source: "mention",
          href: `/app/tareas?focus=${action.taskId}`,
          createdAt,
        }, ...state.operationalNotifications] : state.operationalNotifications,
      };
    }
    case "add-task-dependency": {
      const exists = state.tasks.some((task) => task.id === action.taskId);
      const targetExists = state.tasks.some(
        (task) => task.id === action.dependsOnTaskId,
      );
      const duplicate = state.taskDependencies.some(
        (dependency) =>
          dependency.taskId === action.taskId &&
          dependency.dependsOnTaskId === action.dependsOnTaskId,
      );
      if (
        !exists ||
        !targetExists ||
        duplicate ||
        createsTaskDependencyCycle(
          state.taskDependencies,
          action.taskId,
          action.dependsOnTaskId,
        )
      ) {
        return state;
      }
      const createdAt = new Date().toISOString();
      const target = state.tasks.find(
        (task) => task.id === action.dependsOnTaskId,
      )!;
      return {
        ...state,
        taskDependencies: [
          {
            id: stableId("dependency", state),
            taskId: action.taskId,
            dependsOnTaskId: action.dependsOnTaskId,
            createdAt,
          },
          ...state.taskDependencies,
        ],
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: action.taskId,
            kind: "dependency",
            fromStatus: null,
            toStatus: null,
            note: `Dependencia añadida: ${target.title}.`,
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
      };
    }
    case "create-incident": {
      const createdAt = new Date().toISOString();
      const id = stableId("incident", state);
      const incident: Incident = {
        id,
        ...action.input,
        projectId: action.input.projectId ?? null,
        projectName:
          state.projects.find(
            (project) => project.id === action.input.projectId,
          )?.name ?? null,
        status: "registered",
        requesterPersonId: "person-001",
        requesterName: "Usuario invitado",
        assigneePersonId:
          state.people.find(
            (person) => person.displayName === action.input.assigneeName,
          )?.id ?? null,
        slaDueAt: calculateSyntheticSlaDueAt(action.input.priority, createdAt),
        resolution: null,
        createdAt,
        updatedAt: createdAt,
      };
      return {
        ...state,
        incidents: [incident, ...state.incidents],
        incidentEvents: [
          {
            id: stableId("incident-event", state),
            incidentId: id,
            kind: "created",
            fromStatus: null,
            toStatus: "registered",
            note: "Incidencia registrada en modo invitado.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.incidentEvents,
        ],
      };
    }
    case "update-incident": {
      const current = state.incidents.find((incident) => incident.id === action.incidentId);
      if (!current) return state;
      const createdAt = new Date().toISOString();
      const assignmentChanged = current.assigneeName !== action.input.assigneeName;
      const priorityChanged = current.priority !== action.input.priority;
      const kind: IncidentEvent["kind"] = assignmentChanged
        ? "assigned"
        : priorityChanged
          ? "priority"
          : "updated";
      return {
        ...state,
        incidents: state.incidents.map((incident) =>
          incident.id === action.incidentId
            ? {
                ...incident,
                ...action.input,
                projectId: action.input.projectId ?? null,
                projectName:
                  state.projects.find(
                    (project) => project.id === action.input.projectId,
                  )?.name ?? null,
                assigneePersonId:
                  state.people.find(
                    (person) =>
                      person.displayName === action.input.assigneeName,
                  )?.id ?? null,
                slaDueAt: priorityChanged
                  ? calculateSyntheticSlaDueAt(action.input.priority, incident.createdAt)
                  : incident.slaDueAt,
                updatedAt: createdAt,
              }
            : incident,
        ),
        incidentEvents: [
          {
            id: stableId("incident-event", state),
            incidentId: action.incidentId,
            kind,
            fromStatus: current.status,
            toStatus: current.status,
            note: assignmentChanged
              ? `Responsable actualizado a ${action.input.assigneeName ?? "Sin asignar"}.`
              : priorityChanged
                ? `Prioridad actualizada a ${action.input.priority}.`
                : "Datos de la incidencia actualizados.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.incidentEvents,
        ],
      };
    }
    case "transition-incident": {
      const current = state.incidents.find((incident) => incident.id === action.incidentId);
      if (
        !current ||
        !canTransitionIncident(current.status, action.status) ||
        (action.status === "assigned" && !current.assigneeName)
      ) return state;
      const createdAt = new Date().toISOString();
      const updated = transitionIncident(current, action.status, createdAt, action.note);
      return {
        ...state,
        incidents: state.incidents.map((incident) =>
          incident.id === action.incidentId ? updated : incident,
        ),
        incidentEvents: [
          {
            id: stableId("incident-event", state),
            incidentId: action.incidentId,
            kind: "status",
            fromStatus: current.status,
            toStatus: action.status,
            note: action.note.trim(),
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.incidentEvents,
        ],
      };
    }
    case "create-person": {
      const createdAt = new Date().toISOString();
      const id = stableId("person", state);
      return {
        ...state,
        people: [{ id, ...action.input, createdAt, updatedAt: createdAt }, ...state.people],
        peopleEvents: [
          {
            id: stableId("people-event", state),
            personId: id,
            kind: "created",
            note: "Perfil añadido al directorio.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.peopleEvents,
        ],
      };
    }
    case "update-person": {
      const current = state.people.find((person) => person.id === action.personId);
      if (!current) return state;
      const createdAt = new Date().toISOString();
      const kind: PersonEvent["kind"] =
        current.status !== action.input.status
          ? "status"
          : current.roleCode !== action.input.roleCode
            ? "role"
            : "updated";
      return {
        ...state,
        people: state.people.map((person) =>
          person.id === action.personId ? { ...person, ...action.input, updatedAt: createdAt } : person,
        ),
        peopleEvents: [
          {
            id: stableId("people-event", state),
            personId: action.personId,
            kind,
            note: "Perfil actualizado.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.peopleEvents,
        ],
      };
    }
    case "create-changelog": {
      const parsed = changelogInputSchema.safeParse(action.input);
      if (!parsed.success || state.changelogEntries.some((entry) => entry.version === parsed.data.version)) return state;
      const createdAt = new Date().toISOString();
      const id = stableId("changelog", state);
      return {
        ...state,
        changelogEntries: [{ id, ...parsed.data, status: "draft", createdBy: "Usuario invitado", publishedAt: null, createdAt, updatedAt: createdAt }, ...state.changelogEntries],
        changelogEvents: [{ id: stableId("changelog-event", state), entryId: id, fromStatus: null, toStatus: "draft", note: "Borrador creado en modo invitado.", actorName: "Usuario invitado", createdAt }, ...state.changelogEvents],
      };
    }
    case "update-changelog": {
      const parsed = changelogInputSchema.safeParse(action.input);
      const current = state.changelogEntries.find((entry) => entry.id === action.entryId);
      if (!parsed.success || !current || current.status === "published" || state.changelogEntries.some((entry) => entry.id !== action.entryId && entry.version === parsed.data.version)) return state;
      return { ...state, changelogEntries: state.changelogEntries.map((entry) => entry.id === action.entryId ? { ...entry, ...parsed.data, updatedAt: new Date().toISOString() } : entry) };
    }
    case "transition-changelog": {
      const current = state.changelogEntries.find((entry) => entry.id === action.entryId);
      if (!current || !canTransitionChangelog(current.status, action.status) || action.note.trim().length < 3) return state;
      const createdAt = new Date().toISOString();
      const updated = transitionChangelog(current, action.status, createdAt);
      return {
        ...state,
        changelogEntries: state.changelogEntries.map((entry) => entry.id === action.entryId ? updated : entry),
        changelogEvents: [{ id: stableId("changelog-event", state), entryId: action.entryId, fromStatus: current.status, toStatus: action.status, note: action.note.trim(), actorName: "Usuario invitado", createdAt }, ...state.changelogEvents],
      };
    }
    case "create-treasury": {
      const parsed = treasuryInputSchema.safeParse(action.input);
      if (!parsed.success) return state;
      const createdAt = new Date().toISOString();
      const id = stableId("treasury", state);
      const entry: TreasuryEntry = {
        id,
        ...parsed.data,
        status: "draft",
        createdBy: "Usuario invitado",
        createdAt,
        updatedAt: createdAt,
      };
      return {
        ...state,
        treasuryEntries: [entry, ...state.treasuryEntries],
        treasuryEvents: [{
          id: stableId("treasury-event", state), entryId: id, kind: "created", fromStatus: null,
          toStatus: "draft", note: "Movimiento creado.", actorName: "Usuario invitado", createdAt,
        }, ...state.treasuryEvents],
      };
    }
    case "update-treasury": {
      const parsed = treasuryInputSchema.safeParse(action.input);
      const current = state.treasuryEntries.find((entry) => entry.id === action.entryId);
      if (!parsed.success || !current || current.status !== "draft") return state;
      const createdAt = new Date().toISOString();
      return {
        ...state,
        treasuryEntries: state.treasuryEntries.map((entry) => entry.id === current.id ? { ...entry, ...parsed.data, updatedAt: createdAt } : entry),
        treasuryEvents: [{
          id: stableId("treasury-event", state), entryId: current.id, kind: "updated", fromStatus: "draft",
          toStatus: "draft", note: "Borrador actualizado.", actorName: "Usuario invitado", createdAt,
        }, ...state.treasuryEvents],
      };
    }
    case "transition-treasury": {
      const current = state.treasuryEntries.find((entry) => entry.id === action.entryId);
      if (!current || !canTransitionTreasury(current.status, action.status) || action.note.trim().length < 3) return state;
      const createdAt = new Date().toISOString();
      const entry = transitionTreasuryEntry(current, action.status, createdAt);
      return {
        ...state,
        treasuryEntries: state.treasuryEntries.map((item) => item.id === entry.id ? entry : item),
        treasuryEvents: [{
          id: stableId("treasury-event", state), entryId: entry.id, kind: "status", fromStatus: current.status,
          toStatus: action.status, note: action.note.trim(), actorName: "Usuario invitado", createdAt,
        }, ...state.treasuryEvents],
      };
    }
    case "create-payroll": {
      const parsed = payrollInputSchema.safeParse(action.input);
      if (!parsed.success || state.payrollRuns.some((run) => run.periodStart === parsed.data.periodStart && run.periodEnd === parsed.data.periodEnd)) return state;
      const createdAt = new Date().toISOString();
      const id = stableId("payroll", state);
      const run: PayrollRun = { id, ...parsed.data, netTotalCents: parsed.data.grossTotalCents - parsed.data.deductionTotalCents, status: "collecting", createdBy: "Usuario invitado", createdAt, updatedAt: createdAt };
      return { ...state, payrollRuns: [run, ...state.payrollRuns], payrollEvents: [{ id: stableId("payroll-event", state), runId: id, kind: "created", fromStatus: null, toStatus: "collecting", note: "Ciclo agregado creado.", actorName: "Usuario invitado", createdAt }, ...state.payrollEvents] };
    }
    case "update-payroll": {
      const parsed = payrollInputSchema.safeParse(action.input);
      const current = state.payrollRuns.find((run) => run.id === action.runId);
      if (!parsed.success || !current || current.status !== "collecting" || state.payrollRuns.some((run) => run.id !== current.id && run.periodStart === parsed.data.periodStart && run.periodEnd === parsed.data.periodEnd)) return state;
      const createdAt = new Date().toISOString();
      const updated = { ...current, ...parsed.data, netTotalCents: parsed.data.grossTotalCents - parsed.data.deductionTotalCents, updatedAt: createdAt };
      return { ...state, payrollRuns: state.payrollRuns.map((run) => run.id === current.id ? updated : run), payrollEvents: [{ id: stableId("payroll-event", state), runId: current.id, kind: "updated", fromStatus: "collecting", toStatus: "collecting", note: "Recopilación agregada actualizada.", actorName: "Usuario invitado", createdAt }, ...state.payrollEvents] };
    }
    case "transition-payroll": {
      const current = state.payrollRuns.find((run) => run.id === action.runId);
      if (!current || !canTransitionPayroll(current.status, action.status) || action.note.trim().length < 3) return state;
      const createdAt = new Date().toISOString();
      const updated = transitionPayrollRun(current, action.status, createdAt);
      return { ...state, payrollRuns: state.payrollRuns.map((run) => run.id === current.id ? updated : run), payrollEvents: [{ id: stableId("payroll-event", state), runId: current.id, kind: "status", fromStatus: current.status, toStatus: action.status, note: action.note.trim(), actorName: "Usuario invitado", createdAt }, ...state.payrollEvents] };
    }
    case "update-module-setting": {
      const current = state.moduleSettings.find((setting) => setting.moduleId === action.moduleId);
      if (!current || action.sortOrder < 0 || action.sortOrder >= state.moduleSettings.length || action.moduleId === "inicio" && !action.enabled) return state;
      const reordered = [...state.moduleSettings].sort((a, b) => a.sortOrder - b.sortOrder);
      const fromIndex = reordered.findIndex((setting) => setting.moduleId === action.moduleId);
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(action.sortOrder, 0, { ...moved, enabled: action.enabled });
      const createdAt = new Date().toISOString();
      return {
        ...state,
        moduleSettings: reordered.map((setting, sortOrder) => ({ ...setting, sortOrder })),
        adminAuditEvents: [{ id: stableId("admin-audit", state), eventType: "module.updated", entityType: "module", entityId: action.moduleId, actorName: "Usuario invitado", summary: `Módulo ${action.moduleId} actualizado.`, createdAt }, ...state.adminAuditEvents],
      };
    }
    case "update-role-metadata": {
      const parsed = roleMetadataSchema.safeParse({ name: action.name, color: action.color });
      if (!parsed.success || !state.roles.some((role) => role.id === action.roleId)) return state;
      const createdAt = new Date().toISOString();
      return { ...state, roles: state.roles.map((role) => role.id === action.roleId ? { ...role, ...parsed.data } : role), adminAuditEvents: [{ id: stableId("admin-audit", state), eventType: "role.metadata_updated", entityType: "role", entityId: action.roleId, actorName: "Usuario invitado", summary: "Nombre o color del rol actualizado sin alterar permisos.", createdAt }, ...state.adminAuditEvents] };
    }
    case "update-role-permissions": {
      const parsed = rolePermissionsSchema.safeParse(action.permissionCodes);
      const role = state.roles.find((item) => item.id === action.roleId);
      if (!parsed.success || !role || role.code === "admin") return state;
      const createdAt = new Date().toISOString();
      return { ...state, roles: state.roles.map((item) => item.id === action.roleId ? { ...item, permissionCodes: [...new Set(parsed.data)] } : item), adminAuditEvents: [{ id: stableId("admin-audit", state), eventType: "role.permissions_updated", entityType: "role", entityId: action.roleId, actorName: "Usuario invitado", summary: "Matriz de permisos del rol actualizada.", createdAt }, ...state.adminAuditEvents] };
    }
    case "create-invitation": {
      const parsed = invitationInputSchema.safeParse({ email: action.email, roleId: action.roleId });
      if (!parsed.success || !state.roles.some((role) => role.id === parsed.data.roleId)) return state;
      const createdAt = new Date().toISOString();
      const id = stableId("invitation", state);
      return { ...state, invitations: [{ id, ...parsed.data, status: "pending", expiresAt: new Date(new Date(createdAt).getTime() + 14 * 86_400_000).toISOString(), createdAt }, ...state.invitations], adminAuditEvents: [{ id: stableId("admin-audit", state), eventType: "invitation.created", entityType: "invitation", entityId: id, actorName: "Usuario invitado", summary: "Invitación creada.", createdAt }, ...state.adminAuditEvents] };
    }
    case "update-membership": {
      const membership = state.memberships.find((item) => item.id === action.membershipId);
      if (!membership || !state.roles.some((role) => role.id === action.roleId)) return state;
      const createdAt = new Date().toISOString();
      return { ...state, memberships: state.memberships.map((item) => item.id === action.membershipId ? { ...item, roleId: action.roleId, status: action.status } : item), adminAuditEvents: [{ id: stableId("admin-audit", state), eventType: "membership.updated", entityType: "membership", entityId: action.membershipId, actorName: "Usuario invitado", summary: "Rol o estado de acceso actualizado.", createdAt }, ...state.adminAuditEvents] };
    }
    case "rename-organization":
      return {
        ...state,
        organizationName: action.name.trim() || state.organizationName,
        adminAuditEvents: action.name.trim()
          ? [{ id: stableId("admin-audit", state), eventType: "organization.renamed", entityType: "organization", entityId: null, actorName: "Usuario invitado", summary: "Identidad de la organización actualizada.", createdAt: new Date().toISOString() }, ...state.adminAuditEvents]
          : state.adminAuditEvents,
      };
    case "simulate-integration": {
      const connector = state.integrationConnectors.find(
        (item) => item.id === action.connectorId && item.enabled,
      );
      if (!connector) return state;
      const { run, issue } = simulateGuestIntegrationRun(
        connector,
        state.integrationRuns,
      );
      return {
        ...state,
        integrationConnectors: state.integrationConnectors.map((item) =>
          item.id === connector.id
            ? { ...item, lastRunAt: run.finishedAt }
            : item,
        ),
        integrationRuns: [run, ...state.integrationRuns],
        dataQualityIssues: issue
          ? [issue, ...state.dataQualityIssues]
          : state.dataQualityIssues,
      };
    }
    case "update-preferences":
      return { ...state, preferences: action.preferences };
    case "save-analytics-view":
      return {
        ...state,
        savedAnalyticsViews: [
          action.view,
          ...state.savedAnalyticsViews.filter(
            (view) => view.id !== action.view.id,
          ),
        ],
      };
    case "create-automation-rule": {
      const parsed = automationRuleInputSchema.safeParse(action.input);
      if (!parsed.success) return state;
      return {
        ...state,
        automationRules: [{ id: stableId("automation-rule", state), ...parsed.data, enabled: true, lastRunAt: null }, ...state.automationRules],
      };
    }
    case "toggle-automation-rule":
      return { ...state, automationRules: state.automationRules.map((rule) => rule.id === action.ruleId ? { ...rule, enabled: action.enabled } : rule) };
    case "run-automation-rule": {
      const rule = state.automationRules.find((item) => item.id === action.ruleId && item.enabled);
      if (!rule) return state;
      const createdAt = new Date().toISOString();
      return {
        ...state,
        automationRules: state.automationRules.map((item) => item.id === rule.id ? { ...item, lastRunAt: createdAt } : item),
        automationRuns: [{ id: `${rule.id}-${createdAt}`, ruleId: rule.id, status: "succeeded", summary: `Acción preparada: ${rule.name}.`, createdAt }, ...state.automationRuns],
        operationalNotifications: [{ id: `notification-${rule.id}-${createdAt}`, title: "Automatización preparada", description: rule.name, priority: "medium", status: "unread", source: "automation", href: "/app/operaciones", createdAt }, ...state.operationalNotifications],
      };
    }
    case "apply-project-template": {
      const template = state.projectTemplates.find((item) => item.id === action.templateId);
      if (!template) return state;
      const createdAt = new Date().toISOString();
      const projectId = `template-project-${template.id}-${state.projects.length + 1}`;
      const code = `TPL-${String(state.projects.length + 1).padStart(3, "0")}`;
      const project = {
        id: projectId, code, name: template.name, summary: template.description,
        status: "active" as const, health: "on_track" as const,
        ownerPersonId: null, ownerName: null, startDate: createdAt.slice(0, 10),
        targetDate: new Date(Date.parse(createdAt) + template.durationDays * 86_400_000).toISOString().slice(0, 10),
        color: "#2563eb", memberIds: [], createdAt, updatedAt: createdAt,
      };
      const tasks = Array.from({ length: template.taskCount }, (_, index) => ({
        id: `${projectId}-task-${index + 1}`, title: `${template.name}: paso ${index + 1}`,
        description: "Tarea generada desde una plantilla operativa.", status: "pending" as const,
        priority: "medium" as const, projectId, projectName: template.name,
        assigneePersonId: null, assigneeName: null,
        dueDate: new Date(Date.parse(createdAt) + (index + 1) * 86_400_000).toISOString().slice(0, 10),
        createdBy: "Usuario invitado", createdAt, updatedAt: createdAt,
      }));
      return { ...state, projects: [project, ...state.projects], tasks: [...tasks, ...state.tasks] };
    }
    case "add-capacity-allocation": {
      const person = state.people.find((item) => item.id === action.input.personId);
      const project = state.projects.find((item) => item.id === action.input.projectId);
      if (!person || !project) return state;
      const parsed = capacityAllocationSchema.safeParse({ id: stableId("capacity", state), ...action.input, personName: person.displayName, projectName: project.name });
      return parsed.success ? { ...state, capacityAllocations: [parsed.data, ...state.capacityAllocations] } : state;
    }
    case "mark-notification":
      return { ...state, operationalNotifications: state.operationalNotifications.map((notification) => notification.id === action.notificationId ? { ...notification, status: action.status } : notification) };
    case "create-export-job": {
      if (!exportTargets.includes(action.input.target) || action.input.name.trim().length < 3) return state;
      const createdAt = new Date().toISOString();
      return { ...state, exportJobs: [{ id: `export-${state.exportJobs.length + 1}-${createdAt}`, name: action.input.name.trim(), moduleId: action.input.moduleId, target: action.input.target, status: action.input.target === "csv" || action.input.target === "xlsx" ? "ready" : "pending", rowCount: 48, createdAt, externalUrl: null }, ...state.exportJobs] };
    }
    case "disconnect-workspace":
      return { ...state, workspaceConnections: state.workspaceConnections.map((connection) => connection.provider === action.provider ? { ...connection, status: "simulated", connectedAt: null } : connection) };
    case "update-workspace-configuration": {
      const parsed = workspaceConfigurationSchema.safeParse(
        action.configuration,
      );
      if (!parsed.success) return state;
      return {
        ...state,
        workspaceConfiguration: parsed.data,
        adminAuditEvents: [
          {
            id: stableId("audit", state),
            eventType: "settings.configuration.updated",
            entityType: "workspace_configuration",
            entityId: null,
            actorName: "Usuario invitado",
            summary: "Políticas operativas actualizadas",
            createdAt: new Date().toISOString(),
          },
          ...state.adminAuditEvents,
        ],
      };
    }
    case "reset":
      return createInitialGuestDemoState();
    default:
      return state;
  }
}

export interface GuestDemoRepository {
  load(): GuestDemoState;
  save(state: GuestDemoState): void;
  reset(): GuestDemoState;
}
