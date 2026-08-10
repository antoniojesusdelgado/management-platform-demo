import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/auth";
import { buildAuthorizationUrl, createPkcePair, getWorkspaceOAuthOrigin, isWorkspaceOAuthProvider, signOAuthState } from "@/lib/workspace-oauth";

type OAuthRouteContext = { params: Promise<{ provider: string }> };

export async function GET(request: Request, context: OAuthRouteContext) {
  const { provider } = await context.params;
  if (!isWorkspaceOAuthProvider(provider)) return NextResponse.json({ error: "Proveedor no válido" }, { status: 404 });
  const access = await getWorkspaceAccess();
  if (access.status !== "active") return NextResponse.redirect(new URL("/login", request.url));
  const origin = getWorkspaceOAuthOrigin(request.url);
  if (!origin) return NextResponse.redirect(new URL("/app/operaciones?connection=invalid_origin", request.url));
  const nonce = randomBytes(24).toString("base64url");
  const { verifier, challenge } = createPkcePair();
  let state: string;
  try { state = signOAuthState(provider, nonce, verifier, origin, access.userId, access.organizationId); } catch { return NextResponse.redirect(new URL("/app/operaciones?connection=configuration_required", request.url)); }
  const redirectUri = `${origin}/api/workspace/oauth/${provider}/callback`;
  const authorizationUrl = buildAuthorizationUrl(provider, redirectUri, state, challenge);
  if (!authorizationUrl) return NextResponse.redirect(new URL("/app/operaciones?connection=configuration_required", request.url));
  return NextResponse.redirect(authorizationUrl);
}
