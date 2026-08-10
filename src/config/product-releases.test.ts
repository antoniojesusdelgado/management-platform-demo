import { describe, expect, test } from "bun:test";
import packageJson from "../../package.json";
import {
  LATEST_PRODUCT_RELEASE,
  PRODUCT_RELEASES,
  PRODUCT_VERSION,
} from "@/config/product-releases";

describe("product release catalog", () => {
  test("matches the package version and contains no duplicates", () => {
    expect(PRODUCT_VERSION as string).toBe(packageJson.version);
    expect(LATEST_PRODUCT_RELEASE.version as string).toBe(packageJson.version);
    expect(new Set(PRODUCT_RELEASES.map(({ version }) => version)).size).toBe(
      PRODUCT_RELEASES.length,
    );
  });

  test("keeps releases ordered and publishes v1.7.0 on 10 August 2026", () => {
    expect(PRODUCT_RELEASES.at(-1)).toEqual({
      version: "1.7.0",
      title: "Menos tareas repetitivas, más control",
      summary:
        "Automatizaciones, plantillas, planificación de capacidad e informes conectados reúnen el trabajo operativo en un mismo lugar.",
      publishedDate: "2026-08-10",
    });
  });

  test("keeps the TypeScript and SQL release copy aligned", async () => {
    const sql = `${await Bun.file(
      "supabase/migrations/20260807100254_release_v1_5_1_changelog_alignment.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260810121210_release_v1_6_0_productivity.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260810185850_release_v1_7_operations.sql",
    ).text()}`;

    for (const release of PRODUCT_RELEASES.slice(-4)) {
      expect(sql).toContain(`'${release.version}'`);
      expect(sql).toContain(`'${release.title}'`);
      expect(sql).toContain(`'${release.summary}'`);
    }
  });
});
