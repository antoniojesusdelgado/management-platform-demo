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

  test("keeps releases ordered and publishes v1.5.1 on 7 August 2026", () => {
    expect(PRODUCT_RELEASES.at(-1)).toEqual({
      version: "1.5.1",
      title: "Novedades siempre al día",
      summary:
        "La versión visible coincide ahora con la publicación disponible y se explica cómo se ha desarrollado el proyecto.",
      publishedDate: "2026-08-07",
    });
  });

  test("keeps the TypeScript and SQL release copy aligned", async () => {
    const sql = await Bun.file(
      "supabase/migrations/20260807100254_release_v1_5_1_changelog_alignment.sql",
    ).text();

    for (const release of PRODUCT_RELEASES.slice(-4)) {
      expect(sql).toContain(`'${release.version}'`);
      expect(sql).toContain(`'${release.title}'`);
      expect(sql).toContain(`'${release.summary}'`);
    }
  });
});
