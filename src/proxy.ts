import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import {
  createNonce,
  createNonceContentSecurityPolicy,
  isDynamicSurface,
} from "@/lib/security/csp";

export async function proxy(request: NextRequest) {
  if (!isDynamicSurface(request.nextUrl.pathname)) {
    return updateSession(request);
  }

  const nonce = createNonce();
  const frameAncestors =
    request.nextUrl.pathname === "/explorar" ||
    request.nextUrl.pathname === "/demo/embed" ||
    request.nextUrl.pathname === "/login"
      ? getPortfolioFrameAncestor()
      : "'none'";
  const contentSecurityPolicy = createNonceContentSecurityPolicy(nonce, frameAncestors);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

function getPortfolioFrameAncestor() {
  const value = process.env.PORTFOLIO_ORIGIN;
  if (!value) return "'none'";

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.origin === value ? url.origin : "'none'";
  } catch {
    return "'none'";
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
