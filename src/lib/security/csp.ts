const dynamicSurfacePrefixes = ["/app", "/auth", "/login"];

export function isDynamicSurface(pathname: string) {
  return dynamicSurfacePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function createNonce() {
  return Buffer.from(crypto.randomUUID()).toString("base64");
}

export function createNonceContentSecurityPolicy(nonce: string) {
  const devScriptPolicy =
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devScriptPolicy}`,
    "connect-src 'self' https://*.supabase.co",
    "upgrade-insecure-requests",
  ].join("; ");
}
