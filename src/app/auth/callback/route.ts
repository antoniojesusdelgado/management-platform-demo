import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

function safeNext(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/app/inicio";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  if (!isSupabaseConfigured() || !code) {
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=oauth", url.origin));
  }

  const { data: organizationId, error: provisioningError } = await supabase.rpc(
    "ensure_public_demo_workspace",
  );

  if (!provisioningError && organizationId) {
    await supabase.rpc("touch_demo_workspace", {
      expected_organization_id: organizationId,
    });
  }

  return NextResponse.redirect(
    new URL(provisioningError ? "/login?error=workspace" : next, url.origin),
  );
}
