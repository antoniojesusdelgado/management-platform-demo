import { z } from "zod";

export const STANDARD_SCENARIO_COUNTS = {
  people: 24,
  teams: 4,
  projects: 8,
  tasks: 180,
  leaveRequests: 96,
  incidents: 120,
  treasuryEntries: 540,
  payrollRuns: 18,
  changelogEntries: 24,
} as const;

export type DemoScenarioDefinition = {
  scenarioVersion: 1;
  seed: string;
  anchorDate: string;
  generatedAt: string;
  people: Array<{
    id: string;
    displayName: string;
    team: string;
    positionTitle: string;
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
    currency: "EUR";
    status:
      | "collecting"
      | "validating"
      | "calculated"
      | "reviewed"
      | "closed";
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
  scenarioVersion: z.literal(1),
  seed: z.string().min(1),
  anchorDate: isoDateSchema,
  generatedAt: z.iso.datetime(),
  people: z.array(z.object({
    id: z.uuid(), displayName: z.string().min(2), team: z.string().min(2),
    positionTitle: z.string().min(2), status: z.enum(["invited", "active", "suspended", "inactive"]),
    roleCode: z.enum(["admin", "manager", "collaborator", "viewer"]),
  })).length(STANDARD_SCENARIO_COUNTS.people),
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
  })).length(STANDARD_SCENARIO_COUNTS.tasks),
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
  })).length(STANDARD_SCENARIO_COUNTS.leaveRequests),
  incidents: z.array(z.object({
    id: z.uuid(), projectId: z.uuid(), requesterPersonId: z.uuid(), assigneePersonId: z.uuid().nullable(),
    title: z.string(), description: z.string(),
    status: z.enum(["registered", "triaged", "assigned", "investigating", "resolved", "closed"]),
    priority: z.enum(["low", "medium", "high", "critical"]),
    category: z.enum(["access", "data", "hardware", "software", "other"]),
    slaDueAt: z.iso.datetime(), resolution: z.string().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  })).length(STANDARD_SCENARIO_COUNTS.incidents),
  treasuryEntries: z.array(z.object({
    id: z.uuid(), source: z.enum(["Financial Source A", "Financial Source B"]),
    sourceSequence: z.number().int().positive(), entryDate: isoDateSchema,
    concept: z.string(), amountCents: z.number().int(), currency: z.literal("EUR"),
    status: z.enum(["draft", "registered", "reconciled", "validated", "closed"]),
  })).length(STANDARD_SCENARIO_COUNTS.treasuryEntries),
  payrollRuns: z.array(z.object({
    id: z.uuid(), periodStart: isoDateSchema, periodEnd: isoDateSchema,
    peopleCount: z.number().int().positive(), grossTotalCents: z.number().int().positive(),
    deductionTotalCents: z.number().int().nonnegative(), netTotalCents: z.number().int().positive(),
    currency: z.literal("EUR"),
    status: z.enum(["collecting", "validating", "calculated", "reviewed", "closed"]),
  })).length(STANDARD_SCENARIO_COUNTS.payrollRuns),
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

function isoAt(value: string, hour = 9) {
  return `${value}T${String(hour).padStart(2, "0")}:00:00.000Z`;
}

function pick<T>(items: readonly T[], index: number) {
  return items[index % items.length]!;
}

export function generateDemoScenario(
  seed = "management-platform-standard-v1",
  anchorDate = "2026-07-01",
): DemoScenarioDefinition {
  const random = createRandom(seed);
  const teams = ["Operaciones", "Producto", "Tecnología", "Servicios"];
  const positions = ["Coordinación", "Especialista", "Analista", "Soporte", "Gestión de proyecto", "Consultoría"];
  const people: DemoScenarioDefinition["people"] = Array.from(
    { length: STANDARD_SCENARIO_COUNTS.people },
    (_, index) => ({
      id: deterministicUuid(seed, "person", index),
      displayName: `Persona ${String(index + 1).padStart(2, "0")}`,
      team: pick(teams, index),
      positionTitle: pick(positions, index * 3 + 1),
      status: index === 22 ? "suspended" : index === 23 ? "inactive" : "active",
      roleCode: index === 0 ? "admin" : index < 4 ? "manager" : index > 20 ? "viewer" : "collaborator",
    }),
  );
  const projectStatuses = ["planned", "active", "active", "active", "on_hold", "active", "completed", "cancelled"] as const;
  const projectHealth = ["on_track", "at_risk", "on_track", "off_track", "at_risk", "on_track", "on_track", "off_track"] as const;
  const colors = ["#4f46e5", "#0d9488", "#d97706", "#2563eb", "#7c3aed", "#0891b2", "#16a34a", "#dc2626"];
  const projects: DemoScenarioDefinition["projects"] = Array.from({ length: 8 }, (_, index) => {
    const startDate = addMonths(anchorDate, index - 5);
    return {
      id: deterministicUuid(seed, "project", index),
      code: `PRJ-${String(index + 1).padStart(2, "0")}`,
      name: `Iniciativa sintética ${String(index + 1).padStart(2, "0")}`,
      summary: `Escenario demostrativo ${index + 1} para analizar planificación, capacidad y salud sin referencias profesionales reales.`,
      status: projectStatuses[index]!,
      health: projectHealth[index]!,
      ownerPersonId: people[index % 4]!.id,
      memberIds: Array.from({ length: 6 }, (_, member) => people[(index * 3 + member) % people.length]!.id),
      startDate,
      targetDate: addMonths(startDate, 5 + (index % 4)),
      color: colors[index]!,
    };
  });
  const taskStatuses = ["pending", "in_progress", "blocked", "in_review", "completed"] as const;
  const priorities = ["low", "medium", "high", "urgent"] as const;
  const tasks: DemoScenarioDefinition["tasks"] = Array.from({ length: 180 }, (_, index) => {
    const createdDate = addDays(anchorDate, -150 + Math.floor(index * 1.6));
    const status = pick(taskStatuses, index * 7 + Math.floor(random() * 3));
    return {
      id: deterministicUuid(seed, "task", index),
      projectId: projects[index % projects.length]!.id,
      title: `Tarea sintética ${String(index + 1).padStart(3, "0")}`,
      description: `Trabajo demostrativo generado para el escenario ${seed}; no representa una actividad profesional real.`,
      status,
      priority: pick(priorities, index * 5 + Math.floor(random() * 2)),
      assigneePersonId: index % 11 === 0 ? null : people[index % 22]!.id,
      dueDate: index % 13 === 0 ? null : addDays(createdDate, 7 + (index % 28)),
      createdAt: isoAt(createdDate, 8 + (index % 8)),
      updatedAt: isoAt(addDays(createdDate, Math.min(20, index % 24)), 10),
    };
  });
  const taskDependencies = tasks
    .filter((_, index) => index > 0 && index % 4 === 0)
    .map((task, index) => ({
      id: deterministicUuid(seed, "task-dependency", index),
      taskId: task.id,
      dependsOnTaskId: tasks[tasks.indexOf(task) - 1]!.id,
    }));
  const taskComments = tasks.flatMap((task, index) =>
    Array.from({ length: index % 3 }, (_, comment) => ({
      id: deterministicUuid(seed, "task-comment", index * 3 + comment),
      taskId: task.id,
      authorPersonId: people[(index + comment) % 22]!.id,
      body: `Comentario sintético ${comment + 1} para documentar el seguimiento de la tarea.`,
      createdAt: task.updatedAt,
    })),
  );
  const leaveStatuses = ["draft", "submitted", "approved", "approved", "rejected", "cancelled"] as const;
  const leaveRequests: DemoScenarioDefinition["leaveRequests"] = Array.from({ length: 96 }, (_, index) => {
    const startDate = addDays(addMonths(anchorDate, -9), index * 6);
    return {
      id: deterministicUuid(seed, "leave", index),
      personId: people[index % 22]!.id,
      startDate,
      endDate: addDays(startDate, 1 + (index % 8)),
      type: index % 5 === 0 ? "personal" : "vacation",
      reason: index % 5 === 0 ? "Gestión personal sintética." : "Descanso anual sintético planificado.",
      status: pick(leaveStatuses, index),
    };
  });
  const incidentStatuses = ["registered", "triaged", "assigned", "investigating", "resolved", "closed"] as const;
  const incidentPriorities = ["low", "medium", "high", "critical"] as const;
  const categories = ["access", "data", "hardware", "software", "other"] as const;
  const incidents: DemoScenarioDefinition["incidents"] = Array.from({ length: 120 }, (_, index) => {
    const createdDate = addDays(anchorDate, -120 + index * 2);
    const status = pick(incidentStatuses, index * 5);
    const priority = pick(incidentPriorities, index * 3);
    const resolved = status === "resolved" || status === "closed";
    return {
      id: deterministicUuid(seed, "incident", index),
      projectId: projects[index % projects.length]!.id,
      requesterPersonId: people[(index + 7) % 22]!.id,
      assigneePersonId: status === "registered" ? null : people[index % 8]!.id,
      title: `Incidencia sintética ${String(index + 1).padStart(3, "0")}`,
      description: "Caso demostrativo para analizar clasificación, SLA y resolución sin datos de una organización real.",
      status,
      priority,
      category: pick(categories, index * 7),
      slaDueAt: isoAt(addDays(createdDate, priority === "critical" ? 1 : priority === "high" ? 2 : 5), 12),
      resolution: resolved ? "Resolución sintética verificada." : null,
      createdAt: isoAt(createdDate, 9),
      updatedAt: isoAt(addDays(createdDate, resolved ? 3 + (index % 9) : index % 3), 15),
    };
  });
  const treasuryStatuses = ["draft", "registered", "reconciled", "validated", "closed"] as const;
  const treasuryEntries: DemoScenarioDefinition["treasuryEntries"] = Array.from({ length: 540 }, (_, index) => ({
    id: deterministicUuid(seed, "treasury", index),
    source: index % 2 === 0 ? "Financial Source A" : "Financial Source B",
    sourceSequence: index + 1,
    entryDate: addDays(addMonths(anchorDate, -17), index),
    concept: `Movimiento sintético importado ${String(index + 1).padStart(4, "0")}`,
    amountCents: Math.round((4500 + random() * 240000) * (index % 3 === 0 ? 1 : -1)),
    currency: "EUR",
    status: pick(treasuryStatuses, index * 3),
  }));
  const payrollStatuses = ["collecting", "validating", "calculated", "reviewed", "closed"] as const;
  const payrollRuns: DemoScenarioDefinition["payrollRuns"] = Array.from({ length: 18 }, (_, index) => {
    const periodStart = addMonths(anchorDate, index - 17);
    const gross = 6_200_000 + index * 82_000;
    const deductions = Math.round(gross * (0.195 + (index % 4) * 0.006));
    return {
      id: deterministicUuid(seed, "payroll", index),
      periodStart,
      periodEnd: addDays(addMonths(periodStart, 1), -1),
      peopleCount: 20 + (index % 5),
      grossTotalCents: gross,
      deductionTotalCents: deductions,
      netTotalCents: gross - deductions,
      currency: "EUR",
      status: index < 14 ? "closed" : pick(payrollStatuses, index),
    };
  });
  const changelogEntries: DemoScenarioDefinition["changelogEntries"] = Array.from({ length: 24 }, (_, index) => {
    const status = index < 18 ? "published" : index < 21 ? "in_review" : "draft";
    const publishedDate = addDays(addMonths(anchorDate, -11), index * 15);
    return {
      id: deterministicUuid(seed, "changelog", index),
      version: `0.${Math.floor(index / 4) + 1}.${index % 4}`,
      title: `Evolución demostrativa ${String(index + 1).padStart(2, "0")}`,
      summary: "Nota editorial sintética sobre una mejora funcional de la plataforma de demostración.",
      status,
      publishedAt: status === "published" ? isoAt(publishedDate, 11) : null,
    };
  });
  return {
    scenarioVersion: 1,
    seed,
    anchorDate,
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
  const taskDates = scenario.tasks.map((task) => task.createdAt.slice(0, 10));
  const leaveDates = scenario.leaveRequests.flatMap((request) => [request.startDate, request.endDate]);
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
      changelogEntries: scenario.changelogEntries.length,
    },
    coverage: {
      from: [...taskDates, ...leaveDates].sort()[0],
      to: [...taskDates, ...leaveDates].sort().at(-1),
    },
  };
}
