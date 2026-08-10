import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { WorkspaceProvider } from "@/domain/operations";
export { getWorkspaceOAuthOrigin, signOAuthState, verifyOAuthState } from "@/lib/workspace-oauth-state";

export const workspaceOAuthProviders = ["google_workspace", "microsoft_365"] as const;

type OAuthConfiguration = {
  clientId: string;
  clientSecret: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
};

export function isWorkspaceOAuthProvider(value: string): value is WorkspaceProvider {
  return workspaceOAuthProviders.includes(value as WorkspaceProvider);
}

export function getWorkspaceOAuthConfiguration(provider: WorkspaceProvider): OAuthConfiguration | null {
  if (provider === "google_workspace") {
    const clientId = process.env.GOOGLE_WORKSPACE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_WORKSPACE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      clientId,
      clientSecret,
      authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: [
        "openid", "email",
        "https://www.googleapis.com/auth/drive.file",
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/calendar.events",
      ],
    };
  }
  const clientId = process.env.MICROSOFT_365_CLIENT_ID;
  const clientSecret = process.env.MICROSOFT_365_CLIENT_SECRET;
  const tenant = process.env.MICROSOFT_365_TENANT_ID || "organizations";
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    authorizationUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${encodeURIComponent(tenant)}/oauth2/v2.0/token`,
    scopes: ["openid", "email", "offline_access", "User.Read", "Files.ReadWrite", "Calendars.ReadWrite"],
  };
}

export function createPkcePair() {
  const verifier = randomBytes(48).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function buildAuthorizationUrl(provider: WorkspaceProvider, redirectUri: string, state: string, challenge: string) {
  const config = getWorkspaceOAuthConfiguration(provider);
  if (!config) return null;
  const query = new URLSearchParams({ client_id: config.clientId, redirect_uri: redirectUri, response_type: "code", scope: config.scopes.join(" "), state, code_challenge: challenge, code_challenge_method: "S256", access_type: "offline", prompt: "consent" });
  return `${config.authorizationUrl}?${query.toString()}`;
}

export async function exchangeAuthorizationCode(provider: WorkspaceProvider, code: string, verifier: string, redirectUri: string) {
  const config = getWorkspaceOAuthConfiguration(provider);
  if (!config) throw new Error("provider_not_configured");
  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "authorization_code", client_id: config.clientId, client_secret: config.clientSecret, code, code_verifier: verifier, redirect_uri: redirectUri }),
    cache: "no-store",
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: string } | null;
    throw new Error(`token_exchange_failed:${response.status}:${body?.error ?? "unknown"}`);
  }
  const token = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!token.access_token) throw new Error("missing_access_token");
  return { accessToken: token.access_token, refreshToken: token.refresh_token ?? "", expiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString() };
}

export async function refreshWorkspaceAccessToken(provider: WorkspaceProvider, refreshToken: string) {
  const config = getWorkspaceOAuthConfiguration(provider);
  if (!config || !refreshToken) throw new Error("provider_refresh_not_configured");
  const response = await fetch(config.tokenUrl, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "refresh_token", client_id: config.clientId, client_secret: config.clientSecret, refresh_token: refreshToken }), cache: "no-store" });
  if (!response.ok) throw new Error(`token_refresh_failed:${response.status}`);
  const token = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!token.access_token) throw new Error("missing_access_token");
  return { accessToken: token.access_token, refreshToken: token.refresh_token ?? refreshToken, expiresAt: new Date(Date.now() + (token.expires_in ?? 3600) * 1000).toISOString() };
}

export async function loadWorkspaceAccountLabel(provider: WorkspaceProvider, accessToken: string) {
  const response = await fetch(provider === "google_workspace" ? "https://www.googleapis.com/oauth2/v2/userinfo" : "https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return provider === "google_workspace" ? "Cuenta de Google Workspace" : "Cuenta de Microsoft 365";
  const profile = await response.json() as { email?: string; displayName?: string; mail?: string; userPrincipalName?: string };
  return profile.email ?? profile.mail ?? profile.userPrincipalName ?? profile.displayName ?? (provider === "google_workspace" ? "Cuenta de Google Workspace" : "Cuenta de Microsoft 365");
}
