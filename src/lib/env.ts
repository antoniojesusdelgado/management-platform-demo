function validUrl(value: string | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export const publicEnv = {
  appUrl: validUrl(process.env.NEXT_PUBLIC_APP_URL),
  supabaseUrl: validUrl(process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || null,
};

export function isSupabaseConfigured() {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabasePublishableKey);
}
