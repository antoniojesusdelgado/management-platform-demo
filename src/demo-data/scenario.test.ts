import { describe, expect, test } from "bun:test";
import {
  adaptAdventureWorksAggregates,
  adaptIneAggregates,
} from "@/demo-data/calibration";
import {
  checksumScenario,
  countActivePeopleOnDate,
  generateDemoScenario,
  getScenarioPeriodCounts,
  STANDARD_SCENARIO_COUNTS,
  validateDemoScenario,
} from "@/demo-data/scenario";

describe("synthetic demo scenario", () => {
  test("generates the standard volume with valid relationships", () => {
    const scenario = validateDemoScenario(generateDemoScenario());
    const periodCounts = getScenarioPeriodCounts(scenario.anchorDate);
    expect(scenario.people).toHaveLength(STANDARD_SCENARIO_COUNTS.people);
    expect(new Set(scenario.people.map((person) => person.team)).size).toBe(
      STANDARD_SCENARIO_COUNTS.teams,
    );
    expect(scenario.projects).toHaveLength(STANDARD_SCENARIO_COUNTS.projects);
    expect(scenario.tasks).toHaveLength(periodCounts.tasks);
    expect(scenario.leaveRequests).toHaveLength(periodCounts.leaveRequests);
    expect(scenario.incidents).toHaveLength(periodCounts.incidents);
    expect(scenario.treasuryEntries).toHaveLength(periodCounts.treasuryEntries);
    expect(scenario.payrollRuns).toHaveLength(periodCounts.payrollRuns);
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

  test("matches the balanced V7 operating distributions", () => {
    const scenario = validateDemoScenario(generateDemoScenario());
    const periodCounts = getScenarioPeriodCounts(scenario.anchorDate);
    const countBy = <T extends string>(values: T[]) =>
      Object.fromEntries(
        [...new Set(values)].map((value) => [
          value,
          values.filter((item) => item === value).length,
        ]),
      );

    expect(scenario.scenarioVersion).toBe(7);
    expect(countBy(scenario.projects.map((project) => project.status))).toEqual({
      active: 5,
      on_hold: 1,
      completed: 3,
      planned: 1,
    });
    const taskStatuses = countBy(
      scenario.tasks.map((task) => task.status),
    );
    const completionRatio =
      (taskStatuses.completed ?? 0) / scenario.tasks.length;
    expect(completionRatio).toBeGreaterThanOrEqual(0.85);
    expect(completionRatio).toBeLessThanOrEqual(0.9);
    expect(taskStatuses.pending).toBeGreaterThan(0);
    expect(taskStatuses.in_progress).toBeGreaterThan(0);
    expect(taskStatuses.blocked).toBeGreaterThan(0);
    expect(taskStatuses.in_review).toBeGreaterThan(0);
    expect(
      Object.keys(
        countBy(
          scenario.people.map((person) => person.employmentContractType),
        ),
      ).sort(),
    ).toEqual([
      "indefinite_ordinary",
      "permanent_discontinuous",
      "temporary_production",
      "temporary_substitution",
    ]);
    expect(
      Object.keys(countBy(scenario.tasks.map((task) => task.priority))).sort(),
    ).toEqual(["high", "low", "medium", "urgent"]);
    expect(
      scenario.incidents.filter((incident) =>
        ["registered", "triaged", "assigned", "investigating"].includes(
          incident.status,
        ),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      scenario.incidents.filter((incident) =>
        ["resolved", "closed"].includes(incident.status),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      scenario.leaveRequests.filter((request) => request.status === "approved")
        .length,
    ).toBeGreaterThan(0);
    expect(scenario.treasuryEntries).toHaveLength(periodCounts.treasuryEntries);
    expect(scenario.payrollRuns.filter((run) => run.status === "closed")).toHaveLength(
      Math.max(0, periodCounts.payrollRuns - 2),
    );
    expect(scenario.payrollRuns).toHaveLength(periodCounts.payrollRuns);
    expect(scenario.payrollParticipants).toHaveLength(
      scenario.payrollRuns.reduce((total, run) => total + run.peopleCount, 0),
    );
    expect(scenario.integrationRuns).toHaveLength(periodCounts.integrationRuns);
    expect(
      scenario.changelogEntries.every((entry) => entry.status === "published"),
    ).toBe(true);
  });

  test("keeps every operational date inside the public timeline", () => {
    const scenario = validateDemoScenario(
      generateDemoScenario("management-platform-timeline-v7", "2026-06-17"),
    );
    expect(scenario.anchorDate).toBe("2026-06-17");
    expect(scenario.payrollRuns).toHaveLength(18);
    expect(scenario.payrollRuns.at(0)?.periodStart).toBe("2025-01-01");
    expect(scenario.payrollRuns.at(-1)?.periodStart).toBe("2026-06-01");
    expect(
      scenario.changelogEntries.map((entry) => [
        entry.version,
        entry.publishedAt?.slice(0, 10),
      ]).slice(-5),
    ).toEqual([
      ["1.5.1", "2026-08-07"],
      ["1.6.0", "2026-08-10"],
      ["1.7.0", "2026-08-10"],
      ["1.8.0", "2026-08-11"],
      ["1.8.1", "2026-08-11"],
    ]);
  });

  test("reconstructs the planned workforce curve with controlled reductions", () => {
    const scenario = validateDemoScenario(
      generateDemoScenario("management-platform-workforce-v7", "2026-06-30"),
    );

    expect(countActivePeopleOnDate(scenario.people, "2025-01-01")).toBe(100);
    expect(countActivePeopleOnDate(scenario.people, "2025-06-30")).toBe(145);
    expect(countActivePeopleOnDate(scenario.people, "2025-08-31")).toBe(142);
    expect(countActivePeopleOnDate(scenario.people, "2025-12-31")).toBe(180);
    expect(countActivePeopleOnDate(scenario.people, "2026-03-31")).toBe(215);
    expect(countActivePeopleOnDate(scenario.people, "2026-04-30")).toBe(212);
    expect(countActivePeopleOnDate(scenario.people, "2026-06-30")).toBe(250);
  });

  test("keeps the TypeScript and SQL directory name mappings identical", async () => {
    const sql = await Bun.file(
      "supabase/migrations/20260730083225_release_v1_3_2_directory_editorial.sql",
    ).text();
    const readSqlArray = (name: string) => {
      const match = sql.match(
        new RegExp(`${name} constant text\\[\\] := array\\[(.*?)\\];`, "s"),
      );
      expect(match).not.toBeNull();
      return [...match![1]!.matchAll(/'([^']+)'/g)].map((item) => item[1]!);
    };
    const firstNames = readSqlArray("first_names");
    const surnames = readSqlArray("surnames");
    const scenario = generateDemoScenario(
      "management-platform-standard-v7",
      "2026-07-29",
    );

    expect(firstNames).toHaveLength(32);
    expect(surnames).toHaveLength(32);
    expect(
      scenario.people.map((person, index) => {
        const surnameIndex =
          index < 32 ? index : (index + Math.floor(index / 32) * 7) % 32;
        return `${firstNames[index % 32]} ${surnames[surnameIndex]}`;
      }),
    ).toEqual(scenario.people.map((person) => person.displayName));
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
