import { expect, test } from "@playwright/test";

test("public responses expose the release security headers", async ({
  request,
}) => {
  const response = await request.get("/");
  const headers = response.headers();

  expect(headers["x-powered-by"]).toBeUndefined();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["content-security-policy"]).toContain("default-src 'self'");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
});

test("only the login and embed routes are frameable public surfaces", async ({
  request,
}) => {
  for (const pathname of ["/login", "/demo/embed"]) {
    const response = await request.get(pathname);
    const headers = response.headers();

    expect(response.ok()).toBe(true);
    expect(headers["x-frame-options"]).toBeUndefined();
    expect(headers["content-security-policy"]).toContain("frame-ancestors");
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).toMatch(
      /script-src 'self' 'nonce-[^']+' 'strict-dynamic'/,
    );
    expect(headers["content-security-policy"]).not.toContain(
      "script-src 'self' 'unsafe-inline'",
    );
  }
});

test("Google access starts OAuth in the current top-level context", async ({ page }) => {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  const googleAccess = page.getByRole("link", { name: "Continuar con Google" });

  await expect(googleAccess).not.toHaveAttribute("target", "_blank");
  await expect(googleAccess).toHaveAttribute("href", /\/(auth\/google|app\/inicio)$/);
});

test("dynamic authentication surfaces use a nonce-based script policy", async ({
  request,
}) => {
  const response = await request.get("/login");
  const policy = response.headers()["content-security-policy"];

  expect(policy).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
  expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
});

test("OAuth callback rejects missing codes and external next targets", async ({
  request,
  baseURL,
}) => {
  const response = await request.get(
    "/auth/callback?next=https://malicious.example/path",
    { maxRedirects: 0 },
  );
  const location = new URL(response.headers().location!, baseURL);

  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  const expectedOrigin = new URL(baseURL!);
  const allowedHostnames = ["localhost", "127.0.0.1"].includes(
    expectedOrigin.hostname,
  )
    ? ["localhost", "127.0.0.1"]
    : [expectedOrigin.hostname];
  expect(allowedHostnames).toContain(location.hostname);
  expect(location.port).toBe(expectedOrigin.port);
  expect(location.pathname).toBe("/login");
  expect(location.searchParams.get("error")).toBe("oauth");
});

test("query payloads are not reflected as executable markup", async ({
  page,
}) => {
  const payload = "<script>window.__xss_marker__=true</script>";
  await page.goto(`/?next=${encodeURIComponent(payload)}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(page.locator("script", { hasText: "__xss_marker__" })).toHaveCount(
    0,
  );
  expect(await page.evaluate(() => "__xss_marker__" in window)).toBe(false);
});

test("anonymous demo access does not issue marketing cookies", async ({
  page,
  context,
}) => {
  await page.goto("/demo/embed", { waitUntil: "domcontentloaded" });
  await expect(page.locator('[data-demo-ready="true"]')).toBeVisible();
  const cookies = await context.cookies();

  expect(
    cookies.some((cookie) =>
      /(_ga|_gid|facebook|hubspot|marketing)/i.test(cookie.name),
    ),
  ).toBe(false);
  for (const cookie of cookies) {
    expect(cookie.sameSite).not.toBe("None");
  }
});
