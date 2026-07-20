import type { Metadata } from "next";
import { GuestDemoApp } from "@/components/guest-demo-app";

export const metadata: Metadata = {
  title: "Demo interactiva",
  description:
    "Entorno invitado de la Plataforma de gestión con datos sintéticos.",
};

export default function GuestDemoPage() {
  return <GuestDemoApp />;
}
