import { afterEach, describe, expect, test } from "bun:test";
import {
  getWorkspaceOAuthOrigin,
  signOAuthState,
  verifyOAuthState,
} from "@/lib/workspace-oauth-state";

const previousSecret = process.env.WORKSPACE_OAUTH_STATE_SECRET;
const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;

afterEach(() => {
  process.env.WORKSPACE_OAUTH_STATE_SECRET = previousSecret;
  process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
});

describe("workspace OAuth state", () => {
  test("binds a signed state to provider, identity, organization and origin", () => {
    process.env.WORKSPACE_OAUTH_STATE_SECRET = Buffer.alloc(32, 7).toString("base64url");
    const state = signOAuthState(
      "google_workspace",
      "nonce-value-long-enough-for-oauth",
      "pkce-verifier-value-that-is-long-enough-for-the-oauth-contract",
      "https://example.test",
      "profile-1",
      "organization-1",
    );

    expect(verifyOAuthState(state, "google_workspace", "https://example.test", "profile-1", "organization-1")).toBe("pkce-verifier-value-that-is-long-enough-for-the-oauth-contract");
    expect(verifyOAuthState(state, "google_workspace", "https://example.test", "profile-2", "organization-1")).toBeNull();
    expect(verifyOAuthState(`${state}tampered`, "google_workspace", "https://example.test", "profile-1", "organization-1")).toBeNull();
  });

  test("accepts only the configured callback origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://platform.example/app";
    expect(getWorkspaceOAuthOrigin("https://platform.example/api/workspace/oauth/google_workspace/start")).toBe("https://platform.example");
    expect(getWorkspaceOAuthOrigin("https://attacker.example/api/workspace/oauth/google_workspace/start")).toBeNull();
  });
});
