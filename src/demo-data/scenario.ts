import { z } from "zod";
import {
  syntheticIncidentCatalog,
  syntheticPeopleCatalog,
  syntheticProjectCatalog,
  syntheticTaskActions,
  syntheticTreasuryConcepts,
} from "@/demo-data/catalog";

export const SCENARIO_REFERENCE_DATE = "2026-06-23";
export const SCENARIO_START_DATE = "2026-01-01";

export const STANDARD_SCENARIO_COUNTS = {
  people: 32,
  teams: 6,
  projects: 10,
  tasks: 120,
  leaveRequests: 72,
  incidents: 60,
  treasuryEntries: 240,
  payrollRuns: 6,
  changelogEntries: 10,
} as const;

export type DemoScenarioDefinition = {
  scenarioVersion: 4;
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
  scenarioVersion: z.literal(4),
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
    affectedService: z.string().min(2),
    impactScope: z.enum(["individual", "team", "workspace"]),
    detectionChannel: z.enum(["monitoring", "support", "team", "automation"]),
    rootCause: z.string().nullable(),
    firstResponseAt: z.iso.datetime().nullable(),
    correctiveTaskId: z.uuid().nullable(),
    slaDueAt: z.iso.datetime(), resolution: z.string().nullable(), createdAt: z.iso.datetime(), updatedAt: z.iso.datetime(),
  })).length(STANDARD_SCENARIO_COUNTS.incidents),
  treasuryEntries: z.array(z.object({
    id: z.uuid(), source: z.enum(["Financial Source A", "Financial Source B"]),
    sourceSequence: z.number().int().positive(), entryDate: isoDateSchema,
    concept: z.string(), category: z.string(), amountCents: z.number().int(), currency: z.literal("EUR"),
    status: z.enum(["draft", "registered", "reconciled", "validated", "closed"]),
  })).length(STANDARD_SCENARIO_COUNTS.treasuryEntries),
  payrollRuns: z.array(z.object({
    id: z.uuid(), periodStart: isoDateSchema, periodEnd: isoDateSchema,
    peopleCount: z.number().int().positive(), grossTotalCents: z.number().int().positive(),
    deductionTotalCents: z.number().int().nonnegative(), netTotalCents: z.number().int().positive(),
    employerCostTotalCents: z.number().int().positive(),
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

function notAfter(value: string, maximum: string) {
  return value <= maximum ? value : maximum;
}

function pick<T>(items: readonly T[], index: number) {
  return items[index % items.length]!;
}

export function generateDemoScenario(
  seed = "management-platform-standard-v4",
  anchorDate = SCENARIO_REFERENCE_DATE,
): DemoScenarioDefinition {
  const random = createRandom(seed);
  const people: DemoScenarioDefinition["people"] = Array.from(
    { length: STANDARD_SCENARIO_COUNTS.people },
    (_, index) => {
      const [displayName, team, positionTitle] = syntheticPeopleCatalog[index]!;
      return {
        id: deterministicUuid(seed, "person", index),
        displayName,
        team,
        positionTitle,
        status:
          index === 29 ? "suspended" : index === 31 ? "inactive" : "active",
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
  const projects: DemoScenarioDefinition["projects"] = Array.from({ length: STANDARD_SCENARIO_COUNTS.projects }, (_, index) => {
    const startDate = addDays(SCENARIO_START_DATE, index * 8);
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
      targetDate: notAfter(addDays(startDate, 75 + index * 4), anchorDate),
      color: colors[index]!,
    };
  });
  const taskStatuses = [
    ...Array<"pending">(20).fill("pending"),
    ...Array<"in_progress">(15).fill("in_progress"),
    ...Array<"blocked">(5).fill("blocked"),
    ...Array<"in_review">(10).fill("in_review"),
    ...Array<"completed">(70).fill("completed"),
  ];
  const priorities = [
    ...Array<"urgent">(5).fill("urgent"),
    ...Array<"high">(25).fill("high"),
    ...Array<"medium">(60).fill("medium"),
    ...Array<"low">(30).fill("low"),
  ];
  const taskProjectIndexes = [16, 15, 14, 13, 12, 11, 10, 9, 8, 12]
    .flatMap((count, projectIndex) => Array<number>(count).fill(projectIndex));
  const tasks: DemoScenarioDefinition["tasks"] = Array.from({ length: STANDARD_SCENARIO_COUNTS.tasks }, (_, index) => {
    const createdDate = addDays(SCENARIO_START_DATE, Math.floor((index * 172) / 119));
    const status = taskStatuses[index]!;
    const project = projects[taskProjectIndexes[index]!]!;
    const action = pick(syntheticTaskActions, index * 5 + Math.floor(random() * 3));
    const dueDate =
      status === "completed"
        ? addDays(createdDate, Math.min(12 + (index % 35), Math.max(0, 172 - Math.floor((index * 172) / 119))))
        : index < 6
          ? addDays(anchorDate, -(2 + index * 3))
          : anchorDate;
    return {
      id: deterministicUuid(seed, "task", index),
      projectId: project.id,
      title: `${action} · ${project.name}`,
      description: `Coordinar esta actividad con el equipo de ${project.name} y dejar documentadas las decisiones antes de la revisión.`,
      status,
      priority: priorities[(index * 37) % priorities.length]!,
      assigneePersonId: index % 12 === 0 ? null : people[(index * 7) % 30]!.id,
      dueDate: index % 17 === 0 ? null : dueDate,
      createdAt: isoAt(createdDate, 8 + (index % 8)),
      updatedAt: isoAt(
        status === "completed"
          ? addDays(createdDate, Math.min(15 + (index % 40), Math.max(0, 172 - Math.floor((index * 172) / 119))))
          : addDays(anchorDate, -(index % 18)),
        10,
      ),
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
      authorPersonId: people[(index + comment) % 30]!.id,
      body: pick([
        "Criterios revisados con el equipo y listos para la siguiente validación.",
        "Queda documentada la dependencia antes de continuar con la entrega.",
      ] as const, comment),
      createdAt: task.updatedAt,
    })),
  );
  const leaveStatuses = [
    ...Array<"approved">(45).fill("approved"),
    ...Array<"submitted">(8).fill("submitted"),
    ...Array<"draft">(5).fill("draft"),
    ...Array<"rejected">(6).fill("rejected"),
    ...Array<"cancelled">(8).fill("cancelled"),
  ];
  const leaveRequests: DemoScenarioDefinition["leaveRequests"] = Array.from({ length: STANDARD_SCENARIO_COUNTS.leaveRequests }, (_, index) => {
    const startDate = addDays(SCENARIO_START_DATE, Math.floor((index * 168) / 71));
    const duration = Math.min(1 + (index % 8), Math.max(0, 173 - Math.floor((index * 168) / 71)));
    return {
      id: deterministicUuid(seed, "leave", index),
      personId: people[index % 30]!.id,
      startDate,
      endDate: addDays(startDate, duration),
      type: index % 5 === 0 ? "personal" : "vacation",
      reason: index % 5 === 0 ? "Gestión personal." : "Descanso anual planificado.",
      status: leaveStatuses[(index * 29) % leaveStatuses.length]!,
    };
  });
  const incidentStatuses = [
    ...Array<"registered">(2).fill("registered"),
    ...Array<"triaged">(2).fill("triaged"),
    ...Array<"assigned">(3).fill("assigned"),
    ...Array<"investigating">(5).fill("investigating"),
    ...Array<"resolved">(18).fill("resolved"),
    ...Array<"closed">(30).fill("closed"),
  ];
  const incidentPriorities = [
    ...Array<"critical">(2).fill("critical"),
    ...Array<"high">(10).fill("high"),
    ...Array<"medium">(30).fill("medium"),
    ...Array<"low">(18).fill("low"),
  ];
  const incidentProjectIndexes = [10, 9, 8, 7, 6, 5, 4, 4, 3, 4]
    .flatMap((count, projectIndex) => Array<number>(count).fill(projectIndex));
  const categories = ["access", "data", "hardware", "software", "other"] as const;
  const services = ["Importaciones", "Permisos", "Analítica", "Tesorería", "Directorio", "Notificaciones"] as const;
  const impactScopes = ["individual", "team", "workspace"] as const;
  const detectionChannels = ["monitoring", "support", "team", "automation"] as const;
  const incidents: DemoScenarioDefinition["incidents"] = Array.from({ length: STANDARD_SCENARIO_COUNTS.incidents }, (_, index) => {
    const createdOffset = Math.floor((index * 171) / 59);
    const createdDate = addDays(SCENARIO_START_DATE, createdOffset);
    const daysRemaining = Math.max(0, 173 - createdOffset);
    const status = incidentStatuses[index]!;
    const priority = incidentPriorities[(index * 17) % incidentPriorities.length]!;
    const resolved = status === "resolved" || status === "closed";
    const project = projects[incidentProjectIndexes[index]!]!;
    const [title, description] = pick(syntheticIncidentCatalog, index * 5);
    return {
      id: deterministicUuid(seed, "incident", index),
      projectId: project.id,
      requesterPersonId: people[(index + 7) % 30]!.id,
      assigneePersonId: status === "registered" ? null : people[index % 8]!.id,
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
  const treasuryStatuses = [
    ...Array<"draft">(4).fill("draft"),
    ...Array<"registered">(4).fill("registered"),
    ...Array<"reconciled">(8).fill("reconciled"),
    ...Array<"validated">(104).fill("validated"),
    ...Array<"closed">(120).fill("closed"),
  ];
  const treasuryEntries: DemoScenarioDefinition["treasuryEntries"] = Array.from(
    { length: STANDARD_SCENARIO_COUNTS.treasuryEntries },
    (_, index) => {
      const monthIndex = Math.floor((index * 6) / STANDARD_SCENARIO_COUNTS.treasuryEntries);
      const monthStart = Math.ceil((monthIndex * STANDARD_SCENARIO_COUNTS.treasuryEntries) / 6);
      const monthEnd = Math.ceil(((monthIndex + 1) * STANDARD_SCENARIO_COUNTS.treasuryEntries) / 6);
      const monthCount = monthEnd - monthStart;
      const monthPosition = index - monthStart;
      const [concept, category] = pick(syntheticTreasuryConcepts, index * 7);
      const isIncome = monthPosition < 2;
      const incomeAmount = 2_700_000 + monthIndex * 18_000;
      const targetMargin = 0.11 + (monthIndex % 7) * 0.01;
      const expenseAmount = Math.round(
        (incomeAmount * 2 * (1 - targetMargin)) / (monthCount - 2),
      );
      return {
        id: deterministicUuid(seed, "treasury", index),
        source:
          index % 2 === 0 ? "Financial Source A" : "Financial Source B",
        sourceSequence: index + 1,
        entryDate: addDays(
          addMonths(SCENARIO_START_DATE, monthIndex),
          Math.floor((monthPosition * (monthIndex === 5 ? 22 : 27)) / Math.max(1, monthCount - 1)),
        ),
        concept,
        category,
        amountCents: isIncome ? incomeAmount : -expenseAmount,
        currency: "EUR",
        status: treasuryStatuses[(index * 101) % treasuryStatuses.length]!,
      };
    },
  );
  const payrollRuns: DemoScenarioDefinition["payrollRuns"] = Array.from({ length: STANDARD_SCENARIO_COUNTS.payrollRuns }, (_, index) => {
    const periodStart = addMonths(SCENARIO_START_DATE, index);
    const gross = 9_200_000 + index * 120_000 + (index % 4) * 45_000;
    const deductions = Math.round(gross * (0.195 + (index % 4) * 0.006));
    return {
      id: deterministicUuid(seed, "payroll", index),
      periodStart,
      periodEnd: index === 5 ? anchorDate : addDays(addMonths(periodStart, 1), -1),
      peopleCount: 30 + Math.min(2, Math.floor(index / 7)),
      grossTotalCents: gross,
      deductionTotalCents: deductions,
      netTotalCents: gross - deductions,
      employerCostTotalCents: Math.round(gross * (1.3 + (index % 4) * 0.01)),
      currency: "EUR",
      status: index < 4 ? "closed" : index === 4 ? "reviewed" : "validating",
    };
  });
  const changelogTimeline = [
    ["0.1.0", "Base de la plataforma", "Estructura inicial, navegación por módulos y permisos de acceso.", "2026-02-02"],
    ["0.2.0", "Gestión de vacaciones", "Solicitudes, aprobaciones, calendario de ausencias y trazabilidad.", "2026-02-16"],
    ["0.3.0", "Proyectos y tareas", "Seguimiento de proyectos, responsables, dependencias y tablero Kanban.", "2026-03-02"],
    ["0.4.0", "Incidencias y personal", "Ciclo de atención, tiempos de resolución y directorio del equipo.", "2026-03-16"],
    ["0.5.0", "Tesorería y nóminas", "Movimientos conciliados y ciclos de nómina con información agregada.", "2026-03-30"],
    ["0.6.0", "Integraciones y automatización", "Ejecuciones programadas, control de importaciones y calidad del dato.", "2026-04-20"],
    ["1.0.0", "Primera versión estable", "Acceso con Google, aislamiento por organización y revisión de seguridad.", "2026-05-24"],
    ["1.1.0", "Analítica y experiencia de uso", "Indicadores, filtros, perfiles y mejoras generales de accesibilidad.", "2026-06-01"],
    ["1.2.0", "Datos equilibrados y análisis dinámico", "Escenario operativo revisado, filtros comparables y presentación más consistente.", "2026-06-15"],
    ["1.2.1", "Ajustes finales de presentación", "Acceso, gráficos, proyectos, datos y comportamiento responsive revisados.", "2026-06-23"],
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
    scenarioVersion: 4,
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
    const costRatio = run.employerCostTotalCents / run.grossTotalCents;
    if (
      run.grossTotalCents < 9_200_000 ||
      run.grossTotalCents > 11_800_000 ||
      costRatio < 1.28 ||
      costRatio > 1.34
    ) {
      throw new Error("Payroll totals fall outside the aggregate scenario limits");
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
  if (openTasks.length !== 50 || overdueOpenTasks.length > 6) {
    throw new Error("Task workload is outside the balanced scenario limits");
  }
  if (scenario.tasks.filter((task) => task.status === "blocked").length !== 5) {
    throw new Error("The scenario must contain exactly five blocked tasks");
  }

  const openIncidents = scenario.incidents.filter(
    (incident) => !["resolved", "closed"].includes(incident.status),
  );
  const overdueIncidents = openIncidents.filter(
    (incident) => incident.slaDueAt.slice(0, 10) < scenario.anchorDate,
  );
  if (
    openIncidents.length !== 12 ||
    overdueIncidents.length > 2 ||
    scenario.incidents.filter((incident) => incident.priority === "critical").length !== 2
  ) {
    throw new Error("Incident workload is outside the balanced scenario limits");
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
        scenario.changelogEntries.length * 2,
    },
    coverage: {
      from: [...taskDates, ...leaveDates].sort()[0],
      to: [...taskDates, ...leaveDates].sort().at(-1),
    },
  };
}
