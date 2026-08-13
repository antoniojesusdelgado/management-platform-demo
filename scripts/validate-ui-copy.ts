import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const UI_ROOTS = ["src/components", "src/app"];
const OPERATIONAL_CONTENT_FILES = [
  "src/domain/guest-demo.ts",
  "src/domain/integrations.ts",
  "src/demo-data/catalog.ts",
  "src/demo-data/scenario.ts",
  "supabase/migrations/20260727090946_release_v1_1_scenario_v2.sql",
  "supabase/migrations/20260727160338_release_v1_2_scenario_v3.sql",
];

const disallowedPhrases = [
  "Operational intelligence",
  "Operaciones premium",
  "Business Intelligence",
  "Reporting ejecutivo",
  "Resumen ejecutivo",
  "Proyectos y trabajo",
  "Personas y capacidad",
  "Servicio y SLA",
  "Finanzas y automatizaciones",
  "Todo el portfolio",
  "Headcount",
  "Throughput",
  "Backlog",
  "vs. anterior",
] as const;

const disallowedComponentPhrases = [
  "límite WIP",
  "WIP en curso",
  "WIP en revisión",
  "SLA vencido",
  "Objetivo SLA",
  "Riesgo de incumplir un SLA",
  "No altera la identidad OAuth",
  "Conexión simulada: no se abre OAuth",
  "Bandeja administrativa",
  "Flujo editorial",
  "settings.workspace.manage",
  "Conectores activos",
  "Ejecuciones correctas",
  "Registros procesados",
  "Excepciones abiertas",
  "Simular ahora",
  "Vista autorizada",
  "Sincronizar directorio",
  "consentimiento de directorio",
] as const;

const corruptedTextSignatures = ["Ã", "Â", "â", "�"] as const;

type CopyViolation = {
  file: string;
  line: number;
  value: string;
};

async function collectFiles(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(path, entry.name);
      if (entry.isDirectory()) return collectFiles(entryPath);
      return [".ts", ".tsx"].includes(extname(entry.name)) ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

function lineAt(content: string, offset: number) {
  return content.slice(0, offset).split("\n").length;
}

export function findUiCopyViolations(content: string, file: string) {
  const violations: CopyViolation[] = [];

  for (const phrase of disallowedPhrases) {
    let offset = content.indexOf(phrase);
    while (offset >= 0) {
      violations.push({ file, line: lineAt(content, offset), value: phrase });
      offset = content.indexOf(phrase, offset + phrase.length);
    }
  }

  if (file.startsWith("src/components/")) {
    for (const phrase of disallowedComponentPhrases) {
      let offset = content.indexOf(phrase);
      while (offset >= 0) {
        violations.push({ file, line: lineAt(content, offset), value: phrase });
        offset = content.indexOf(phrase, offset + phrase.length);
      }
    }
  }

  for (const signature of corruptedTextSignatures) {
    let offset = content.indexOf(signature);
    while (offset >= 0) {
      violations.push({
        file,
        line: lineAt(content, offset),
        value: `texto con codificación dañada (${signature})`,
      });
      offset = content.indexOf(signature, offset + signature.length);
    }
  }

  if (
    file.startsWith("src/components/") ||
    OPERATIONAL_CONTENT_FILES.includes(file)
  ) {
    for (const match of content.matchAll(/\bsint[eé]tic[oa]s?\b/giu)) {
      violations.push({
        file,
        line: lineAt(content, match.index ?? 0),
        value: match[0],
      });
    }
  }

  return violations;
}

async function main() {
  const uiFiles = (
    await Promise.all(UI_ROOTS.map((path) => collectFiles(join(ROOT, path))))
  ).flat();
  const files = [
    ...uiFiles,
    ...OPERATIONAL_CONTENT_FILES.map((path) => join(ROOT, path)),
  ];
  const violations = (
    await Promise.all(
      files.map(async (file) => {
        const relativePath = relative(ROOT, file).replaceAll("\\", "/");
        return findUiCopyViolations(await readFile(file, "utf8"), relativePath);
      }),
    )
  ).flat();

  if (violations.length) {
    for (const violation of violations) {
      console.error(
        `${violation.file}:${violation.line} [ui-copy] Revisa "${violation.value}" y usa un texto legible y natural.`,
      );
    }
    process.exitCode = 1;
    return;
  }

  console.log(`UI copy check passed across ${files.length} files.`);
}

if (import.meta.main) {
  await main();
}
