import type { Metadata } from "next";
import { GuestDemoApp } from "@/components/guest-demo-app";

export const metadata: Metadata = {
  title: "Demo interactiva",
  description:
    "Acceso sin cuenta a la Plataforma de gestión con datos ficticios.",
};

export default function GuestDemoPage() {
  return <GuestDemoApp />;
}
