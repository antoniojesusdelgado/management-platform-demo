import { describe, expect, test } from "bun:test";
import {
  guestDemoReducer,
  initialGuestDemoState,
  parseGuestDemoState,
} from "@/domain/guest-demo";
import { modules } from "@/domain/modules";
import { canTransitionChangelog, changelogInputSchema } from "@/domain/changelog";
import {
  calculateSyntheticSlaDueAt,
  canTransitionIncident,
  incidentInputSchema,
} from "@/domain/incidents";
import { getPersonAvailability } from "@/domain/people";
import { canTransitionPayroll, payrollInputSchema } from "@/domain/payroll";
import {
  canTransitionTask,
  createsTaskDependencyCycle,
  taskInputSchema,
} from "@/domain/tasks";
import { canTransitionTreasury, treasuryInputSchema } from "@/domain/treasury";
import {
  calculateBusinessDays,
  canTransitionLeaveRequest,
  getActiveLeaveRequestsForDate,
  leaveRequestInputSchema,
} from "@/domain/vacations";

describe("management modules", () => {
  test("defines every planned module once", () => {
    expect(modules).toHaveLength(11);
    expect(new Set(modules.map((module) => module.id)).size).toBe(11);
  });
});

describe("guest demo", () => {
  test("creates a submitted leave request with synthetic identity", () => {
    const next = guestDemoReducer(initialGuestDemoState, {
      type: "create-leave",
      input: {
        startDate: "2026-10-05",
        endDate: "2026-10-07",
        type: "vacation",
        reason: "Solicitud sintética para prueba.",
      },
    });

    expect(next.leaveRequests[0].status).toBe("submitted");
    expect(next.leaveRequests[0].employeeName).toBe("Usuario invitado");
    expect(next.leaveRequests[0].businessDays).toBe(3);
  });

  test("restores the initial state", () => {
    const changed = { ...initialGuestDemoState, organizationName: "Otra" };
    expect(guestDemoReducer(changed, { type: "reset" })).toEqual(
      initialGuestDemoState,
    );
  });

  test("accepts valid stored state and rejects malformed sessions", () => {
    expect(parseGuestDemoState(initialGuestDemoState)).toEqual(
      initialGuestDemoState,
    );
    expect(
      parseGuestDemoState({ ...initialGuestDemoState, version: 99 }),
    ).toBeNull();
    expect(
      parseGuestDemoState({ ...initialGuestDemoState, leaveRequests: [{}] }),
    ).toBeNull();
  });

  test("migrates version 1 sessions without losing leave data", () => {
    const legacy = {
      version: 1,
      activeModule: initialGuestDemoState.activeModule,
      organizationName: initialGuestDemoState.organizationName,
      leaveRequests: initialGuestDemoState.leaveRequests,
      leaveEvents: initialGuestDemoState.leaveEvents,
    };
    const migrated = parseGuestDemoState(legacy);

    expect(migrated?.version).toBe(19);
    expect(migrated?.leaveRequests).toEqual(legacy.leaveRequests);
    expect(migrated?.tasks.length).toBeGreaterThan(0);
    expect(migrated?.incidents.length).toBeGreaterThan(0);
    expect(migrated?.people.length).toBeGreaterThan(0);
    expect(migrated?.treasuryEntries.length).toBeGreaterThan(0);
    expect(migrated?.payrollRuns.length).toBeGreaterThan(0);
    expect(migrated?.projects.length).toBeGreaterThan(0);
  });

  test("migrates version 2 sessions without losing task data", () => {
    const legacy = {
      version: 2,
      activeModule: initialGuestDemoState.activeModule,
      organizationName: initialGuestDemoState.organizationName,
      leaveRequests: initialGuestDemoState.leaveRequests,
      leaveEvents: initialGuestDemoState.leaveEvents,
      tasks: initialGuestDemoState.tasks,
      taskDependencies: initialGuestDemoState.taskDependencies,
      taskComments: initialGuestDemoState.taskComments,
      taskEvents: initialGuestDemoState.taskEvents,
    };
    const migrated = parseGuestDemoState(legacy);
    expect(migrated?.version).toBe(19);
    expect(migrated?.tasks).toEqual(legacy.tasks);
  });

  test("migrates version 3 sessions without losing incidents or people", () => {
    const legacy = {
      version: 3,
      activeModule: initialGuestDemoState.activeModule,
      organizationName: initialGuestDemoState.organizationName,
      leaveRequests: initialGuestDemoState.leaveRequests,
      leaveEvents: initialGuestDemoState.leaveEvents,
      tasks: initialGuestDemoState.tasks,
      taskDependencies: initialGuestDemoState.taskDependencies,
      taskComments: initialGuestDemoState.taskComments,
      taskEvents: initialGuestDemoState.taskEvents,
      incidents: initialGuestDemoState.incidents,
      incidentEvents: initialGuestDemoState.incidentEvents,
      people: initialGuestDemoState.people,
      peopleEvents: initialGuestDemoState.peopleEvents,
    };
    const migrated = parseGuestDemoState(legacy);
    expect(migrated?.version).toBe(19);
    expect(migrated?.incidents).toEqual(legacy.incidents);
    expect(migrated?.roles.length).toBeGreaterThan(0);
  });

  test("migrates version 4 sessions without losing settings", () => {
    const { treasuryEntries, treasuryEvents, payrollRuns, payrollEvents, ...legacyState } = initialGuestDemoState;
    void treasuryEntries;
    void treasuryEvents;
    void payrollRuns;
    void payrollEvents;
    const migrated = parseGuestDemoState({ ...legacyState, version: 4 });
    expect(migrated?.version).toBe(19);
    expect(migrated?.roles).toEqual(legacyState.roles);
    expect(migrated?.treasuryEntries.length).toBeGreaterThan(0);
  });

  test("migrates version 5 sessions without losing Treasury data", () => {
    const { payrollRuns, payrollEvents, ...legacyState } = initialGuestDemoState;
    void payrollRuns;
    void payrollEvents;
    const migrated = parseGuestDemoState({ ...legacyState, version: 5 });
    expect(migrated?.version).toBe(19);
    expect(migrated?.treasuryEntries).toEqual(legacyState.treasuryEntries);
    expect(migrated?.payrollRuns.length).toBeGreaterThan(0);
  });

  test("migrates version 7 sessions with neutral connectors", () => {
    const {
      integrationConnectors,
      integrationRuns,
      dataQualityIssues,
      preferences,
      savedAnalyticsViews,
      ...version7State
    } = initialGuestDemoState;
    void integrationConnectors;
    void integrationRuns;
    void dataQualityIssues;
    void preferences;
    void savedAnalyticsViews;

    const migrated = parseGuestDemoState({
      ...version7State,
      version: 7,
      scenarioVersion: 1,
    });

    expect(migrated?.version).toBe(19);
    expect(migrated?.integrationConnectors).toHaveLength(4);
    expect(migrated?.integrationRuns.length).toBeGreaterThan(0);
  });

  test("migrates version 8 sessions with safe user preferences", () => {
    const { preferences, savedAnalyticsViews, ...version8State } =
      initialGuestDemoState;
    void preferences;
    void savedAnalyticsViews;

    const migrated = parseGuestDemoState({
      ...version8State,
      version: 8,
      scenarioVersion: 1,
    });

    expect(migrated?.version).toBe(19);
    expect(migrated?.preferences.simulatedRole).toBeNull();
    expect(migrated?.savedAnalyticsViews).toEqual([]);
  });

  test("restores version 10 sessions with the current balanced scenario", () => {
    const migrated = parseGuestDemoState({
      ...initialGuestDemoState,
      version: 10,
      scenarioVersion: 2,
    });

    expect(migrated?.version).toBe(19);
    expect(migrated?.scenarioVersion).toBe(7);
    expect(migrated?.projects).toHaveLength(10);
    expect(migrated?.tasks).toHaveLength(initialGuestDemoState.tasks.length);
    expect(migrated?.incidents).toHaveLength(
      initialGuestDemoState.incidents.length,
    );
    expect(migrated?.treasuryEntries.length).toBeGreaterThan(0);
  });

  test("restores version 11 sessions once with the balanced V6 scenario", () => {
    const migrated = parseGuestDemoState({
      ...initialGuestDemoState,
      version: 11,
      scenarioVersion: 3,
    });

    expect(migrated?.version).toBe(19);
    expect(migrated?.scenarioVersion).toBe(7);
    expect(migrated?.payrollRuns.length).toBeGreaterThan(0);
    expect(migrated?.changelogEntries.at(-1)?.version).toBe("1.5.1");
  });

  test("extends version 14 sessions without overwriting operational changes", () => {
    const changedTask = {
      ...initialGuestDemoState.tasks[0]!,
      title: "Cambio manual conservado",
      status: "blocked" as const,
    };
    const migrated = parseGuestDemoState({
      ...initialGuestDemoState,
      version: 14,
      scenarioVersion: 6,
      tasks: [changedTask, ...initialGuestDemoState.tasks.slice(1, 25)],
      changelogEntries: initialGuestDemoState.changelogEntries.slice(0, 2),
      changelogEvents: initialGuestDemoState.changelogEvents.slice(0, 2),
    });

    expect(migrated?.version).toBe(19);
    expect(migrated?.tasks.find((task) => task.id === changedTask.id)).toEqual(
      changedTask,
    );
    expect(migrated!.tasks.length).toBeGreaterThan(25);
    expect(migrated?.changelogEntries).toHaveLength(9);
    expect(migrated?.changelogEntries.at(-1)?.version).toBe("1.5.1");
    expect(migrated?.changelogEvents).toHaveLength(9);
  });

  test("adds patch releases once to existing version 15 sessions", () => {
    const retainedEntry = {
      ...initialGuestDemoState.changelogEntries[0]!,
      title: "Novedad manual conservada",
    };
    const migrated = parseGuestDemoState({
      ...initialGuestDemoState,
      version: 15,
      preferences: {
        ...initialGuestDemoState.preferences,
        theme: "system",
      },
      changelogEntries: [retainedEntry],
      changelogEvents: [],
    });

    expect(migrated?.version).toBe(19);
    expect(migrated?.preferences.theme).toBe("light");
    expect(migrated?.changelogEntries[0]).toEqual(retainedEntry);
    expect(
      migrated?.changelogEntries.filter((entry) => entry.version === "1.3.0"),
    ).toHaveLength(1);
    expect(
      parseGuestDemoState(migrated)?.changelogEntries.filter(
        (entry) => entry.version === "1.3.0",
      ),
    ).toHaveLength(1);
    expect(
      parseGuestDemoState(migrated)?.changelogEntries.filter(
        (entry) => entry.version === "1.3.1",
      ),
    ).toHaveLength(1);
    expect(
      parseGuestDemoState(migrated)?.changelogEntries.filter(
        (entry) => entry.version === "1.5.1",
      ),
    ).toHaveLength(1);
  });

  test("adds v1.3.1 once to existing version 16 sessions", () => {
    const migrated = parseGuestDemoState({
      ...initialGuestDemoState,
      version: 16,
      changelogEntries: initialGuestDemoState.changelogEntries.filter(
        (entry) => entry.version !== "1.3.1",
      ),
      changelogEvents: initialGuestDemoState.changelogEvents.filter(
        (event) =>
          event.entryId !==
          initialGuestDemoState.changelogEntries.find(
            (entry) => entry.version === "1.3.1",
          )?.id,
      ),
    });

    expect(migrated?.version).toBe(19);
    expect(
      migrated?.changelogEntries.filter((entry) => entry.version === "1.3.1"),
    ).toHaveLength(1);
  });

  test("adds v1.3.2 and refreshes canonical copy in version 17 sessions", () => {
    const legacyEntry = {
      ...initialGuestDemoState.changelogEntries.find(
        (entry) => entry.version === "1.3.1",
      )!,
      title: "Corrección responsive y seguridad",
      summary: "Tareas móviles, backfill aditivo y controles reforzados.",
    };
    const migrated = parseGuestDemoState({
      ...initialGuestDemoState,
      version: 17,
      changelogEntries: [legacyEntry],
      changelogEvents: [],
    });

    expect(migrated?.version).toBe(19);
    expect(
      migrated?.changelogEntries.filter((entry) => entry.version === "1.3.2"),
    ).toHaveLength(1);
    expect(
      migrated?.changelogEntries.find((entry) => entry.version === "1.3.1")
        ?.title,
    ).toBe("Más cómoda en móvil y más segura");
    expect(parseGuestDemoState(migrated)?.version).toBe(19);
  });

  test("adds releases through v1.5.1 once to version 18 sessions", () => {
    const retainedEntry = {
      ...initialGuestDemoState.changelogEntries.find(
        (entry) => entry.version === "1.5.0",
      )!,
      title: "Título editorial conservado",
    };
    const migrated = parseGuestDemoState({
      ...initialGuestDemoState,
      version: 18,
      changelogEntries: [retainedEntry],
      changelogEvents: [],
    });

    expect(migrated?.version).toBe(19);
    expect(
      migrated?.changelogEntries.find((entry) => entry.version === "1.5.0"),
    ).toEqual(retainedEntry);
    expect(
      migrated?.changelogEntries.filter((entry) => entry.version === "1.5.1"),
    ).toHaveLength(1);
    expect(
      parseGuestDemoState(migrated)?.changelogEntries.filter(
        (entry) => entry.version === "1.5.1",
      ),
    ).toHaveLength(1);
  });

  test("simulates an idempotent neutral integration inside the session", () => {
    const connector = initialGuestDemoState.integrationConnectors.find(
      ({ kind }) => kind === "financial",
    )!;
    const next = guestDemoReducer(initialGuestDemoState, {
      type: "simulate-integration",
      connectorId: connector.id,
    });

    expect(next.integrationRuns).toHaveLength(
      initialGuestDemoState.integrationRuns.length + 1,
    );
    expect(next.integrationRuns[0].connectorId).toBe(connector.id);
    expect(next.integrationRuns[0].processedCount).toBe(36);
    expect(next.integrationRuns[0].triggerKind).toBe("manual");
  });

  test("ignores invalid leave transitions without corrupting guest state", () => {
    const next = guestDemoReducer(initialGuestDemoState, {
      type: "transition-leave",
      requestId: "leave-002",
      status: "rejected",
      note: "Transición no permitida.",
    });

    expect(next).toBe(initialGuestDemoState);
  });
});

describe("leave validation", () => {
  test("rejects an inverted date range", () => {
    const result = leaveRequestInputSchema.safeParse({
      startDate: "2026-10-08",
      endDate: "2026-10-02",
      type: "vacation",
      reason: "Solicitud con fechas no válidas.",
    });

    expect(result.success).toBe(false);
  });

  test("allows only explicit workflow transitions", () => {
    expect(canTransitionLeaveRequest("submitted", "approved")).toBe(true);
    expect(canTransitionLeaveRequest("draft", "submitted")).toBe(true);
    expect(canTransitionLeaveRequest("approved", "rejected")).toBe(false);
  });

  test("excludes weekends from the requested business days", () => {
    expect(calculateBusinessDays("2026-10-09", "2026-10-12")).toBe(2);
  });

  test("detects active leave overlaps for the calendar", () => {
    const overlapping = getActiveLeaveRequestsForDate(
      [
        {
          ...initialGuestDemoState.leaveRequests[0],
          startDate: "2026-08-03",
          endDate: "2026-08-07",
          status: "submitted",
        },
        {
          ...initialGuestDemoState.leaveRequests[1],
          startDate: "2026-08-05",
          endDate: "2026-08-06",
          status: "approved",
        },
        {
          ...initialGuestDemoState.leaveRequests[2],
          startDate: "2026-08-05",
          endDate: "2026-08-05",
          status: "cancelled",
        },
      ],
      new Date("2026-08-05T12:00:00.000Z"),
    );

    expect(overlapping).toHaveLength(2);
  });
});

describe("task workflow", () => {
  test("uses its own explicit workflow", () => {
    expect(canTransitionTask("pending", "in_progress")).toBe(true);
    expect(canTransitionTask("in_progress", "in_review")).toBe(true);
    expect(canTransitionTask("pending", "completed")).toBe(false);
  });

  test("rejects self-dependencies and directed cycles", () => {
    expect(createsTaskDependencyCycle([], "task-001", "task-001")).toBe(true);
    expect(
      createsTaskDependencyCycle(
        [
          {
            id: "dependency-test",
            taskId: "task-002",
            dependsOnTaskId: "task-001",
            createdAt: "2026-07-22T10:00:00.000Z",
          },
        ],
        "task-001",
        "task-002",
      ),
    ).toBe(true);
  });

  test("creates and transitions a task while recording activity", () => {
    const created = guestDemoReducer(initialGuestDemoState, {
      type: "create-task",
      input: {
        title: "Preparar escenario sintético",
        description: "Contenido de prueba sin información profesional real.",
        priority: "high",
        assigneeName: "Usuario invitado",
        dueDate: "2026-08-10",
      },
    });
    const task = created.tasks[0];
    const transitioned = guestDemoReducer(created, {
      type: "transition-task",
      taskId: task.id,
      status: "in_progress",
      note: "Trabajo iniciado en la sesión.",
    });

    expect(taskInputSchema.safeParse(task).success).toBe(true);
    expect(transitioned.tasks[0].status).toBe("in_progress");
    expect(transitioned.taskEvents[0].fromStatus).toBe("pending");
  });
});

describe("incident workflow", () => {
  test("allows only explicit transitions and calculates the synthetic SLA", () => {
    expect(canTransitionIncident("registered", "triaged")).toBe(true);
    expect(canTransitionIncident("registered", "resolved")).toBe(false);
    expect(calculateSyntheticSlaDueAt("critical", "2026-07-22T08:00:00.000Z")).toBe("2026-07-22T12:00:00.000Z");
  });

  test("creates an incident and records immutable activity", () => {
    const next = guestDemoReducer(initialGuestDemoState, {
      type: "create-incident",
      input: { title: "Caso sintético", description: "Descripción totalmente sintética.", priority: "high", category: "software", assigneeName: null },
    });
    expect(incidentInputSchema.safeParse(next.incidents[0]).success).toBe(true);
    expect(next.incidents[0].status).toBe("registered");
    expect(next.incidentEvents[0].kind).toBe("created");
  });
});

describe("people directory", () => {
  test("derives availability from approved leave without duplicating it", () => {
    const approved = initialGuestDemoState.leaveRequests.find(
      (request) => request.status === "approved",
    )!;
    const person = {
      ...initialGuestDemoState.people[1],
      displayName: approved.employeeName,
    };
    expect(
      getPersonAvailability(
        person,
        initialGuestDemoState.leaveRequests,
        approved.startDate,
      ),
    ).toBe("on_leave");
    expect(
      getPersonAvailability(
        person,
        initialGuestDemoState.leaveRequests,
        "2030-01-01",
      ),
    ).toBe("available");
  });
});

describe("changelog workflow", () => {
  test("uses draft, review and publication as explicit transitions", () => {
    expect(canTransitionChangelog("draft", "in_review")).toBe(true);
    expect(canTransitionChangelog("in_review", "published")).toBe(true);
    expect(canTransitionChangelog("published", "draft")).toBe(false);
  });

  test("creates and publishes a synthetic changelog entry with history", () => {
    const created = guestDemoReducer(initialGuestDemoState, { type: "create-changelog", input: { version: "0.5.0", title: "Entrada sintética", summary: "Contenido demostrativo preparado para una revisión." } });
    const entry = created.changelogEntries[0];
    expect(changelogInputSchema.safeParse(entry).success).toBe(true);
    const reviewed = guestDemoReducer(created, { type: "transition-changelog", entryId: entry.id, status: "in_review", note: "Enviada a revisión." });
    const published = guestDemoReducer(reviewed, { type: "transition-changelog", entryId: entry.id, status: "published", note: "Contenido revisado." });
    expect(published.changelogEntries[0].publishedAt).not.toBeNull();
    expect(published.changelogEvents[0].toStatus).toBe("published");
  });
});

describe("guest settings", () => {
  test("keeps permissions unchanged when role metadata changes", () => {
    const role = initialGuestDemoState.roles.find((item) => item.code === "manager")!;
    const next = guestDemoReducer(initialGuestDemoState, { type: "update-role-metadata", roleId: role.id, name: "Coordinación", color: "#123456" });
    const updated = next.roles.find((item) => item.id === role.id)!;
    expect(updated.name).toBe("Coordinación");
    expect(updated.permissionCodes).toEqual(role.permissionCodes);
    expect(next.adminAuditEvents[0].eventType).toBe("role.metadata_updated");
  });

  test("does not allow disabling the home module", () => {
    const next = guestDemoReducer(initialGuestDemoState, { type: "update-module-setting", moduleId: "inicio", enabled: false, sortOrder: 0 });
    expect(next).toBe(initialGuestDemoState);
  });
});

describe("treasury workflow", () => {
  test("uses a strict monotonic control flow", () => {
    expect(canTransitionTreasury("draft", "registered")).toBe(true);
    expect(canTransitionTreasury("registered", "reconciled")).toBe(true);
    expect(canTransitionTreasury("reconciled", "closed")).toBe(false);
    expect(canTransitionTreasury("closed", "registered")).toBe(false);
  });

  test("creates and traces an aggregated synthetic movement", () => {
    const input = {
      entryDate: "2026-07-22",
      concept: "Movimiento agregado de prueba",
      amountCents: -25_000,
      currency: "EUR" as const,
    };
    expect(treasuryInputSchema.safeParse(input).success).toBe(true);
    const created = guestDemoReducer(initialGuestDemoState, { type: "create-treasury", input });
    const entry = created.treasuryEntries[0];
    expect(entry.status).toBe("draft");
    expect(created.treasuryEvents[0].kind).toBe("created");

    const registered = guestDemoReducer(created, {
      type: "transition-treasury",
      entryId: entry.id,
      status: "registered",
      note: "Registro sintético comprobado.",
    });
    expect(registered.treasuryEntries[0].status).toBe("registered");
    expect(registered.treasuryEvents[0].fromStatus).toBe("draft");
  });

  test("rejects skipped Treasury controls", () => {
    const entry = initialGuestDemoState.treasuryEntries.find((item) => item.status === "registered")!;
    const next = guestDemoReducer(initialGuestDemoState, {
      type: "transition-treasury",
      entryId: entry.id,
      status: "validated",
      note: "Intento de salto de control.",
    });
    expect(next).toBe(initialGuestDemoState);
  });
});

describe("payroll workflow", () => {
  test("uses a strict monotonic aggregate control flow", () => {
    expect(canTransitionPayroll("collecting", "validating")).toBe(true);
    expect(canTransitionPayroll("validating", "reviewed")).toBe(false);
    expect(canTransitionPayroll("closed", "collecting")).toBe(false);
  });

  test("creates a consistent aggregated synthetic cycle and traces it", () => {
    const input = { periodStart: "2026-09-01", periodEnd: "2026-09-30", peopleCount: 20, grossTotalCents: 580_000, deductionTotalCents: 108_000, currency: "EUR" as const, notes: "Ciclo agregado de prueba." };
    expect(payrollInputSchema.safeParse(input).success).toBe(true);
    const created = guestDemoReducer(initialGuestDemoState, { type: "create-payroll", input });
    expect(created.payrollRuns[0].netTotalCents).toBe(472_000);
    expect(created.payrollRuns[0].status).toBe("collecting");
    const validating = guestDemoReducer(created, { type: "transition-payroll", runId: created.payrollRuns[0].id, status: "validating", note: "Datos agregados comprobados." });
    expect(validating.payrollRuns[0].status).toBe("validating");
    expect(validating.payrollEvents[0].fromStatus).toBe("collecting");
  });

  test("rejects inconsistent totals and skipped controls", () => {
    expect(payrollInputSchema.safeParse({ periodStart: "2026-09-01", periodEnd: "2026-09-30", peopleCount: 20, grossTotalCents: 100, deductionTotalCents: 101, currency: "EUR", notes: "" }).success).toBe(false);
    const run = initialGuestDemoState.payrollRuns.find((item) => item.status === "validating")!;
    expect(guestDemoReducer(initialGuestDemoState, { type: "transition-payroll", runId: run.id, status: "closed", note: "Intento de salto." })).toBe(initialGuestDemoState);
  });
});
