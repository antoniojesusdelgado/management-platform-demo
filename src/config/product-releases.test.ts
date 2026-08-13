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

  test("keeps releases ordered and publishes v1.8.2 on 13 August 2026", () => {
    expect(PRODUCT_RELEASES.at(-1)).toEqual({
      version: "1.8.2",
      title: "Una plataforma más clara y bajo tu control",
      summary:
        "Estrenamos una identidad más profesional, acceso con Google o Microsoft y opciones sencillas para gestionar tu privacidad.",
      publishedDate: "2026-08-13",
    });
  });

  test("keeps the TypeScript and SQL release copy aligned", async () => {
    const sql = `${await Bun.file(
      "supabase/migrations/20260807100254_release_v1_5_1_changelog_alignment.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260810121210_release_v1_6_0_productivity.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260810185850_release_v1_7_operations.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260811124636_release_v1_8_multi_tenant_onboarding.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260812105351_release_v1_8_1_interface_readiness.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260812105402_refresh_v1_8_1_release_copy.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260812132007_release_v1_8_2_auth_security_patch.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260812193000_add_privacy_consent_and_erasure.sql",
    ).text()}\n${await Bun.file(
      "supabase/migrations/20260813120000_finalize_v1_8_2_product_copy.sql",
    ).text()}`;

    for (const release of PRODUCT_RELEASES.slice(-5)) {
      expect(sql).toContain(`'${release.version}'`);
      expect(sql).toContain(`'${release.title}'`);
      expect(sql).toContain(`'${release.summary}'`);
    }
  });
});
