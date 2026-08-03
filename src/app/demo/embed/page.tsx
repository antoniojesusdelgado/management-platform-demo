import type { Metadata } from "next";
import { EmbedDemoEntry } from "@/components/embed-demo-entry";

export const metadata: Metadata = {
  title: "Demo interactiva",
  description:
    "Acceso sin cuenta a la Plataforma de gestión con datos ficticios.",
};

export const dynamic = "force-dynamic";

export default function GuestDemoPage() {
  return <EmbedDemoEntry />;
}
