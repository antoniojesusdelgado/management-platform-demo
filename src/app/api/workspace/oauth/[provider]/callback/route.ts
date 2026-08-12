import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { exchangeAuthorizationCode, getWorkspaceOAuthOrigin, isWorkspaceOAuthProvider, loadWorkspaceAccountMetadata, verifyOAuthState } from "@/lib/workspace-oauth";

type OAuthRouteContext = { params: Promise<{ provider: string }> };

export async function GET(request: Request, context: OAuthRouteContext) {
  const { provider } = await context.params;
  if (!isWorkspaceOAuthProvider(provider)) return NextResponse.json({ error: "Proveedor no válido" }, { status: 404 });
  const url = new URL(request.url);
  const origin = getWorkspaceOAuthOrigin(request.url);
  if (!origin) return NextResponse.redirect(new URL("/app/operaciones?connection=invalid_origin", url.origin));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const access = await getWorkspaceAccess();
  if (access.status !== "active") return NextResponse.redirect(new URL("/login", origin));
  const statePayload = state ? verifyOAuthState(state, provider, origin, access.userId, access.organizationId) : null;
  if (!code || !state || !statePayload) return NextResponse.redirect(new URL("/app/operaciones?connection=invalid_state", origin));
  try {
    const redirectUri = `${origin}/api/workspace/oauth/${provider}/callback`;
    const token = await exchangeAuthorizationCode(provider, code, statePayload.verifier, redirectUri, statePayload.purpose);
    const metadata = await loadWorkspaceAccountMetadata(provider, token.accessToken, token.grantedScopes);
    const capabilities = provider === "google_workspace" ? ["files", "spreadsheets", "calendar"] : ["files", "spreadsheets", "calendar"];
    const supabase = await createClient();
    const { error } = await supabase.rpc("save_workspace_connection_v1_8_1", {
      expected_organization_id: access.organizationId,
      expected_profile_id: access.userId,
      target_provider: provider,
      target_account_label: metadata.accountLabel,
      target_capabilities: capabilities,
      target_granted_scopes: token.grantedScopes,
      target_account_kind: metadata.accountKind,
      target_directory_authorized: metadata.directoryAuthorized,
      target_access_token: token.accessToken,
      target_refresh_token: token.refreshToken,
      target_expires_at: token.expiresAt,
    });
    if (error) throw error;
    return NextResponse.redirect(new URL(`/app/operaciones?connection=${provider}`, origin));
  } catch (error) {
    console.error("workspace_oauth_callback_failed", {
      provider,
      reason: error instanceof Error ? error.message : "unknown_error",
    });
    return NextResponse.redirect(new URL("/app/operaciones?connection=failed", origin));
  }
}
