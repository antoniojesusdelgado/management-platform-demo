"use client";

import { IconUser } from "@tabler/icons-react";
import Link from "next/link";

const GUEST_STORAGE_KEYS = [
  "management-platform:v1",
  "management-platform-demo:v1",
] as const;

export function GuestAccessLink() {
  function startFreshWorkspace() {
    try {
      for (const key of GUEST_STORAGE_KEYS) {
        window.sessionStorage.removeItem(key);
      }
    } catch {
      // The guest workspace can still run in memory when storage is unavailable.
    }
  }

  return (
    <Link
      className="button button-secondary oauth-secondary"
      href="/explorar"
      onClick={startFreshWorkspace}
    >
      <IconUser aria-hidden="true" size={22} />
      Explorar la plataforma
    </Link>
  );
}
