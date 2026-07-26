"use client";

import { IconBrandGoogle, IconLoader2 } from "@tabler/icons-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, publicEnv } from "@/lib/env";

export function LoginButton() {
  const [loading, setLoading] = useState(false);
  const configured = isSupabaseConfigured();

  async function signIn() {
    if (!configured) return;
    setLoading(true);
    const supabase = createClient();
    const appOrigin = publicEnv.appUrl ?? window.location.origin;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${appOrigin}/auth/callback?next=/app/inicio`,
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
        <IconLoader2 aria-hidden="true" size={19} />
      ) : (
        <IconBrandGoogle aria-hidden="true" size={19} />
      )}
      {configured ? "Continuar con Google" : "OAuth pendiente de configuración"}
    </button>
  );
}
