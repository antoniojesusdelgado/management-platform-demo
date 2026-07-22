import { describe, expect, test } from "bun:test";
import {
  guestDemoReducer,
  initialGuestDemoState,
  parseGuestDemoState,
} from "@/domain/guest-demo";
import { modules } from "@/domain/modules";
import {
  canTransitionTask,
  createsTaskDependencyCycle,
  taskInputSchema,
} from "@/domain/tasks";
import {
  calculateBusinessDays,
  canTransitionLeaveRequest,
  getActiveLeaveRequestsForDate,
  leaveRequestInputSchema,
} from "@/domain/vacations";

describe("management modules", () => {
  test("defines every planned module once", () => {
    expect(modules).toHaveLength(9);
    expect(new Set(modules.map((module) => module.id)).size).toBe(9);
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

    expect(migrated?.version).toBe(2);
    expect(migrated?.leaveRequests).toEqual(legacy.leaveRequests);
    expect(migrated?.tasks.length).toBeGreaterThan(0);
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
        initialGuestDemoState.leaveRequests[0],
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
