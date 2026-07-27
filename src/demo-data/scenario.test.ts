import { describe, expect, test } from "bun:test";
import {
  adaptAdventureWorksAggregates,
  adaptIneAggregates,
} from "@/demo-data/calibration";
import {
  checksumScenario,
  generateDemoScenario,
  STANDARD_SCENARIO_COUNTS,
  validateDemoScenario,
} from "@/demo-data/scenario";

describe("synthetic demo scenario", () => {
  test("generates the standard volume with valid relationships", () => {
    const scenario = validateDemoScenario(generateDemoScenario());
    expect(scenario.people).toHaveLength(STANDARD_SCENARIO_COUNTS.people);
    expect(new Set(scenario.people.map((person) => person.team)).size).toBe(
      STANDARD_SCENARIO_COUNTS.teams,
    );
    expect(scenario.projects).toHaveLength(STANDARD_SCENARIO_COUNTS.projects);
    expect(scenario.tasks).toHaveLength(STANDARD_SCENARIO_COUNTS.tasks);
    expect(scenario.leaveRequests).toHaveLength(
      STANDARD_SCENARIO_COUNTS.leaveRequests,
    );
    expect(scenario.incidents).toHaveLength(
      STANDARD_SCENARIO_COUNTS.incidents,
    );
    expect(scenario.treasuryEntries).toHaveLength(
      STANDARD_SCENARIO_COUNTS.treasuryEntries,
    );
    expect(scenario.payrollRuns).toHaveLength(
      STANDARD_SCENARIO_COUNTS.payrollRuns,
    );
    expect(scenario.changelogEntries).toHaveLength(
      STANDARD_SCENARIO_COUNTS.changelogEntries,
    );
  });

  test("is deterministic for a seed and changes for another seed", async () => {
    const first = generateDemoScenario("seed-a");
    const repeated = generateDemoScenario("seed-a");
    const other = generateDemoScenario("seed-b");
    expect(await checksumScenario(first)).toBe(
      await checksumScenario(repeated),
    );
    expect(await checksumScenario(first)).not.toBe(
      await checksumScenario(other),
    );
  });

  test("contains no personal or provider identifiers", () => {
    const payload = JSON.stringify(generateDemoScenario()).toLowerCase();
    for (const forbidden of [
      "bbva",
      "santander",
      "cibervoluntarios",
      "@",
    ]) {
      expect(payload).not.toContain(forbidden);
    }
    expect(payload).not.toMatch(/a3 (nóminas|personal)/);
  });

  test("uses natural labels and keeps every monthly cash flow positive", () => {
    const scenario = validateDemoScenario(generateDemoScenario());
    const labels = [
      ...scenario.people.map((person) => person.displayName),
      ...scenario.projects.map((project) => project.name),
      ...scenario.tasks.map((task) => task.title),
      ...scenario.incidents.map((incident) => incident.title),
    ];
    expect(
      labels.some((label) =>
        /^(persona|tarea sintética|incidencia|proyecto)\s+\d+/i.test(label),
      ),
    ).toBe(false);

    const monthly = new Map<string, number>();
    for (const entry of scenario.treasuryEntries) {
      const month = entry.entryDate.slice(0, 7);
      monthly.set(month, (monthly.get(month) ?? 0) + entry.amountCents);
    }
    expect([...monthly.values()].every((balance) => balance > 0)).toBe(true);
  });

  test("matches the balanced V4 operating distributions", () => {
    const scenario = validateDemoScenario(generateDemoScenario());
    const countBy = <T extends string>(values: T[]) =>
      Object.fromEntries(
        [...new Set(values)].map((value) => [
          value,
          values.filter((item) => item === value).length,
        ]),
      );

    expect(scenario.scenarioVersion).toBe(4);
    expect(countBy(scenario.projects.map((project) => project.status))).toEqual({
      active: 5,
      on_hold: 1,
      completed: 3,
      planned: 1,
    });
    expect(countBy(scenario.tasks.map((task) => task.status))).toEqual({
      pending: 20,
      in_progress: 15,
      blocked: 5,
      in_review: 10,
      completed: 70,
    });
    expect(countBy(scenario.tasks.map((task) => task.priority))).toEqual({
      urgent: 5,
      high: 25,
      medium: 60,
      low: 30,
    });
    expect(countBy(scenario.incidents.map((incident) => incident.status))).toEqual({
      registered: 2,
      triaged: 2,
      assigned: 3,
      investigating: 5,
      resolved: 18,
      closed: 30,
    });
    expect(countBy(scenario.incidents.map((incident) => incident.priority))).toEqual({
      critical: 2,
      high: 10,
      medium: 30,
      low: 18,
    });
    expect(scenario.payrollRuns.filter((run) => run.status === "closed")).toHaveLength(4);
    expect(scenario.payrollRuns).toHaveLength(6);
    expect(
      scenario.changelogEntries.every((entry) => entry.status === "published"),
    ).toBe(true);
  });

  test("keeps every operational date inside the public timeline", () => {
    const scenario = validateDemoScenario(generateDemoScenario());
    expect(scenario.anchorDate).toBe("2026-06-23");
    expect(scenario.payrollRuns.map((run) => run.periodStart)).toEqual([
      "2026-01-01",
      "2026-02-01",
      "2026-03-01",
      "2026-04-01",
      "2026-05-01",
      "2026-06-01",
    ]);
    expect(
      scenario.changelogEntries.map((entry) => [
        entry.version,
        entry.publishedAt?.slice(0, 10),
      ]).slice(-3),
    ).toEqual([
      ["1.1.0", "2026-06-01"],
      ["1.2.0", "2026-06-15"],
      ["1.2.1", "2026-06-23"],
    ]);
  });
});

describe("offline aggregate adapters", () => {
  const checksum = "a".repeat(64);

  test("accepts only bounded AdventureWorks aggregates", () => {
    expect(
      adaptAdventureWorksAggregates({
        sourceVersion: "reference-2025",
        sourceChecksum: checksum,
        observedAt: "2026-07-23",
        departmentCount: 16,
        productCategoryCount: 5,
        orderCount: 31_465,
        medianOrderLines: 5,
      }),
    ).toEqual({
      teamCount: 4,
      projectPortfolioSize: 8,
      workItemsPerPerson: 8,
      incidentShare: 0.3125,
    });
  });

  test("reduces INE aggregates to a bounded coefficient", () => {
    const result = adaptIneAggregates({
      sourceVersion: "aggregate-reference",
      sourceChecksum: checksum,
      observedAt: "2026-07-23",
      referencePeriod: "2026-Q1",
      activePopulationIndex: 105,
      employmentVariationRate: 0.02,
      laborCostIndex: 108,
    });
    expect(result.monthlyEconomicVariation).toBeGreaterThan(0);
    expect(result.monthlyEconomicVariation).toBeLessThanOrEqual(0.08);
  });
});
