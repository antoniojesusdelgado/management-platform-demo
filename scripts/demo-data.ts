import {
  checksumScenario,
  createScenarioReport,
  generateDemoScenario,
  validateDemoScenario,
} from "../src/demo-data/scenario";

const outputDirectory = ".demo-data";
const scenarioPath = `${outputDirectory}/scenario-v2.json`;
const reportPath = `${outputDirectory}/scenario-v2-report.json`;
const command = process.argv[2] ?? "validate";
const seed = process.env.DEMO_SCENARIO_SEED ?? "management-platform-standard-v2";
const anchorDate = process.env.DEMO_SCENARIO_ANCHOR ?? "2026-07-01";
const sqlMigrationPath =
  "supabase/migrations/20260727090946_release_v1_1_scenario_v2.sql";

async function prepareScenario() {
  const scenario = validateDemoScenario(generateDemoScenario(seed, anchorDate));
  return {
    scenario,
    checksum: await checksumScenario(scenario),
    report: createScenarioReport(scenario),
  };
}

if (command === "generate") {
  const { scenario, checksum } = await prepareScenario();
  await Bun.write(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`);
  console.log(`Generated ${scenarioPath}`);
  console.log(`SHA-256 ${checksum}`);
} else if (command === "validate") {
  const first = await prepareScenario();
  const second = await prepareScenario();
  if (first.checksum !== second.checksum) {
    throw new Error("The generator is not deterministic");
  }
  const sqlMigration = await Bun.file(sqlMigrationPath).text();
  if (!sqlMigration.includes(`scenario-checksum: ${first.checksum}`)) {
    throw new Error(
      "The Scenario V2 SQL migration checksum differs from the TypeScript catalog",
    );
  }
  const expectedSeries = [
    ["people", 32, "generate_series(2, 32)"],
    ["projects", 12, "generate_series(1, 12)"],
    ["tasks", 320, "generate_series(1, 320)"],
    ["leaveRequests", 144, "generate_series(1, 144)"],
    ["incidents", 240, "generate_series(1, 240)"],
    ["treasuryEntries", 720, "generate_series(1, 720)"],
    ["payrollRuns", 24, "generate_series(1, 24)"],
    ["changelogEntries", 36, "generate_series(1, 36)"],
  ] as const;
  for (const [key, expectedCount, sqlMarker] of expectedSeries) {
    if (
      first.report.counts[key] !== expectedCount ||
      !sqlMigration.includes(sqlMarker)
    ) {
      throw new Error(`Scenario V2 count mismatch for ${key}`);
    }
  }
  console.log("Scenario is valid and deterministic");
  console.log("The SQL payload checksum and counts match the catalog");
  console.log(`SHA-256 ${first.checksum}`);
  console.log(JSON.stringify(first.report.counts, null, 2));
} else if (command === "report") {
  const { report, checksum } = await prepareScenario();
  const payload = { ...report, checksum };
  await Bun.write(reportPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(JSON.stringify(payload, null, 2));
} else if (command === "seed") {
  if (!process.argv.includes("--local")) {
    throw new Error("Seeding requires the explicit --local flag");
  }
  const { scenario, checksum } = await prepareScenario();
  await Bun.write(scenarioPath, `${JSON.stringify(scenario, null, 2)}\n`);
  console.log("Local seed payload prepared.");
  console.log("No remote database was contacted.");
  console.log(`Payload: ${scenarioPath}`);
  console.log(`SHA-256 ${checksum}`);
} else {
  throw new Error(`Unknown demo data command: ${command}`);
}
