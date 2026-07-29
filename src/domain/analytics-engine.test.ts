import { describe, expect, test } from "bun:test";
import {
  buildAnalyticsServiceDimensions,
  buildAnalyticsSnapshot,
  calculateVariation,
  createAnalyticsWindow,
} from "@/domain/analytics-engine";
import { controlCenterMetrics } from "@/domain/analytics";
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
      integrationConnectors: initialGuestDemoState.integrationConnectors,
    };
    const serviceLabel = data.incidents.find(
      (incident) => incident.affectedService,
    )?.affectedService;
    const service = buildAnalyticsServiceDimensions(data).find(
      (dimension) => dimension.label === serviceLabel,
    )?.code;
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
        (point) => point.period === serviceLabel,
      ),
    ).toBe(true);
  });

  test("fills every visible month in the public scenario timeline", () => {
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
    const snapshot = buildAnalyticsSnapshot(
      data,
      { ...filters, period: "12m" },
      "executive",
      new Date("2026-06-17T12:00:00Z"),
    );

    expect(snapshot.series[0]?.points.map((point) => point.period)).toEqual([
      "2025-07",
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
  });

  test("uses public metric definitions without implementation identifiers", () => {
    const forbiddenTerms = [
      "on_track",
      "due_date",
      "leave_requests",
      "projects",
      "workspace",
    ];
    const publicCopy = controlCenterMetrics
      .map((metric) =>
        [
          metric.description,
          metric.interpretation,
          metric.sourceLabel,
          metric.updateFrequency,
        ].join(" "),
      )
      .join(" ")
      .toLocaleLowerCase("es");

    for (const term of forbiddenTerms) {
      expect(publicCopy).not.toContain(term);
    }
    expect(
      controlCenterMetrics.every(
        (metric) =>
          metric.description.length > 20 &&
          metric.interpretation.length > 20 &&
          metric.sourceLabel.length > 2 &&
          metric.updateFrequency.length > 10,
      ),
    ).toBe(true);
  });

  test("calculates integration success from completed runs in each window", () => {
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
      { ...filters, period: "all" },
      "executive",
      new Date("2026-06-17T12:00:00Z"),
    );
    const recent = buildAnalyticsSnapshot(
      data,
      { ...filters, period: "90d" },
      "executive",
      new Date("2026-06-17T12:00:00Z"),
    );
    const allSuccess = all.kpis.find(
      (item) => item.code === "integration_success",
    );
    const recentSuccess = recent.kpis.find(
      (item) => item.code === "integration_success",
    );

    expect(allSuccess?.hasData).toBe(true);
    expect(recentSuccess?.hasData).toBe(true);
    expect(allSuccess?.value).toBeGreaterThan(0);
    expect(recentSuccess?.value).toBeGreaterThan(0);
    expect(allSuccess?.value).not.toBe(recentSuccess?.value);
  });
});
