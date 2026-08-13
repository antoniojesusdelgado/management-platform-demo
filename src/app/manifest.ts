import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Plataforma de gestión — Todo el trabajo, en un solo lugar",
    short_name: "Plataforma de gestión",
    description:
      "Coordina personas, proyectos, capacidad y decisiones desde un único espacio.",
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
