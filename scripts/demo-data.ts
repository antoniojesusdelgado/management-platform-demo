import {
  checksumScenario,
  createScenarioReport,
  generateDemoScenario,
  validateDemoScenario,
} from "../src/demo-data/scenario";

const outputDirectory = ".demo-data";
const scenarioPath = `${outputDirectory}/scenario-v6.json`;
const reportPath = `${outputDirectory}/scenario-v6-report.json`;
const command = process.argv[2] ?? "validate";
const seed = process.env.DEMO_SCENARIO_SEED ?? "management-platform-standard-v6";
const anchorDate = process.env.DEMO_SCENARIO_ANCHOR ?? "2026-06-17";
const sqlMigrationPath =
  "supabase/migrations/20260728160000_maintenance_v1_2_2_scenario_v6.sql";

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
      "The Scenario V6 SQL migration checksum differs from the TypeScript catalog",
    );
  }
  const expectedSeries = [
    ["people", 32, "target_people_count := 32"],
    ["projects", 10, "target_project_count := 10"],
    ["tasks", 120, "target_task_count := 120"],
    ["leaveRequests", 104, "target_leave_count := 104"],
    ["incidents", 60, "target_incident_count := 60"],
    ["treasuryEntries", 360, "target_treasury_count := 360"],
    ["payrollRuns", 18, "target_payroll_count := 18"],
    ["payrollParticipants", 576, "target_payroll_participant_count := 576"],
    ["integrationRuns", 72, "target_integration_run_count := 72"],
    ["changelogEntries", 12, "target_changelog_count := 12"],
  ] as const;
  for (const [key, expectedCount, sqlMarker] of expectedSeries) {
    if (
      first.report.counts[key] !== expectedCount ||
      !sqlMigration.includes(sqlMarker)
    ) {
      throw new Error(`Scenario V6 count mismatch for ${key}`);
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
