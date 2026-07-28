import type { Metadata } from "next";
import "./globals.css";

const metadataOrigin =
  process.env.NEXT_PUBLIC_APP_URL ??
  (process.env.NEXT_PUBLIC_VERCEL_URL
    ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
    : "http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: new URL(metadataOrigin),
  title: {
    default: "Plataforma de gestión | Aplicación de demostración",
    template: "%s | Plataforma de gestión",
  },
  description:
    "Aplicación de demostración para explorar procesos, permisos y flujos de gestión con datos ficticios.",
  robots: {
    index: false,
    follow: false,
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
    title: "Plataforma de gestión | Aplicación de demostración",
    description:
      "Aplicación de demostración para explorar procesos de gestión con datos ficticios.",
    type: "website",
    locale: "es_ES",
    images: [{ url: "/social-card.png", width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
