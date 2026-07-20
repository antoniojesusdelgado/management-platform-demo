import { describe, expect, test } from "bun:test";
import {
  guestDemoReducer,
  initialGuestDemoState,
} from "@/domain/guest-demo";
import { modules } from "@/domain/modules";
import {
  calculateBusinessDays,
  canTransitionLeaveRequest,
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
    expect(canTransitionLeaveRequest("approved", "rejected")).toBe(false);
  });

  test("excludes weekends from the requested business days", () => {
    expect(calculateBusinessDays("2026-10-09", "2026-10-12")).toBe(2);
  });
});
