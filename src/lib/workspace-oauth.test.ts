import { afterEach, describe, expect, test } from "bun:test";
import {
  getWorkspaceOAuthOrigin,
  signOAuthState,
  verifyOAuthState,
} from "@/lib/workspace-oauth-state";
import { getWorkspaceOAuthScopes } from "@/lib/workspace-oauth-scopes";

const previousSecret = process.env.WORKSPACE_OAUTH_STATE_SECRET;
const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const previousGoogleId = process.env.GOOGLE_WORKSPACE_CLIENT_ID;
const previousGoogleSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET;
const previousMicrosoftId = process.env.MICROSOFT_365_CLIENT_ID;
const previousMicrosoftSecret = process.env.MICROSOFT_365_CLIENT_SECRET;

afterEach(() => {
  process.env.WORKSPACE_OAUTH_STATE_SECRET = previousSecret;
  process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  process.env.GOOGLE_WORKSPACE_CLIENT_ID = previousGoogleId;
  process.env.GOOGLE_WORKSPACE_CLIENT_SECRET = previousGoogleSecret;
  process.env.MICROSOFT_365_CLIENT_ID = previousMicrosoftId;
  process.env.MICROSOFT_365_CLIENT_SECRET = previousMicrosoftSecret;
});

describe("workspace OAuth state", () => {
  test("binds a signed state to provider, identity, organization and origin", () => {
    process.env.WORKSPACE_OAUTH_STATE_SECRET = Buffer.alloc(32, 7).toString("base64url");
    const state = signOAuthState(
      "google_workspace",
      "productivity",
      "nonce-value-long-enough-for-oauth",
      "pkce-verifier-value-that-is-long-enough-for-the-oauth-contract",
      "https://example.test",
      "profile-1",
      "organization-1",
    );

    expect(verifyOAuthState(state, "google_workspace", "https://example.test", "profile-1", "organization-1")).toEqual({
      verifier: "pkce-verifier-value-that-is-long-enough-for-the-oauth-contract",
      purpose: "productivity",
    });
    expect(verifyOAuthState(state, "google_workspace", "https://example.test", "profile-2", "organization-1")).toBeNull();
    expect(verifyOAuthState(`${state}tampered`, "google_workspace", "https://example.test", "profile-1", "organization-1")).toBeNull();
  });

  test("accepts only the configured callback origin", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://platform.example/app";
    expect(getWorkspaceOAuthOrigin("https://platform.example/api/workspace/oauth/google_workspace/start")).toBe("https://platform.example");
    expect(getWorkspaceOAuthOrigin("https://attacker.example/api/workspace/oauth/google_workspace/start")).toBeNull();
  });

  test("keeps productivity and directory grants separate", () => {
    expect(getWorkspaceOAuthScopes("google_workspace", "productivity")).not.toContain("https://www.googleapis.com/auth/admin.directory.user.readonly");
    expect(getWorkspaceOAuthScopes("google_workspace", "directory")).toContain("https://www.googleapis.com/auth/admin.directory.user.readonly");
    expect(getWorkspaceOAuthScopes("microsoft_365", "productivity")).not.toContain("User.Read.All");
    expect(getWorkspaceOAuthScopes("microsoft_365", "directory")).toContain("User.Read.All");
  });
});
