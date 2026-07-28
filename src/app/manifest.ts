import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plataforma de gestión | Aplicación de demostración",
    short_name: "Plataforma de gestión",
    description:
      "Aplicación de demostración para explorar procesos de gestión con datos ficticios.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#061f3d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
