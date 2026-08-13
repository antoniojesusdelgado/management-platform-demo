import type { Route } from "next";
import { permanentRedirect } from "next/navigation";

export default function GuestDemoPage() {
  permanentRedirect("/explorar" as Route);
}
