function validUrl(value: string | undefined) {
  if (!value) return null;
  try {
    const normalized = value.startsWith("http") ? value : `https://${value}`;
    return new URL(normalized).origin;
  } catch {
    return null;
  }
}

export const publicEnv = {
  appUrl:
    validUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    validUrl(process.env.NEXT_PUBLIC_VERCEL_URL),
  supabaseUrl: validUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || null,
};

export type SignInProviderAvailability = {
  enabled: boolean;
  reason: string | null;
};

export function getSignInProviderAvailability(): Record<
  "google" | "azure",
  SignInProviderAvailability
> {
  const configured = isSupabaseConfigured();
  return {
    google: {
      enabled: configured,
      reason: configured ? null : "La autenticación todavía no está configurada.",
    },
    azure: {
      enabled: configured && process.env.MICROSOFT_SIGN_IN_ENABLED === "true",
      reason: configured
        ? "El acceso con Microsoft necesita habilitarse en el entorno de despliegue."
        : "La autenticación todavía no está configurada.",
    },
  };
}

export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabasePublishableKey);
}
