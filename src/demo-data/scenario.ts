import { z } from "zod";
import {
  syntheticIncidentCatalog,
  syntheticPeopleCatalog,
  syntheticProjectCatalog,
  syntheticTaskActions,
  syntheticTreasuryConcepts,
} from "@/demo-data/catalog";

export const SCENARIO_START_DATE = "2025-01-01";
export const SCENARIO_TIME_ZONE = "Europe/Madrid";

export function getScenarioGeneratedThroughDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SCENARIO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  const today = new Date(
    Date.UTC(Number(value.year), Number(value.month) - 1, Number(value.day)),
  );
  today.setUTCDate(today.getUTCDate() - 1);
  return today.toISOString().slice(0, 10);
}

export const SCENARIO_REFERENCE_DATE = getScenarioGeneratedThroughDate();

export const STANDARD_SCENARIO_COUNTS = {
  people: 266,
  teams: 6,
  projects: 10,
  tasksPerActivePerson: 0.3,
  leaveRequestsPerActivePerson: 0.035,
  incidentsPerActivePerson: 0.02,
  treasuryEntriesPerActivePerson: 0.1,
  minimumTreasuryEntriesPerMonth: 20,
  integrationRunsPerMonth: 4,
  changelogEntries: 14,
} as const;

function dateFromOffset(startDate: string, offset: number) {
  const date = new Date(`${startDate}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function employmentPeriodForIndex(index: number) {
  if (index < 100) {
    return {
      employmentStartDate: SCENARIO_START_DATE,
      employmentEndDate:
        index >= 97 && index <= 99
          ? dateFromOffset("2025-08-04", index - 97)
          : null,
    };
  }

  if (index < 145) {
    return {
      employmentStartDate: dateFromOffset(
        "2025-01-02",
        Math.floor(((index - 100) * 178) / 44),
      ),
      employmentEndDate: null,
    };
  }

  if (index < 183) {
    return {
      employmentStartDate: dateFromOffset(
        "2025-09-01",
        Math.floor(((index - 145) * 120) / 37),
      ),
      employmentEndDate:
        index >= 176 && index <= 178
          ? dateFromOffset("2026-04-13", index - 176)
          : null,
    };
  }

  if (index < 218) {
    return {
      employmentStartDate: dateFromOffset(
        "2026-01-02",
        Math.floor(((index - 183) * 87) / 34),
      ),
      employmentEndDate: null,
    };
  }

  if (index < 256) return {
    employmentStartDate: dateFromOffset(
      "2026-05-01",
      Math.floor(((index - 218) * 59) / 37),
    ),
    employmentEndDate:
      index >= 246
        ? dateFromOffset("2026-07-05", (index - 246) * 7)
        : null,
  };

  const postJuneIndex = index - 256;
  return {
    employmentStartDate: dateFromOffset("2026-07-03", postJuneIndex * 7),
    employmentEndDate: null,
  };
}

export type DemoScenarioDefinition = {
  scenarioVersion: 7;
  seed: string;
  anchorDate: string;
  scenarioStartDate: string;
  scenarioGeneratedThroughDate: string;
  generatedAt: string;
  people: Array<{
    id: string;
    displayName: string;
    team: string;
    positionTitle: string;
    managerPersonId: string | null;
    employmentStartDate: string;
    employmentEndDate: string | null;
    employmentContractType:
      | "indefinite_ordinary"
      | "permanent_discontinuous"
      | "temporary_production"
      | "temporary_substitution";
    status: "invited" | "active" | "suspended" | "inactive";
    roleCode: "admin" | "manager" | "collaborator" | "viewer";
  }>;
  projects: Array<{
    id: string;
    code: string;
    name: string;
    summary: string;
    status: "planned" | "active" | "on_hold" | "completed" | "cancelled";
    health: "on_track" | "at_risk" | "off_track";
    ownerPersonId: string;
    memberIds: string[];
    startDate: string;
    targetDate: string;
    color: string;
  }>;
  tasks: Array<{
    id: string;
    projectId: string;
    title: string;
    description: string;
    status:
      | "pending"
      | "in_progress"
      | "blocked"
      | "in_review"
      | "completed";
    priority: "low" | "medium" | "high" | "urgent";
    assigneePersonId: string | null;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  taskDependencies: Array<{
    id: string;
    taskId: string;
    dependsOnTaskId: string;
  }>;
  taskComments: Array<{
    id: string;
    taskId: string;
    authorPersonId: string;
    body: string;
    createdAt: string;
  }>;
  leaveRequests: Array<{
    id: string;
    personId: string;
    startDate: string;
    endDate: string;
    type: "vacation" | "personal";
    reason: string;
    status: "draft" | "submitted" | "approved" | "rejected" | "cancelled";
  }>;
  incidents: Array<{
    id: string;
    projectId: string;
    requesterPersonId: string;
    assigneePersonId: string | null;
    title: string;
    description: string;
    status:
      | "registered"
      | "triaged"
      | "assigned"
      | "investigating"
      | "resolved"
      | "closed";
    priority: "low" | "medium" | "high" | "critical";
    category: "access" | "data" | "hardware" | "software" | "other";
    affectedService: string;
    impactScope: "individual" | "team" | "workspace";
    detectionChannel: "monitoring" | "support" | "team" | "automation";
    rootCause: string | null;
    firstResponseAt: string | null;
    correctiveTaskId: string | null;
    slaDueAt: string;
    resolution: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  treasuryEntries: Array<{
    id: string;
    source: "Financial Source A" | "Financial Source B";
    sourceSequence: number;
    entryDate: string;
    concept: string;
    category: string;
    amountCents: number;
    currency: "EUR";
    status: "draft" | "registered" | "reconciled" | "validated" | "closed";
  }>;
  payrollRuns: Array<{
    id: string;
    periodStart: string;
    periodEnd: string;
    peopleCount: number;
    grossTotalCents: number;
    deductionTotalCents: number;
    netTotalCents: number;
    employerCostTotalCents: number;
    currency: "EUR";
    status:
      | "collecting"
      | "validating"
      | "calculated"
      | "reviewed"
      | "closed";
  }>;
  payrollParticipants: Array<{
    id: string;
    runId: string;
    personId: string;
    personName: string;
    team: string;
    positionTitle: string;
    inclusionStatus: "included" | "excluded";
    validationStatus: "validated" | "pending" | "review";
  }>;
  integrationRuns: Array<{
    id: string;
    connectorId: string;
    effectiveDate: string;
    status: "succeeded" | "partial" | "failed";
    triggerKind: "schedule";
    sourceSequence: number;
    processedCount: number;
    importedCount: number;
    duplicateCount: number;
    errorCount: number;
    safeSummary: string;
    startedAt: string;
    finishedAt: string;
  }>;
  changelogEntries: Array<{
    id: string;
    version: string;
    title: string;
    summary: string;
    status: "draft" | "in_review" | "published";
    publishedAt: string | null;
  }>;
};

const isoDateSchema = z.iso.date();
const scenarioSchema = z.object({
  scenarioVersion: z.literal(7),
  seed: z.string().min(1),
  anchorDate: isoDateSchema,
  scenarioStartDate: isoDateSchema,
  scenarioGeneratedThroughDate: isoDateSchema,
  generatedAt: z.iso.datetime(),
  people: z.array(z.object({
    id: z.uuid(), displayName: z.string().min(2), team: z.string().min(2),
    positionTitle: z.string().min(2), managerPersonId: z.uuid().nullable(),
    employmentStartDate: isoDateSchema,
    employmentEndDate: isoDateSchema.nullable(),
    employmentContractType: z.enum([
      "indefinite_ordinary",
      "permanent_discontinuous",
      "temporary_production",
      "temporary_substitution",
    ]),
    status: z.enum(["invited", "active", "suspended", "inactive"]),
    roleCode: z.enum(["admin", "manager", "collaborator", "viewer"]),
  })).min(100),
  projects: z.array(z.object({
    id: z.uuid(), code: z.string(), name: z.string(), summary: z.string(),
    status: z.enum(["planned", "active", "on_hold", "completed", "cancelled"]),
    health: z.enum(["on_track", "at_risk", "off_track"]), ownerPersonId: z.uuid(),
    memberIds: z.array(z.uuid()), startDate: isoDateSchema, targetDate: isoDateSchema,
    color: z.string().regex(/^#[0-9a-f]{6}$/),
  })).length(STANDARD_SCENARIO_COUNTS.projects),
  tasks: z.array(z.object({
    id: z.uuid(), projectId: z.uuid(), title: z.string(), description: z.string(),
    status: z.enum(["pending", "in_progress", "blocked", "in_review", "completed"]),
    priority: z.enum(["low", "medium", "high", "urgent"]), assigneePersonId: z.uuid().nullable(),
    dueDate: isoDateSchema.nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  })).min(1),
  taskDependencies: z.array(z.object({
    id: z.uuid(), taskId: z.uuid(), dependsOnTaskId: z.uuid(),
  })),
  taskComments: z.array(z.object({
    id: z.uuid(), taskId: z.uuid(), authorPersonId: z.uuid(), body: z.string(), createdAt: z.iso.datetime(),
  })),
  leaveRequests: z.array(z.object({
    id: z.uuid(), personId: z.uuid(), startDate: isoDateSchema, endDate: isoDateSchema,
    type: z.enum(["vacation", "personal"]),
    reason: z.string(), status: z.enum(["draft", "submitted", "approved", "rejected", "cancelled"]),
  })).min(1),
  incidents: z.array(z.object({
    id: z.uuid(), projectId: z.uuid(), requesterPersonId: z.uuid(), assigneePersonId: z.uuid().nullable(),
    title: z.string(), description: z.string(),
    status: z.enum(["registered", "triaged", "assigned", "investigating", "resolved", "closed"]),
    priority: z.enum(["low", "medium", "high", "critical"]),
    category: z.enum(["access", "data", "hardware", "software", "other"]),
    affectedService: z.string().min(2),
    impactScope: z.enum(["individual", "team", "workspace"]),
    detectionChannel: z.enum(["monitoring", "support", "team", "automation"]),
    rootCause: z.string().nullable(),
    firstResponseAt: z.iso.datetime().nullable(),
    correctiveTaskId: z.uuid().nullable(),
    slaDueAt: z.iso.datetime(), resolution: z.string().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  })).min(1),
  treasuryEntries: z.array(z.object({
    id: z.uuid(), source: z.enum(["Financial Source A", "Financial Source B"]),
    sourceSequence: z.number().int().positive(), entryDate: isoDateSchema,
    concept: z.string(), category: z.string(), amountCents: z.number().int(), currency: z.literal("EUR"),
    status: z.enum(["draft", "registered", "reconciled", "validated", "closed"]),
  })).min(1),
  payrollRuns: z.array(z.object({
    id: z.uuid(), periodStart: isoDateSchema, periodEnd: isoDateSchema,
    peopleCount: z.number().int().positive(), grossTotalCents: z.number().int().positive(),
    deductionTotalCents: z.number().int().nonnegative(), netTotalCents: z.number().int().positive(),
    employerCostTotalCents: z.number().int().positive(),
    currency: z.literal("EUR"),
    status: z.enum(["collecting", "validating", "calculated", "reviewed", "closed"]),
  })).min(1),
  payrollParticipants: z.array(z.object({
    id: z.uuid(), runId: z.uuid(), personId: z.uuid(), personName: z.string().min(2),
    team: z.string().min(2), positionTitle: z.string().min(2),
    inclusionStatus: z.enum(["included", "excluded"]),
    validationStatus: z.enum(["validated", "pending", "review"]),
  })).min(1),
  integrationRuns: z.array(z.object({
    id: z.uuid(), connectorId: z.string().min(3), effectiveDate: isoDateSchema,
    status: z.enum(["succeeded", "partial", "failed"]), triggerKind: z.literal("schedule"),
    sourceSequence: z.number().int().positive(), processedCount: z.number().int().nonnegative(),
    importedCount: z.number().int().nonnegative(), duplicateCount: z.number().int().nonnegative(),
    errorCount: z.number().int().nonnegative(), safeSummary: z.string().min(3),
    startedAt: z.iso.datetime(), finishedAt: z.iso.datetime(),
  })).min(1),
  changelogEntries: z.array(z.object({
    id: z.uuid(), version: z.string(), title: z.string(), summary: z.string(),
    status: z.enum(["draft", "in_review", "published"]), publishedAt: z.iso.datetime().nullable(),
  })).length(STANDARD_SCENARIO_COUNTS.changelogEntries),
});

function hashText(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function createRandom(seed: string) {
  let value = hashText(seed);
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function deterministicUuid(seed: string, namespace: string, index: number) {
  const parts = Array.from({ length: 4 }, (_, part) =>
    hashText(`${seed}:${namespace}:${index}:${part}`)
      .toString(16)
      .padStart(8, "0"),
  ).join("");
  return `${parts.slice(0, 8)}-${parts.slice(8, 12)}-4${parts.slice(13, 16)}-a${parts.slice(17, 20)}-${parts.slice(20, 32)}`;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addMonths(value: string, months: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCMonth(date.getUTCMonth() + months, 1);
  return date.toISOString().slice(0, 10);
}

function getScenarioMonthStarts(anchorDate: string) {
  const months: string[] = [];
  let monthStart = SCENARIO_START_DATE;
  const anchorMonth = `${anchorDate.slice(0, 7)}-01`;
  while (monthStart <= anchorMonth) {
    months.push(monthStart);
    monthStart = addMonths(monthStart, 1);
  }
  return months;
}

export function getScenarioPeriodCounts(anchorDate = SCENARIO_REFERENCE_DATE) {
  const months = getScenarioMonthStarts(anchorDate);
  const activeAt = (date: string) =>
    Array.from({ length: STANDARD_SCENARIO_COUNTS.people }, (_, index) =>
      employmentPeriodForIndex(index),
    ).filter(
      (period) =>
        period.employmentStartDate <= date &&
        (period.employmentEndDate === null ||
          period.employmentEndDate > date),
    ).length;
  const monthMetrics = months.map((monthStart) => {
    const periodEnd = notAfter(addDays(addMonths(monthStart, 1), -1), anchorDate);
    const activePeople = activeAt(periodEnd);
    const month = Number(monthStart.slice(5, 7));
    const leaveSeasonality =
      month === 7 || month === 8 ? 2 : month === 12 ? 1.6 : 1;
    return {
      activePeople,
      tasks: Math.max(
        1,
        Math.round(activePeople * STANDARD_SCENARIO_COUNTS.tasksPerActivePerson),
      ),
      leaveRequests: Math.max(
        1,
        Math.round(
          activePeople *
            STANDARD_SCENARIO_COUNTS.leaveRequestsPerActivePerson *
            leaveSeasonality,
        ),
      ),
      incidents: Math.max(
        2,
        Math.round(
          activePeople *
            STANDARD_SCENARIO_COUNTS.incidentsPerActivePerson,
        ),
      ),
      treasuryEntries: Math.max(
        STANDARD_SCENARIO_COUNTS.minimumTreasuryEntriesPerMonth,
        Math.round(
          activePeople *
            STANDARD_SCENARIO_COUNTS.treasuryEntriesPerActivePerson,
        ),
      ),
    };
  });
  return {
    months: months.length,
    tasks: monthMetrics.reduce((total, month) => total + month.tasks, 0),
    leaveRequests: monthMetrics.reduce(
      (total, month) => total + month.leaveRequests,
      0,
    ),
    incidents: monthMetrics.reduce(
      (total, month) => total + month.incidents,
      0,
    ),
    treasuryEntries: monthMetrics.reduce(
      (total, month) => total + month.treasuryEntries,
      0,
    ),
    payrollRuns: months.length,
    integrationRuns:
      months.length * STANDARD_SCENARIO_COUNTS.integrationRunsPerMonth,
    monthMetrics,
  };
}

function isPersonActiveOnDate(
  person: DemoScenarioDefinition["people"][number],
  date: string,
) {
  return (
    person.employmentStartDate <= date &&
    (person.employmentEndDate === null || person.employmentEndDate > date)
  );
}

export function countActivePeopleOnDate(
  people: DemoScenarioDefinition["people"],
  date: string,
) {
  return people.filter((person) => isPersonActiveOnDate(person, date)).length;
}

function isoAt(value: string, hour = 9) {
  return `${value}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

function notAfter(value: string, maximum: string) {
  return value <= maximum ? value : maximum;
}

function pick<T>(items: readonly T[], index: number) {
  return items[index % items.length]!;
}

export function generateDemoScenario(
  seed = "management-platform-standard-v7",
  anchorDate = SCENARIO_REFERENCE_DATE,
): DemoScenarioDefinition {
  const random = createRandom(seed);
  const people: DemoScenarioDefinition["people"] = Array.from(
    { length: STANDARD_SCENARIO_COUNTS.people },
    (_, index) => {
      const baseProfile = syntheticPeopleCatalog[index % syntheticPeopleCatalog.length]!;
      const surnameProfile =
        syntheticPeopleCatalog[
          (index + Math.floor(index / syntheticPeopleCatalog.length) * 7) %
            syntheticPeopleCatalog.length
        ]!;
      const displayName =
        index < syntheticPeopleCatalog.length
          ? baseProfile[0]
          : `${baseProfile[0].split(" ")[0]} ${surnameProfile[0].split(" ").at(-1)}`;
      const [, team, positionTitle] = baseProfile;
      const employmentPeriod = employmentPeriodForIndex(index);
      const hasStarted = employmentPeriod.employmentStartDate <= anchorDate;
      const hasEnded =
        employmentPeriod.employmentEndDate !== null &&
        employmentPeriod.employmentEndDate <= anchorDate;
      return {
        id: deterministicUuid(seed, "person", index),
        displayName,
        team,
        positionTitle,
        managerPersonId:
          index === 0
            ? null
            : deterministicUuid(seed, "person", index < 6 ? 0 : index % 6),
        employmentContractType:
          index % 32 < 23
            ? "indefinite_ordinary"
            : index % 32 < 26
              ? "permanent_discontinuous"
              : index % 32 < 30
                ? "temporary_production"
                : "temporary_substitution",
        employmentStartDate: employmentPeriod.employmentStartDate,
        employmentEndDate: employmentPeriod.employmentEndDate,
        status: !hasStarted ? "invited" : hasEnded ? "inactive" : "active",
        roleCode:
          index === 0
            ? "admin"
            : index < 6
              ? "manager"
              : index > 28
                ? "viewer"
                : "collaborator",
      };
    },
  );
  const projectStatuses = ["active", "active", "active", "active", "active", "on_hold", "completed", "completed", "completed", "planned"] as const;
  const projectHealth = ["on_track", "on_track", "on_track", "on_track", "at_risk", "off_track", "on_track", "on_track", "on_track", "on_track"] as const;
  const colors = ["#4f46e5", "#0d9488", "#d97706", "#2563eb", "#7c3aed", "#0891b2", "#16a34a", "#dc2626", "#0f766e", "#9333ea", "#0369a1", "#c2410c"];
  const monthStarts = getScenarioMonthStarts(anchorDate);
  const projects: DemoScenarioDefinition["projects"] = Array.from({ length: STANDARD_SCENARIO_COUNTS.projects }, (_, index) => {
    const startDate = addDays(SCENARIO_START_DATE, index * 36);
    const [code, name, summary] = syntheticProjectCatalog[index]!;
    return {
      id: deterministicUuid(seed, "project", index),
      code,
      name,
      summary,
      status: projectStatuses[index]!,
      health: projectHealth[index]!,
      ownerPersonId: people[index % 4]!.id,
      memberIds: Array.from({ length: 6 }, (_, member) => people[(index * 3 + member) % people.length]!.id),
      startDate,
      targetDate: notAfter(addDays(startDate, 120 + index * 8), anchorDate),
      color: colors[index]!,
    };
  });
  const taskBlueprints = monthStarts.flatMap((monthStart, monthIndex) => {
    const periodEnd = notAfter(addDays(addMonths(monthStart, 1), -1), anchorDate);
    const availableDays =
      Math.floor(
        (new Date(`${periodEnd}T12:00:00.000Z`).getTime() -
          new Date(`${monthStart}T12:00:00.000Z`).getTime()) /
          86_400_000,
      ) + 1;
    const activePeople = countActivePeopleOnDate(people, periodEnd);
    const count = Math.max(
      1,
      Math.round(activePeople * STANDARD_SCENARIO_COUNTS.tasksPerActivePerson),
    );
    return Array.from({ length: count }, (_, monthPosition) => ({
      createdDate: addDays(
        monthStart,
        Math.floor(
          (monthPosition * Math.max(0, availableDays - 1)) /
            Math.max(1, count - 1),
        ),
      ),
      projectIndex:
        (monthIndex * 3 + monthPosition * 7) %
        STANDARD_SCENARIO_COUNTS.projects,
    }));
  });
  const openTaskTarget = Math.round(taskBlueprints.length * 0.125);
  const openTaskIndexes = new Set(
    taskBlueprints
      .map((blueprint, index) => ({ ...blueprint, index }))
      .filter(
        ({ projectIndex }) => projects[projectIndex]!.status !== "completed",
      )
      .slice(-openTaskTarget)
      .map(({ index }) => index),
  );
  const openStatuses = [
    "pending",
    "pending",
    "pending",
    "in_progress",
    "in_progress",
    "blocked",
    "in_review",
  ] as const;
  const priorities = [
    "low",
    "medium",
    "medium",
    "medium",
    "high",
    "high",
    "urgent",
  ] as const;
  const tasks: DemoScenarioDefinition["tasks"] = taskBlueprints.map(
    ({ createdDate, projectIndex }, index) => {
    const project = projects[projectIndex]!;
    const status: DemoScenarioDefinition["tasks"][number]["status"] =
      openTaskIndexes.has(index)
        ? openStatuses[index % openStatuses.length]!
        : "completed";
    const action = pick(syntheticTaskActions, index * 5 + Math.floor(random() * 3));
    const daysFromCreation = Math.max(
      0,
      Math.floor(
        (new Date(`${anchorDate}T12:00:00.000Z`).getTime() -
          new Date(`${createdDate}T12:00:00.000Z`).getTime()) /
          86_400_000,
      ),
    );
    const dueDate =
      status === "completed"
        ? addDays(createdDate, Math.min(12 + (index % 20), daysFromCreation))
        : index % 19 === 0
          ? addDays(anchorDate, -(2 + (index % 6)))
          : anchorDate;
    const activePeople = people.filter((person) =>
      isPersonActiveOnDate(person, createdDate),
    );
    return {
      id: deterministicUuid(seed, "task", index),
      projectId: project.id,
      title: `${action} · ${project.name}`,
      description: `Coordinar esta actividad con el equipo de ${project.name} y dejar documentadas las decisiones antes de la revisión.`,
      status,
      priority: priorities[(index * 5) % priorities.length]!,
      assigneePersonId:
        index % 12 === 0
          ? null
          : activePeople[(index * 7) % activePeople.length]?.id ?? null,
      dueDate: index % 17 === 0 ? null : dueDate,
      createdAt: isoAt(createdDate, 8 + (index % 8)),
      updatedAt: isoAt(
        status === "completed"
          ? addDays(createdDate, Math.min(15 + (index % 20), daysFromCreation))
          : addDays(anchorDate, -(index % 18)),
        10,
      ),
    };
  });
  const taskDependencies = tasks
    .filter((_, index) => index > 0 && index % 5 === 0)
    .map((task, index) => ({
      id: deterministicUuid(seed, "task-dependency", index),
      taskId: task.id,
      dependsOnTaskId: tasks[tasks.indexOf(task) - 1]!.id,
    }));
  const taskComments = tasks.flatMap((task, index) =>
    Array.from({ length: index % 2 }, (_, comment) => ({
      id: deterministicUuid(seed, "task-comment", index * 3 + comment),
      taskId: task.id,
      authorPersonId:
        people.filter((person) =>
          isPersonActiveOnDate(person, task.updatedAt.slice(0, 10)),
        )[(index + comment) % Math.max(
          1,
          people.filter((person) =>
            isPersonActiveOnDate(person, task.updatedAt.slice(0, 10)),
          ).length,
        )]?.id ?? people[0]!.id,
      body: pick([
        "Criterios revisados con el equipo y listos para la siguiente validación.",
        "Queda documentada la dependencia antes de continuar con la entrega.",
      ] as const, comment),
      createdAt: task.updatedAt,
    })),
  );
  let leaveIndex = 0;
  const leaveRequests: DemoScenarioDefinition["leaveRequests"] =
    monthStarts.flatMap((monthStart) => {
      const periodEnd = notAfter(addDays(addMonths(monthStart, 1), -1), anchorDate);
      const activePeople = people.filter((person) =>
        isPersonActiveOnDate(person, periodEnd),
      );
      const month = Number(monthStart.slice(5, 7));
      const seasonality =
        month === 7 || month === 8 ? 2 : month === 12 ? 1.6 : 1;
      const count = Math.max(
        1,
        Math.round(
          activePeople.length *
            STANDARD_SCENARIO_COUNTS.leaveRequestsPerActivePerson *
            seasonality,
        ),
      );
      return Array.from({ length: count }, (_, monthPosition) => {
        const index = leaveIndex++;
        const teamNames = [...new Set(activePeople.map((person) => person.team))];
        const teamName = teamNames[monthPosition % teamNames.length]!;
        const teamPeople = activePeople.filter(
          (person) => person.team === teamName,
        );
        const teamPosition = Math.floor(monthPosition / teamNames.length);
        const startDate = notAfter(
          addDays(
            monthStart,
            2 + ((teamPosition * 8 + (monthPosition % teamNames.length) * 2) % 24),
          ),
          anchorDate,
        );
        const duration = index % 7 === 0 ? 1 : 2 + (index % 4);
        const isRecent = startDate.slice(0, 7) === anchorDate.slice(0, 7);
        const status: DemoScenarioDefinition["leaveRequests"][number]["status"] =
          isRecent
            ? index % 3 === 0
              ? "draft"
              : "submitted"
            : index % 17 === 0
              ? "rejected"
              : index % 13 === 0
                ? "cancelled"
                : "approved";
        return {
          id: deterministicUuid(seed, "leave", index),
          personId: teamPeople[teamPosition % teamPeople.length]!.id,
          startDate,
          endDate: notAfter(addDays(startDate, duration), anchorDate),
          type: index % 5 === 0 ? "personal" : "vacation",
          reason:
            index % 5 === 0
              ? "Gestión personal."
              : "Descanso anual planificado.",
          status,
        };
      });
    });
  const categories = ["access", "data", "hardware", "software", "other"] as const;
  const services = ["Importaciones", "Permisos", "Analítica", "Tesorería", "Directorio", "Notificaciones"] as const;
  const impactScopes = ["individual", "team", "workspace"] as const;
  const detectionChannels = ["monitoring", "support", "team", "automation"] as const;
  let incidentIndex = 0;
  const incidents: DemoScenarioDefinition["incidents"] =
    monthStarts.flatMap((monthStart) => {
      const periodEnd = notAfter(addDays(addMonths(monthStart, 1), -1), anchorDate);
      const activePeople = people.filter((person) =>
        isPersonActiveOnDate(person, periodEnd),
      );
      const count = Math.max(
        2,
        Math.round(
          activePeople.length *
            STANDARD_SCENARIO_COUNTS.incidentsPerActivePerson,
        ),
      );
      return Array.from({ length: count }, (_, monthPosition) => {
    const index = incidentIndex++;
    const createdDate = notAfter(
      addDays(monthStart, 3 + ((monthPosition * 7 + index) % 24)),
      anchorDate,
    );
    const daysRemaining = Math.max(
      0,
      Math.floor(
        (new Date(`${anchorDate}T12:00:00.000Z`).getTime() -
          new Date(`${createdDate}T12:00:00.000Z`).getTime()) /
          86_400_000,
      ),
    );
    const isRecent = daysRemaining <= 45;
    const status: DemoScenarioDefinition["incidents"][number]["status"] =
      isRecent
        ? pick(
            ["registered", "triaged", "assigned", "investigating"] as const,
            index,
          )
        : index % 3 === 0
          ? "resolved"
          : "closed";
    const priority = pick(
      ["low", "medium", "medium", "high", "critical"] as const,
      index * 7,
    );
    const resolved = status === "resolved" || status === "closed";
    const project = projects[(index * 7 + monthPosition) % projects.length]!;
    const [title, description] = pick(syntheticIncidentCatalog, index * 5);
    return {
      id: deterministicUuid(seed, "incident", index),
      projectId: project.id,
      requesterPersonId: activePeople[(index + 7) % activePeople.length]!.id,
      assigneePersonId:
        status === "registered"
          ? null
          : activePeople[index % activePeople.length]!.id,
      title: `${title} · ${project.name}`,
      description,
      status,
      priority,
      category: pick(categories, index * 7),
      affectedService: pick(services, index * 3),
      impactScope: pick(impactScopes, index * 7),
      detectionChannel: pick(detectionChannels, index * 5),
      rootCause: resolved
        ? "La regla de validación no contemplaba una combinación de estados."
        : null,
      firstResponseAt:
        status === "registered" ? null : isoAt(addDays(createdDate, Math.min(1, daysRemaining)), 10),
      correctiveTaskId: resolved ? tasks[index % tasks.length]!.id : null,
      slaDueAt: resolved
        ? isoAt(
            addDays(
              createdDate,
              Math.min(
                priority === "critical" ? 1 : priority === "high" ? 2 : 5,
                daysRemaining,
              ),
            ),
            12,
          )
        : isoAt(index < 2 ? addDays(anchorDate, -(2 + index)) : anchorDate, 12),
      resolution: resolved ? "Se ajustó la regla y se comprobó el servicio afectado." : null,
      createdAt: isoAt(createdDate, 9),
      updatedAt: isoAt(
        addDays(
          createdDate,
          Math.min(
            resolved ? 3 + (index % 9) : index % 3,
            daysRemaining,
          ),
        ),
        15,
      ),
    };
      });
    });
  const treasuryEntries: DemoScenarioDefinition["treasuryEntries"] =
    monthStarts.flatMap((monthStart, monthIndex) => {
      const periodEnd = notAfter(addDays(addMonths(monthStart, 1), -1), anchorDate);
      const availableDays =
        Math.floor(
          (new Date(`${periodEnd}T12:00:00.000Z`).getTime() -
            new Date(`${monthStart}T12:00:00.000Z`).getTime()) /
            86_400_000,
        ) + 1;
      const activePeople = countActivePeopleOnDate(people, periodEnd);
      const entryCount = Math.max(
        STANDARD_SCENARIO_COUNTS.minimumTreasuryEntriesPerMonth,
        Math.round(
          activePeople *
            STANDARD_SCENARIO_COUNTS.treasuryEntriesPerActivePerson,
        ),
      );
      const incomeAmount = Math.round(activePeople * (31_000 + (monthIndex % 5) * 700));
      const targetMargin = 0.11 + (monthIndex % 7) * 0.01;
      const expenseAmount = Math.round(
        (incomeAmount * 2 * (1 - targetMargin)) /
          (entryCount - 2),
      );

      return Array.from(
        { length: entryCount },
        (_, monthPosition) => {
          const index =
            monthStarts
              .slice(0, monthIndex)
              .reduce((total, priorMonthStart) => {
                const priorEnd = notAfter(
                  addDays(addMonths(priorMonthStart, 1), -1),
                  anchorDate,
                );
                const priorActive = countActivePeopleOnDate(people, priorEnd);
                return (
                  total +
                  Math.max(
                    STANDARD_SCENARIO_COUNTS.minimumTreasuryEntriesPerMonth,
                    Math.round(
                      priorActive *
                        STANDARD_SCENARIO_COUNTS.treasuryEntriesPerActivePerson,
                    ),
                  )
                );
              }, 0) +
            monthPosition;
          const [concept, category] = pick(
            syntheticTreasuryConcepts,
            index * 7,
          );
          const isIncome = monthPosition < 2;
          const isCurrentMonth = monthIndex === monthStarts.length - 1;
          const status =
            isCurrentMonth && monthPosition === 2
              ? ("registered" as const)
              : isCurrentMonth && monthPosition === 3
                ? ("reconciled" as const)
                : monthIndex >= monthStarts.length - 2
                  ? ("validated" as const)
                  : ("closed" as const);

          return {
            id: deterministicUuid(seed, "treasury", index),
            source:
              index % 2 === 0
                ? ("Financial Source A" as const)
                : ("Financial Source B" as const),
            sourceSequence: index + 1,
            entryDate: addDays(
              monthStart,
              Math.floor(
                (monthPosition * Math.max(0, availableDays - 1)) /
                  Math.max(
                    1,
                    entryCount - 1,
                  ),
              ),
            ),
            concept,
            category,
            amountCents: isIncome ? incomeAmount : -expenseAmount,
            currency: "EUR" as const,
            status,
          };
        },
      );
    });
  const payrollRuns: DemoScenarioDefinition["payrollRuns"] = monthStarts.map(
    (periodStart, index) => {
      const periodEnd = notAfter(
        addDays(addMonths(periodStart, 1), -1),
        anchorDate,
      );
      const peopleCount = countActivePeopleOnDate(people, periodEnd);
      const grossPerPerson = 300_000 + (index % 6) * 3_500;
      const gross = peopleCount * grossPerPerson;
      const deductions = Math.round(
        gross * (0.195 + (index % 4) * 0.006),
      );
      return {
        id: deterministicUuid(seed, "payroll", index),
        periodStart,
        periodEnd,
        peopleCount,
        grossTotalCents: gross,
        deductionTotalCents: deductions,
        netTotalCents: gross - deductions,
        employerCostTotalCents: Math.round(
          gross * (1.3 + (index % 4) * 0.01),
        ),
        currency: "EUR" as const,
        status:
          index < monthStarts.length - 2
            ? ("closed" as const)
            : index === monthStarts.length - 2
              ? ("reviewed" as const)
              : ("validating" as const),
      };
    },
  );
  const payrollParticipants: DemoScenarioDefinition["payrollParticipants"] =
    payrollRuns.flatMap((run, runIndex) =>
      people.flatMap((person, personIndex) => {
        if (!isPersonActiveOnDate(person, run.periodEnd)) return [];
        return [{
          id: deterministicUuid(
            seed,
            "payroll-participant",
            runIndex * people.length + personIndex,
          ),
          runId: run.id,
          personId: person.id,
          personName: person.displayName,
          team: person.team,
          positionTitle: person.positionTitle,
          inclusionStatus: "included" as const,
          validationStatus:
            runIndex === payrollRuns.length - 1 && personIndex % 17 === 0
              ? ("review" as const)
              : runIndex >= payrollRuns.length - 2 && personIndex % 23 === 0
                ? ("pending" as const)
                : ("validated" as const),
        }];
      }),
    );
  const connectorIds = [
    "financial-source-a",
    "financial-source-b",
    "payroll-master",
    "people-master",
  ] as const;
  const integrationRuns: DemoScenarioDefinition["integrationRuns"] =
    Array.from(
      {
        length:
          monthStarts.length *
          STANDARD_SCENARIO_COUNTS.integrationRunsPerMonth,
      },
      (_, index) => {
      const monthIndex = Math.floor(index / connectorIds.length);
      const connectorId = connectorIds[index % connectorIds.length]!;
      const monthStart = monthStarts[monthIndex]!;
      const periodEnd = notAfter(addDays(addMonths(monthStart, 1), -1), anchorDate);
      const activePeople = countActivePeopleOnDate(people, periodEnd);
      const effectiveDate = notAfter(
        addDays(monthStart, 8 + (index % 4) * 5),
        anchorDate,
      );
      const status =
        index % 17 === 0 ? "failed" as const : index % 7 === 0 ? "partial" as const : "succeeded" as const;
      const processedCount = connectorId.startsWith("financial")
        ? Math.max(20, Math.round(activePeople * 0.8))
        : connectorId === "payroll-master"
          ? activePeople
          : Math.max(12, Math.round(activePeople * 0.55));
      const errorCount = status === "failed" ? 4 : status === "partial" ? 1 : 0;
      const duplicateCount = connectorId.startsWith("financial") ? index % 3 : 0;
      return {
        id: deterministicUuid(seed, "integration-run", index),
        connectorId,
        effectiveDate,
        status,
        triggerKind: "schedule",
        sourceSequence: monthIndex + 1,
        processedCount,
        importedCount: processedCount - errorCount - duplicateCount,
        duplicateCount,
        errorCount,
        safeSummary: status === "succeeded" ? "Ejecución completada." : "Ejecución revisada con incidencias controladas.",
        startedAt: isoAt(effectiveDate, 2),
        finishedAt: isoAt(effectiveDate, 3),
      };
      },
    );
  const changelogTimeline = [
    ["0.1.0", "Base de la plataforma", "Estructura inicial, navegación por módulos y permisos de acceso.", "2026-02-02"],
    ["0.2.0", "Gestión de vacaciones", "Solicitudes, aprobaciones, calendario de ausencias y trazabilidad.", "2026-02-16"],
    ["0.3.0", "Proyectos y tareas", "Seguimiento de proyectos, responsables, dependencias y tablero Kanban.", "2026-03-02"],
    ["0.4.0", "Incidencias y personal", "Ciclo de atención, tiempos de resolución y directorio del equipo.", "2026-03-16"],
    ["0.5.0", "Tesorería y nóminas", "Movimientos conciliados y ciclos de nómina con información agregada.", "2026-03-30"],
    ["0.6.0", "Integraciones y automatización", "Ejecuciones programadas, control de importaciones y calidad del dato.", "2026-04-20"],
    ["0.7.0", "Migración de datos", "Carga histórica, validaciones de calidad y restauración controlada del escenario.", "2026-04-30"],
    ["1.0.0", "Primera versión estable", "Acceso con Google, aislamiento por organización y revisión de seguridad.", "2026-05-24"],
    ["1.1.0", "Analítica y experiencia de uso", "Indicadores, filtros, perfiles y mejoras generales de accesibilidad.", "2026-06-01"],
    ["1.2.0", "Datos equilibrados y análisis dinámico", "Escenario operativo revisado, filtros comparables y presentación más consistente.", "2026-06-15"],
    ["1.2.1", "Ajustes finales de presentación", "Acceso, gráficos, proyectos, datos y comportamiento responsive revisados.", "2026-06-16"],
    ["1.2.2", "Interfaz y datos revisados", "Mejoras de acceso, analítica, trabajo móvil, nóminas y estructura de equipos.", "2026-06-17"],
    ["1.3.0", "Tema y experiencia responsive", "Tema claro por defecto y oscuro manual, analítica estable y Scenario V7 incremental.", "2026-06-23"],
    ["1.3.1", "Corrección responsive y seguridad", "Tareas móviles, backfill aditivo y controles de seguridad reforzados.", "2026-07-29"],
  ] as const;
  const changelogEntries: DemoScenarioDefinition["changelogEntries"] = changelogTimeline.map(
    ([version, title, summary, publishedDate], index) => ({
      id: deterministicUuid(seed, "changelog", index),
      version,
      title,
      summary,
      status: "published",
      publishedAt: isoAt(publishedDate, 11),
    }),
  );
  return {
    scenarioVersion: 7,
    seed,
    anchorDate,
    scenarioStartDate: SCENARIO_START_DATE,
    scenarioGeneratedThroughDate: anchorDate,
    generatedAt: isoAt(anchorDate, 0),
    people,
    projects,
    tasks,
    taskDependencies,
    taskComments,
    leaveRequests,
    incidents,
    treasuryEntries,
    payrollRuns,
    payrollParticipants,
    integrationRuns,
    changelogEntries,
  };
}

export function validateDemoScenario(value: unknown) {
  const scenario = scenarioSchema.parse(value) as DemoScenarioDefinition;
  const personIds = new Set(scenario.people.map((person) => person.id));
  const projectIds = new Set(scenario.projects.map((project) => project.id));
  const taskIds = new Set(scenario.tasks.map((task) => task.id));
  const ids = new Set<string>();
  for (const collection of [
    scenario.people,
    scenario.projects,
    scenario.tasks,
    scenario.taskDependencies,
    scenario.taskComments,
    scenario.leaveRequests,
    scenario.incidents,
    scenario.treasuryEntries,
    scenario.payrollRuns,
    scenario.payrollParticipants,
    scenario.integrationRuns,
    scenario.changelogEntries,
  ]) {
    for (const record of collection) {
      if (ids.has(record.id)) throw new Error(`Duplicate id: ${record.id}`);
      ids.add(record.id);
    }
  }
  for (const project of scenario.projects) {
    if (!personIds.has(project.ownerPersonId)) throw new Error("Invalid project owner");
    if (project.memberIds.some((id) => !personIds.has(id))) throw new Error("Invalid project member");
    if (project.targetDate < project.startDate) throw new Error("Invalid project date range");
  }
  for (const person of scenario.people) {
    if (person.managerPersonId && !personIds.has(person.managerPersonId)) {
      throw new Error("Invalid person manager");
    }
    if (person.managerPersonId === person.id) throw new Error("A person cannot manage itself");
  }
  for (const task of scenario.tasks) {
    if (!projectIds.has(task.projectId)) throw new Error("Invalid task project");
    if (task.assigneePersonId && !personIds.has(task.assigneePersonId)) throw new Error("Invalid task assignee");
  }
  for (const dependency of scenario.taskDependencies) {
    if (!taskIds.has(dependency.taskId) || !taskIds.has(dependency.dependsOnTaskId) || dependency.taskId === dependency.dependsOnTaskId) {
      throw new Error("Invalid task dependency");
    }
  }
  for (const incident of scenario.incidents) {
    if (!projectIds.has(incident.projectId) || !personIds.has(incident.requesterPersonId)) throw new Error("Invalid incident relation");
  }
  for (const run of scenario.payrollRuns) {
    if (run.netTotalCents !== run.grossTotalCents - run.deductionTotalCents) throw new Error("Invalid payroll totals");
    const grossPerPerson =
      run.peopleCount > 0 ? run.grossTotalCents / run.peopleCount : 0;
    const costRatio = run.employerCostTotalCents / run.grossTotalCents;
    if (
      grossPerPerson < 290_000 ||
      grossPerPerson > 330_000 ||
      costRatio < 1.28 ||
      costRatio > 1.34
    ) {
      throw new Error("Payroll totals fall outside the aggregate scenario limits");
    }
  }
  const payrollRunIds = new Set(scenario.payrollRuns.map((run) => run.id));
  for (const participant of scenario.payrollParticipants) {
    if (!payrollRunIds.has(participant.runId) || !personIds.has(participant.personId)) {
      throw new Error("Invalid payroll participant relation");
    }
  }

  const operationalDates = [
    scenario.generatedAt,
    ...scenario.projects.flatMap((project) => [project.startDate, project.targetDate]),
    ...scenario.tasks.flatMap((task) => [
      task.createdAt,
      task.updatedAt,
      ...(task.dueDate ? [task.dueDate] : []),
    ]),
    ...scenario.taskComments.map((comment) => comment.createdAt),
    ...scenario.leaveRequests.flatMap((request) => [request.startDate, request.endDate]),
    ...scenario.incidents.flatMap((incident) => [
      incident.createdAt,
      incident.updatedAt,
      incident.slaDueAt,
      ...(incident.firstResponseAt ? [incident.firstResponseAt] : []),
    ]),
    ...scenario.treasuryEntries.map((entry) => entry.entryDate),
    ...scenario.payrollRuns.flatMap((run) => [run.periodStart, run.periodEnd]),
    ...scenario.integrationRuns.flatMap((run) => [
      run.effectiveDate,
      run.startedAt,
      run.finishedAt,
    ]),
  ].map((date) => date.slice(0, 10));
  const outsideScenarioWindow = operationalDates.find(
    (date) => date < SCENARIO_START_DATE || date > scenario.anchorDate,
  );
  if (outsideScenarioWindow) {
    throw new Error(`Operational date outside the scenario window: ${outsideScenarioWindow}`);
  }

  const openTasks = scenario.tasks.filter((task) => task.status !== "completed");
  const overdueOpenTasks = openTasks.filter(
    (task) => Boolean(task.dueDate && task.dueDate < scenario.anchorDate),
  );
  const completedTaskRatio =
    scenario.tasks.filter((task) => task.status === "completed").length /
    scenario.tasks.length;
  if (
    completedTaskRatio < 0.85 ||
    completedTaskRatio > 0.9 ||
    overdueOpenTasks.length > Math.max(6, Math.ceil(openTasks.length * 0.08))
  ) {
    throw new Error("Task workload is outside the balanced scenario limits");
  }

  for (const contract of [
    "indefinite_ordinary",
    "permanent_discontinuous",
    "temporary_production",
    "temporary_substitution",
  ] as const) {
    if (
      !scenario.people.some(
        (person) => person.employmentContractType === contract,
      )
    ) {
      throw new Error(`Missing employment contract type: ${contract}`);
    }
  }

  for (const project of scenario.projects) {
    const projectTasks = scenario.tasks.filter(
      (task) => task.projectId === project.id,
    );
    const completedTasks = projectTasks.filter(
      (task) => task.status === "completed",
    ).length;
    const progress = Math.round((completedTasks / projectTasks.length) * 100);
    if (
      (progress === 100 && project.status !== "completed") ||
      (project.status === "completed" && progress !== 100) ||
      (project.status !== "completed" && progress > 99)
    ) {
      throw new Error(`Project status and progress are inconsistent for ${project.code}`);
    }
  }

  const openIncidents = scenario.incidents.filter(
    (incident) => !["resolved", "closed"].includes(incident.status),
  );
  const overdueIncidents = openIncidents.filter(
    (incident) => incident.slaDueAt.slice(0, 10) < scenario.anchorDate,
  );
  if (
    openIncidents.length === 0 ||
    overdueIncidents.length > Math.max(2, Math.ceil(openIncidents.length * 0.25)) ||
    !scenario.incidents.some((incident) => incident.priority === "critical")
  ) {
    throw new Error("Incident workload is outside the balanced scenario limits");
  }

  if (
    !scenario.leaveRequests.some((request) => request.status === "approved") ||
    !scenario.leaveRequests.some((request) =>
      ["submitted", "draft"].includes(request.status),
    )
  ) {
    throw new Error("Leave request history lacks completed or current work");
  }
  for (const team of new Set(scenario.people.map((person) => person.team))) {
    const teamNames = new Set(
      scenario.people.filter((person) => person.team === team).map((person) => person.id),
    );
    const approved = scenario.leaveRequests.filter(
      (request) => request.status === "approved" && teamNames.has(request.personId),
    );
    for (
      let cursor = new Date(`${SCENARIO_START_DATE}T00:00:00Z`);
      cursor <= new Date(`${scenario.anchorDate}T00:00:00Z`);
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      const day = cursor.toISOString().slice(0, 10);
      if (approved.filter((request) => request.startDate <= day && request.endDate >= day).length > 2) {
        throw new Error(`Too many simultaneous leave requests for ${team} on ${day}`);
      }
    }
  }

  const pendingTreasury = scenario.treasuryEntries.filter((entry) =>
    ["registered", "reconciled"].includes(entry.status),
  );
  if (pendingTreasury.length / scenario.treasuryEntries.length > 0.05) {
    throw new Error("Too many Treasury entries are pending validation");
  }

  if (
    scenario.changelogEntries.some(
      (entry) => entry.status !== "published" || !entry.publishedAt,
    )
  ) {
    throw new Error("Every release note must be published");
  }

  const numberedLabels = [
    ...scenario.people.map((person) => person.displayName),
    ...scenario.projects.map((project) => project.name),
    ...scenario.tasks.map((task) => task.title),
    ...scenario.incidents.map((incident) => incident.title),
  ];
  if (
    numberedLabels.some((label) =>
      /^(persona|tarea|incidencia|proyecto)\s+\d+/i.test(label),
    )
  ) {
    throw new Error("Numbered placeholder labels are not allowed");
  }

  const treasuryMonths = new Map<
    string,
    { income: number; expense: number }
  >();
  for (const entry of scenario.treasuryEntries) {
    const key = entry.entryDate.slice(0, 7);
    const month = treasuryMonths.get(key) ?? { income: 0, expense: 0 };
    if (entry.amountCents > 0) month.income += entry.amountCents;
    else month.expense += Math.abs(entry.amountCents);
    treasuryMonths.set(key, month);
  }
  for (const [month, totals] of treasuryMonths) {
    const margin =
      totals.income > 0
        ? (totals.income - totals.expense) / totals.income
        : Number.NEGATIVE_INFINITY;
    if (margin < 0.1 || margin > 0.18) {
      throw new Error(
        `Treasury margin outside the 10-18% target for ${month}: ${margin}`,
      );
    }
  }

  return scenario;
}

export async function checksumScenario(scenario: DemoScenarioDefinition) {
  const bytes = new TextEncoder().encode(JSON.stringify(scenario));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}

export function createScenarioReport(scenario: DemoScenarioDefinition) {
  return {
    scenarioVersion: scenario.scenarioVersion,
    seed: scenario.seed,
    anchorDate: scenario.anchorDate,
    counts: {
      people: scenario.people.length,
      teams: new Set(scenario.people.map((person) => person.team)).size,
      projects: scenario.projects.length,
      tasks: scenario.tasks.length,
      taskDependencies: scenario.taskDependencies.length,
      taskComments: scenario.taskComments.length,
      leaveRequests: scenario.leaveRequests.length,
      incidents: scenario.incidents.length,
      treasuryEntries: scenario.treasuryEntries.length,
      payrollRuns: scenario.payrollRuns.length,
      payrollParticipants: scenario.payrollParticipants.length,
      integrationRuns: scenario.integrationRuns.length,
      changelogEntries: scenario.changelogEntries.length,
      estimatedTraceRecords:
        scenario.people.length +
        scenario.projects.length +
        scenario.tasks.length * 2 +
        scenario.taskDependencies.length +
        scenario.taskComments.length +
        scenario.leaveRequests.length * 2 +
        scenario.incidents.length * 2 +
        scenario.treasuryEntries.length * 2 +
        scenario.payrollRuns.length * 2 +
        scenario.payrollParticipants.length +
        scenario.integrationRuns.length * 2 +
        scenario.changelogEntries.length * 2,
    },
    coverage: {
      from: scenario.scenarioStartDate,
      to: scenario.scenarioGeneratedThroughDate,
    },
  };
}
