import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

type Finding = {
  source: string;
  kind: string;
};

const secretPatterns = [
  {
    kind: "Supabase secret key",
    pattern: new RegExp(["sb", "secret"].join("_") + "_[A-Za-z0-9_-]{20,}", "g"),
  },
  {
    kind: "OpenAI API key",
    pattern: new RegExp(
      [
        "(?:^|[^A-Za-z0-9])",
        "sk-",
        "(?:proj-)?",
        "[A-Za-z0-9_-]{20,}",
      ].join(""),
      "g",
    ),
  },
  {
    kind: "GitHub token",
    pattern: new RegExp(["gh", "[pousr]_[A-Za-z0-9]{20,}"].join(""), "g"),
  },
  {
    kind: "Google API key",
    pattern: new RegExp(["AIza", "[A-Za-z0-9_-]{30,}"].join(""), "g"),
  },
  {
    kind: "Stripe live secret",
    pattern: new RegExp(["sk", "live"].join("_") + "_[A-Za-z0-9]{20,}", "g"),
  },
] as const;

const jwtPattern = /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g;
const publicSecretName =
  /NEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE_ROLE|SECRET|PRIVATE_KEY|ACCESS_TOKEN)/g;

function decodeJwtPayload(candidate: string) {
  try {
    const payload = candidate.split(".")[1]!;
    return JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function scanText(source: string, text: string): Finding[] {
  const findings: Finding[] = [];

  for (const { kind, pattern } of secretPatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) findings.push({ source, kind });
  }

  publicSecretName.lastIndex = 0;
  if (publicSecretName.test(text)) {
    findings.push({ source, kind: "server secret exposed through NEXT_PUBLIC_" });
  }

  jwtPattern.lastIndex = 0;
  for (const candidate of text.match(jwtPattern) ?? []) {
    const payload = decodeJwtPayload(candidate);
    if (payload?.role === "service_role") {
      findings.push({ source, kind: "Supabase service_role JWT" });
      break;
    }
  }

  return findings;
}

function trackedFiles() {
  return execFileSync("git", ["ls-files", "-z"], {
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean);
}

function main() {
  const findings: Finding[] = [];
  const files = trackedFiles();
  const invalidEnvFiles = files.filter(
    (file) => /(^|\/)\.env/i.test(file) && file !== ".env.example",
  );

  for (const file of invalidEnvFiles) {
    findings.push({ source: file, kind: "tracked environment file" });
  }

  for (const file of files) {
    if (file === "scripts/validate-secrets.ts") continue;
    try {
      findings.push(...scanText(file, readFileSync(file, "utf8")));
    } catch {
      // Binary files are intentionally ignored.
    }
  }

  const history = execFileSync(
    "git",
    ["log", "-p", "--all", "--no-ext-diff", "--", ".", ":(exclude)bun.lock"],
    {
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    },
  );
  findings.push(...scanText("git history", history));

  if (findings.length) {
    const summary = findings
      .map(({ source, kind }) => `${source}: ${kind}`)
      .join("\n");
    throw new Error(`Potential secret exposure detected:\n${summary}`);
  }

  console.log(
    `Secret validation passed (${files.length} tracked files and Git history).`,
  );
}

if (import.meta.main) main();
