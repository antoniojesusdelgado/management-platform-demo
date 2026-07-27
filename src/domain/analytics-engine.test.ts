import { describe, expect, test } from "bun:test";
import {
  buildAnalyticsSnapshot,
  calculateVariation,
  createAnalyticsWindow,
} from "@/domain/analytics-engine";
import { initialGuestDemoState } from "@/domain/guest-demo";

const filters = {
  period: "90d",
  comparison: "previous_period",
  projectId: null,
  team: null,
  ownerId: null,
  status: null,
  service: null,
} as const;

describe("analytics engine", () => {
  test("creates adjacent windows with the same duration", () => {
    expect(createAnalyticsWindow("30d", new Date("2026-07-27T12:00:00Z"))).toEqual({
      current: { from: "2026-06-28", to: "2026-07-27" },
      previous: { from: "2026-05-29", to: "2026-06-27" },
    });
  });

  test("returns no comparison when the baseline is zero", () => {
    expect(calculateVariation(4, 0)).toBeNull();
    expect(calculateVariation(12, 10)).toBeCloseTo(20);
  });

  test("recalculates metrics when project and period change", () => {
    const data = {
      projects: initialGuestDemoState.projects,
      tasks: initialGuestDemoState.tasks,
      incidents: initialGuestDemoState.incidents,
      people: initialGuestDemoState.people,
      leaveRequests: initialGuestDemoState.leaveRequests,
      treasuryEntries: initialGuestDemoState.treasuryEntries,
      payrollRuns: initialGuestDemoState.payrollRuns,
      integrationRuns: initialGuestDemoState.integrationRuns,
    };
    const all = buildAnalyticsSnapshot(
      data,
      filters,
      "work",
      new Date("2026-07-27T12:00:00Z"),
    );
    const project = buildAnalyticsSnapshot(
      data,
      { ...filters, period: "12m", projectId: data.projects[0]!.id },
      "work",
      new Date("2026-07-27T12:00:00Z"),
    );
    expect(project.filters.projectId).toBe(data.projects[0]!.id);
    expect(project.window).not.toEqual(all.window);
    expect(project.kpis.map((item) => item.value)).not.toEqual(
      all.kpis.map((item) => item.value),
    );
  });

  test("returns section-specific series and service-filtered indicators", () => {
    const data = {
      projects: initialGuestDemoState.projects,
      tasks: initialGuestDemoState.tasks,
      incidents: initialGuestDemoState.incidents,
      people: initialGuestDemoState.people,
      leaveRequests: initialGuestDemoState.leaveRequests,
      treasuryEntries: initialGuestDemoState.treasuryEntries,
      payrollRuns: initialGuestDemoState.payrollRuns,
      integrationRuns: initialGuestDemoState.integrationRuns,
    };
    const service = data.incidents.find(
      (incident) => incident.affectedService,
    )?.affectedService;
    expect(service).toBeTruthy();

    const work = buildAnalyticsSnapshot(
      data,
      filters,
      "work",
      new Date("2026-07-27T12:00:00Z"),
    );
    const filteredService = buildAnalyticsSnapshot(
      data,
      { ...filters, service: service ?? null },
      "service",
      new Date("2026-07-27T12:00:00Z"),
    );

    expect(work.series.map((series) => series.code)).toEqual([
      "tasks_by_status",
      "tasks_by_project",
    ]);
    expect(filteredService.series.map((series) => series.code)).toEqual([
      "incidents_by_status",
      "incidents_by_service",
    ]);
    expect(
      filteredService.series[1].points.every(
        (point) => point.period === service,
      ),
    ).toBe(true);
  });
});
