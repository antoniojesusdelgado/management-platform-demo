import type { NextConfig } from "next";

const portfolioOrigin = (() => {
  const value = process.env.PORTFOLIO_ORIGIN;

  if (!value) return "'none'";

  try {
    const url = new URL(value);
    return url.origin === value && ["https:", "http:"].includes(url.protocol)
      ? url.origin
      : "'none'";
  } catch {
    return "'none'";
  }
})();

const securityHeaders = [
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];

function contentSecurityPolicy(frameAncestors: string) {
  const devScriptPolicy =
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `frame-ancestors ${frameAncestors}`,
    "form-action 'self'",
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com${devScriptPolicy}`,
    "connect-src 'self' https://*.supabase.co https://*.google-analytics.com https://www.googletagmanager.com",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  typedRoutes: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/sign/profile-avatars/**",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    const frameableHeaders = [
      ...securityHeaders,
      {
        key: "Content-Security-Policy",
        value: contentSecurityPolicy(portfolioOrigin),
      },
      { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
    ];

    return [
      {
        source: "/explorar",
        headers: frameableHeaders,
      },
      {
        source: "/login",
        headers: frameableHeaders,
      },
      {
        source: "/((?!explorar|demo/embed|login).*)",
        headers: [
          ...securityHeaders,
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy("'none'"),
          },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/demo/embed",
        destination: "/explorar",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
