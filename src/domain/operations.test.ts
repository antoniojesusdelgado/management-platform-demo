import { describe, expect, test } from "bun:test";
import { buildMailComposerUrl, buildMailtoUrl, capacityStatus, createDefaultOperationsState, operationsStateSchema } from "@/domain/operations";

describe("operations domain", () => {
  test("creates a valid deterministic guest state", () => {
    const first = createDefaultOperationsState("2026-08-10");
    const second = createDefaultOperationsState("2026-08-10");
    expect(operationsStateSchema.safeParse(first).success).toBe(true);
    expect(first).toEqual(second);
    expect(first.workspaceConnections).toHaveLength(2);
  });

  test("accepts PostgreSQL timestamps with an explicit UTC offset", () => {
    const state = createDefaultOperationsState("2026-08-10");
    const timestamp = "2026-08-10T09:00:00+00:00";
    const result = operationsStateSchema.safeParse({
      ...state,
      automationRuns: state.automationRuns.map((run) => ({ ...run, createdAt: timestamp })),
      operationalNotifications: state.operationalNotifications.map((notification) => ({ ...notification, createdAt: timestamp })),
      exportJobs: state.exportJobs.map((job) => ({ ...job, createdAt: timestamp })),
    });

    expect(result.success).toBe(true);
  });

  test("reports overload without blocking the allocation", () => {
    const allocation = createDefaultOperationsState().capacityAllocations.find((item) => item.allocatedHours > item.availableHours)!;
    expect(capacityStatus(allocation)).toEqual({ remaining: -4, utilization: 110, state: "over" });
  });

  test("uses provider composers without mailbox permissions", () => {
    const gmail = buildMailComposerUrl("google_workspace", { subject: "Revisión", body: "Contenido seguro" });
    const outlook = buildMailComposerUrl("microsoft_365", { subject: "Revisión", body: "Contenido seguro" });
    const fallback = buildMailtoUrl({ subject: "Revisión", body: "Contenido seguro" });
    expect(gmail).toStartWith("https://mail.google.com/mail/");
    expect(outlook).toStartWith("https://outlook.office.com/mail/deeplink/compose");
    expect(fallback).toStartWith("mailto:?");
    expect(decodeURIComponent(gmail.replaceAll("+", " "))).toContain("Contenido seguro");
  });
});
