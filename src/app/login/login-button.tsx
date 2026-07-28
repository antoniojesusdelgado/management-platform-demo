"use client";

import { IconLoader2 } from "@tabler/icons-react";
import Image from "next/image";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/env";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function signIn() {
    if (!configured) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/app/inicio`,
      },
    });

    if (error) setLoading(false);
  }

  return (
    <button
      className="button google-oauth-button"
      type="button"
      disabled={!configured || loading}
      onClick={signIn}
    >
      {loading ? (
        <IconLoader2 className="button-spinner" aria-hidden="true" size={20} />
      ) : (
        <Image
          src="/google-g.svg"
          alt=""
          width={20}
          height={20}
        />
      )}
      Continuar con Google
      {!configured ? (
        <span className="sr-only">OAuth no configurado en este entorno local</span>
      ) : null}
    </button>
  );
}
