import type { Metadata } from "next";
import { GuestWorkspaceApp } from "@/components/guest-workspace-app";

export const metadata: Metadata = {
  title: "Explorar la plataforma",
  description: "Recorre la Plataforma de gestión con un espacio local y datos ficticios.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function ExplorePage() {
  return <GuestWorkspaceApp />;
}
