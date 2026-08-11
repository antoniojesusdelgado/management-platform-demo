import { NextResponse } from "next/server";
import { loadDirectoryPage } from "@/lib/directory-provider";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshWorkspaceAccessToken } from "@/lib/workspace-oauth";
import type { WorkspaceProvider } from "@/domain/operations";

type SecretPayload = { access_token?: string; refresh_token?: string; expires_at?: string };

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || request.headers.get("authorization") !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Supabase no configurado" }, { status: 503 });

  const { data: settings, error: settingsError } = await admin
    .from("organization_directory_settings")
    .select("organization_id,provider")
    .eq("status", "ready");
  if (settingsError) return NextResponse.json({ error: "No se pudo cargar la programación" }, { status: 500 });

  let succeeded = 0;
  let failed = 0;
  for (const setting of settings ?? []) {
    const provider = setting.provider as WorkspaceProvider;
    try {
      const [{ data: connection }, { data: cursorRecord }] = await Promise.all([
        admin.from("workspace_connections").select("id,account_label,capabilities,profile_id").eq("organization_id", setting.organization_id).eq("provider", provider).eq("status", "connected").limit(1).maybeSingle(),
        admin.from("directory_sync_cursors").select("cursor_value").eq("organization_id", setting.organization_id).eq("provider", provider).maybeSingle(),
      ]);
      if (!connection) throw new Error("connection_missing");
      const { data: secretData, error: secretError } = await admin.rpc("get_workspace_connection_secret", { target_connection_id: connection.id });
      if (secretError || !secretData) throw new Error("secret_unavailable");
      let secret = secretData as SecretPayload;
      if (!secret.access_token) throw new Error("access_token_unavailable");
      if (!secret.expires_at || Date.parse(secret.expires_at) < Date.now() + 60_000) {
        const refreshed = await refreshWorkspaceAccessToken(provider, secret.refresh_token ?? "");
        const { error: refreshError } = await admin.rpc("refresh_directory_connection_secret_v1_8", {
          target_connection_id: connection.id,
          target_access_token: refreshed.accessToken,
          target_refresh_token: refreshed.refreshToken,
          target_expires_at: refreshed.expiresAt,
        });
        if (refreshError) throw refreshError;
        secret = { access_token: refreshed.accessToken, refresh_token: refreshed.refreshToken, expires_at: refreshed.expiresAt };
      }
      const token = secret.access_token;
      if (!token) throw new Error("access_token_unavailable");
      let cursor = provider === "microsoft_365" ? cursorRecord?.cursor_value ?? null : null;
      let complete = false;
      let pageNumber = 0;
      const runKey = `scheduled:${new Date().toISOString().slice(0, 13)}:${provider}`;
      while (!complete && pageNumber < 25) {
        const page = await loadDirectoryPage(provider, token, cursor);
        const { error: applyError } = await admin.rpc("apply_directory_sync_batch_v1_8", {
          target_organization_id: setting.organization_id,
          target_provider: provider,
          target_users: page.users,
          target_cursor: page.cursor ?? "",
          target_full_sync_completed: page.complete,
          target_trigger: "scheduled",
          target_idempotency_key: `${runKey}:${pageNumber}`,
        });
        if (applyError) throw applyError;
        cursor = page.cursor;
        complete = page.complete;
        pageNumber += 1;
      }
      if (!complete) throw new Error("directory_page_limit_reached");
      succeeded += 1;
    } catch (error) {
      failed += 1;
      const errorCode = error instanceof Error ? error.message.slice(0, 80) : "directory_sync_failed";
      await admin.from("organization_directory_settings").update({ status: "error", last_error_code: errorCode, updated_at: new Date().toISOString() }).eq("organization_id", setting.organization_id).eq("provider", provider);
    }
  }
  return NextResponse.json({ ok: failed === 0, succeeded, failed });
}
