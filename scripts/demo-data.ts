import {
  checksumScenario,
  createScenarioReport,
  generateDemoScenario,
  validateDemoScenario,
} from "../src/demo-data/scenario";

const outputDirectory = ".demo-data";
const scenarioPath = `${outputDirectory}/scenario-v1.json`;
const reportPath = `${outputDirectory}/scenario-v1-report.json`;
const command = process.argv[2] ?? "validate";
const seed = process.env.DEMO_SCENARIO_SEED ?? "management-platform-standard-v1";
const anchorDate = process.env.DEMO_SCENARIO_ANCHOR ?? "2026-07-01";

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
  console.log("Scenario is valid and deterministic");
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
