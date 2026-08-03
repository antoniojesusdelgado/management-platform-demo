import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=/app/inicio`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  return NextResponse.redirect(data.url);
}
