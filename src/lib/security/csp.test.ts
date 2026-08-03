import { describe, expect, test } from "bun:test";
import {
  createNonceContentSecurityPolicy,
  isDynamicSurface,
} from "./csp";

describe("dynamic CSP", () => {
  test("applies to authenticated, authentication and embedded surfaces", () => {
    expect(isDynamicSurface("/app/tareas")).toBe(true);
    expect(isDynamicSurface("/auth/callback")).toBe(true);
    expect(isDynamicSurface("/login")).toBe(true);
    expect(isDynamicSurface("/")).toBe(false);
    expect(isDynamicSurface("/demo/embed")).toBe(true);
  });

  test("authorizes scripts through a request nonce", () => {
    const policy = createNonceContentSecurityPolicy("trusted-nonce");

    expect(policy).toContain("script-src 'self' 'nonce-trusted-nonce'");
    expect(policy).toContain("'strict-dynamic'");
    expect(policy).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  test("allows only the configured portfolio to frame trusted entry routes", () => {
    const policy = createNonceContentSecurityPolicy(
      "trusted-nonce",
      "https://antoniodelgado.tech",
    );

    expect(policy).toContain("frame-ancestors https://antoniodelgado.tech");
    expect(policy).not.toContain("frame-ancestors *");
  });
});
