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
  const contentSecurityPolicy = createNonceContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
