import type { Metadata } from "next";
import { Suspense } from "react";
import { AnalyticsConsentManager } from "@/components/analytics-consent";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const metadataOrigin =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(metadataOrigin),
  title: {
    default: "Plataforma de gestión — Todo el trabajo, en un solo lugar",
    template: "%s | Plataforma de gestión",
  },
  description:
    "Plataforma para coordinar personas, proyectos, capacidad, operaciones y decisiones desde un único espacio.",
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Plataforma de gestión — Todo el trabajo, en un solo lugar",
    description:
      "Coordina personas, proyectos, capacidad y decisiones desde un único espacio.",
    type: "website",
    locale: "es_ES",
    images: [{ url: "/social-card.png", width: 1200, height: 630 }],
  },
};

const themeBootstrap = `
(() => {
  try {
    const key = "management-platform-theme";
    const stored = sessionStorage.getItem(key);
    const preference = stored === "dark" ? "dark" : "light";
    const theme = preference;
    const root = document.documentElement;
    root.dataset.themePreference = preference;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) {
      themeColor.setAttribute("content", theme === "dark" ? "#071a2f" : "#f5f7fb");
    }
  } catch {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#f5f7fb" />
        <script
          id="theme-bootstrap"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeBootstrap }}
        />
      </head>
      <body>
        <ThemeProvider>
          {children}
          <Suspense fallback={null}>
            <AnalyticsConsentManager
              measurementId={process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}
            />
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
