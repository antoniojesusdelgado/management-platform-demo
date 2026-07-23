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
