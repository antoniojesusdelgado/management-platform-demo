import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const RUNTIME_ROOTS = ["src", "public", "supabase/migrations"];
const RUNTIME_FILES = ["supabase/seed.sql"];
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".json",
  ".md",
  ".sql",
  ".svg",
  ".ts",
  ".tsx",
]);

type BoundaryRule = {
  code: string;
  pattern: RegExp;
  message: string;
  allow?: (match: string) => boolean;
};

const rules: BoundaryRule[] = [
  {
    code: "real-email",
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu,
    message: "Use reserved .test addresses in synthetic fixtures.",
    allow: (match) => match.toLowerCase().endsWith(".test"),
  },
  {
    code: "spanish-iban",
    pattern: /\bES\d{22}\b/gu,
    message: "IBAN-shaped values are not allowed in the public demo.",
  },
  {
    code: "spanish-tax-id",
    pattern: /\b(?:\d{8}[A-Z]|[XYZ]\d{7}[A-Z])\b/giu,
    message: "NIF/NIE-shaped values are not allowed in the public demo.",
  },
  {
    code: "social-security-id",
    pattern: /(?<![0-9a-f-])\d{2}[ /-]?\d{8}[ /-]?\d{2}(?![0-9a-f-])/giu,
    message: "Social-security-shaped values are not allowed in the demo.",
  },
  {
    code: "spanish-phone",
    pattern: /(?:\+34|0034)[ -]?[6789]\d{2}(?:[ -]?\d{3}){2}\b/gu,
    message: "Spanish phone-shaped values are not allowed in public fixtures.",
  },
  {
    code: "restricted-provider",
    pattern: /\b(?:BBVA|Santander|A3(?:\s+N[oó]minas)?)\b/giu,
    message: "Use neutral connector names instead of real providers.",
  },
  {
    code: "secret-key",
    pattern: /\b(?:sb_secret_[A-Za-z0-9_-]+|sk_live_[A-Za-z0-9]+)\b/gu,
    message: "Secret or privileged key material must not enter runtime files.",
  },
];

export type PublicDataViolation = {
  file: string;
  line: number;
  code: string;
  message: string;
};

async function collectFiles(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(path, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(entryPath);
      }
      const isRuntimeText =
        TEXT_EXTENSIONS.has(extname(entry.name)) &&
        !entry.name.includes(".test.") &&
        !entry.name.includes(".spec.");
      return isRuntimeText ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

export function findPublicDataViolations(
  content: string,
  file: string,
): PublicDataViolation[] {
  const violations: PublicDataViolation[] = [];

  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    for (const match of content.matchAll(rule.pattern)) {
      const value = match[0];
      if (rule.allow?.(value)) {
        continue;
      }
      const offset = match.index ?? 0;
      const line = content.slice(0, offset).split("\n").length;
      violations.push({
        file,
        line,
        code: rule.code,
        message: rule.message,
      });
    }
  }

  return violations;
}

async function main() {
  const discovered = await Promise.all(
    RUNTIME_ROOTS.map((path) => collectFiles(join(ROOT, path))),
  );
  const files = [...discovered.flat(), ...RUNTIME_FILES.map((path) => join(ROOT, path))];
  const violations = (
    await Promise.all(
      files.map(async (file) =>
        findPublicDataViolations(
          await readFile(file, "utf8"),
          relative(ROOT, file).replaceAll("\\", "/"),
        ),
      ),
    )
  ).flat();

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `${violation.file}:${violation.line} [${violation.code}] ${violation.message}`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`Public data boundary check passed across ${files.length} files.`);
}

if (import.meta.main) {
  await main();
}
