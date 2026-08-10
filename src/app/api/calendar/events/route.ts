import { NextResponse } from "next/server";
import { calendarEventInputSchema, type WorkspaceProvider } from "@/domain/operations";
import { getWorkspaceAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { refreshWorkspaceAccessToken } from "@/lib/workspace-oauth";

type SecretPayload = { access_token?: string; refresh_token?: string; expires_at?: string };

export async function POST(request: Request) {
  const parsed = calendarEventInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa el título y las fechas." }, { status: 400 });
  const access = await getWorkspaceAccess();
  if (access.status !== "active") return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const supabase = await createClient();
  const { data: connection, error: connectionError } = await supabase
    .from("workspace_connections")
    .select("id,account_label,capabilities")
    .eq("organization_id", access.organizationId)
    .eq("profile_id", access.userId)
    .eq("provider", parsed.data.provider)
    .eq("status", "connected")
    .contains("capabilities", ["calendar"])
    .single();
  if (connectionError || !connection) return NextResponse.json({ error: "Conecta un calendario compatible." }, { status: 409 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La integración no está configurada." }, { status: 503 });

  try {
    const { data, error } = await admin.rpc("get_workspace_connection_secret", { target_connection_id: connection.id });
    if (error || !data) throw new Error("secret_unavailable");
    let secret = data as SecretPayload;
    if (!secret.access_token) throw new Error("access_token_unavailable");
    if (!secret.expires_at || Date.parse(secret.expires_at) < Date.now() + 60_000) {
      const refreshed = await refreshWorkspaceAccessToken(parsed.data.provider, secret.refresh_token ?? "");
      const { error: saveError } = await supabase.rpc("save_workspace_connection", {
        expected_organization_id: access.organizationId,
        expected_profile_id: access.userId,
        target_provider: parsed.data.provider,
        target_account_label: connection.account_label,
        target_capabilities: connection.capabilities,
        target_access_token: refreshed.accessToken,
        target_refresh_token: refreshed.refreshToken,
        target_expires_at: refreshed.expiresAt,
      });
      if (saveError) throw saveError;
      secret = { access_token: refreshed.accessToken, refresh_token: refreshed.refreshToken, expires_at: refreshed.expiresAt };
    }
    const accessToken = secret.access_token;
    if (!accessToken) throw new Error("access_token_unavailable");
    const externalUrl = await createCalendarEvent(parsed.data.provider, accessToken, parsed.data);
    return NextResponse.json({ ok: true, externalUrl });
  } catch {
    return NextResponse.json({ error: "No se pudo crear el evento." }, { status: 502 });
  }
}

async function createCalendarEvent(
  provider: WorkspaceProvider,
  accessToken: string,
  event: { title: string; description: string; startsAt: string; endsAt: string },
) {
  if (provider === "google_workspace") {
    const response = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary/events", {
      method: "POST",
      headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: JSON.stringify({ summary: event.title, description: event.description, start: { dateTime: event.startsAt, timeZone: "Europe/Madrid" }, end: { dateTime: event.endsAt, timeZone: "Europe/Madrid" } }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`google_calendar_failed:${response.status}`);
    const created = await response.json() as { htmlLink?: string };
    return created.htmlLink ?? "https://calendar.google.com/calendar/";
  }
  const response = await fetch("https://graph.microsoft.com/v1.0/me/events", {
    method: "POST",
    headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
    body: JSON.stringify({ subject: event.title, body: { contentType: "text", content: event.description }, start: { dateTime: event.startsAt.replace(/Z$/, ""), timeZone: "Romance Standard Time" }, end: { dateTime: event.endsAt.replace(/Z$/, ""), timeZone: "Romance Standard Time" } }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`microsoft_calendar_failed:${response.status}`);
  const created = await response.json() as { webLink?: string };
  return created.webLink ?? "https://outlook.office.com/calendar/";
}
