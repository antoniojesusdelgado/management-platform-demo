import { spawn, spawnSync } from "node:child_process";

const host = "127.0.0.1";
const port = "3001";
const baseURL = `http://${host}:${port}`;
const playwrightArguments = ["test", ...process.argv.slice(2)];

async function isReady() {
  try {
    const response = await fetch(`${baseURL}/explorar`, {
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer(server) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Next.js exited before becoming ready (${server.exitCode}).`);
    }
    if (await isReady()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("Next.js did not become ready within 120 seconds.");
}

function stopServer(server) {
  if (!server || server.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  server.kill("SIGTERM");
}

let server;
let exitCode = 1;

try {
  if (!(await isReady())) {
    server = spawn(
      process.execPath,
      [
        "node_modules/next/dist/bin/next",
        "start",
        "--hostname",
        host,
        "--port",
        port,
      ],
      {
        env: process.env,
        stdio: "inherit",
        windowsHide: true,
      },
    );
    await waitForServer(server);
  }

  const playwright = spawn(
    process.execPath,
    ["node_modules/playwright/cli.js", ...playwrightArguments],
    {
      env: {
        ...process.env,
        PLAYWRIGHT_BASE_URL: baseURL,
      },
      stdio: "inherit",
      windowsHide: true,
    },
  );

  exitCode = await new Promise((resolve, reject) => {
    playwright.once("error", reject);
    playwright.once("exit", (code) => resolve(code ?? 1));
  });
} catch (error) {
  console.error(error);
} finally {
  stopServer(server);
}

process.exit(exitCode);
