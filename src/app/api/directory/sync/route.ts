import { NextResponse } from "next/server";
import { z } from "zod";
import { loadDirectoryPage } from "@/lib/directory-provider";
import { requirePermission } from "@/lib/authorization";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { refreshWorkspaceAccessToken } from "@/lib/workspace-oauth";

const requestSchema = z.object({
  provider: z.enum(["google_workspace", "microsoft_365"]),
});

type SecretPayload = { access_token?: string; refresh_token?: string; expires_at?: string };
type DirectoryRpc = (
  name: string,
  args: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: { message: string } | null }>;

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Proveedor no válido." }, { status: 400 });

  let access;
  try {
    access = await requirePermission("settings.workspace.manage");
  } catch {
    return NextResponse.json({ error: "No tienes permiso para sincronizar el directorio." }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: connection, error: connectionError } = await supabase
    .from("workspace_connections")
    .select("id,account_label,capabilities,granted_scopes,account_kind,directory_authorized")
    .eq("organization_id", access.organizationId)
    .eq("profile_id", access.userId)
    .eq("provider", parsed.data.provider)
    .eq("status", "connected")
    .single();
  if (connectionError || !connection) {
    return NextResponse.json({ error: "Conecta primero la suite corporativa." }, { status: 409 });
  }
  if (!connection.directory_authorized) {
    const consumer = connection.account_kind === "consumer";
    return NextResponse.json({
      error: consumer
        ? "La sincronización de personas requiere una cuenta corporativa administrada."
        : "Amplía los permisos con una cuenta administradora antes de sincronizar.",
      code: consumer ? "corporate_account_required" : "admin_consent_required",
    }, { status: 409 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La integración no está configurada en el servidor." }, { status: 503 });

  try {
    const { data, error } = await admin.rpc("get_workspace_connection_secret", { target_connection_id: connection.id });
    if (error || !data) throw new Error("secret_unavailable");
    let secret = data as SecretPayload;
    if (!secret.access_token) throw new Error("access_token_unavailable");
    if (!secret.expires_at || Date.parse(secret.expires_at) < Date.now() + 60_000) {
      const refreshed = await refreshWorkspaceAccessToken(parsed.data.provider, secret.refresh_token ?? "");
      const { error: saveError } = await supabase.rpc("save_workspace_connection_v1_8_1", {
        expected_organization_id: access.organizationId,
        expected_profile_id: access.userId,
        target_provider: parsed.data.provider,
        target_account_label: connection.account_label,
        target_capabilities: connection.capabilities,
        target_granted_scopes: connection.granted_scopes,
        target_account_kind: connection.account_kind,
        target_directory_authorized: connection.directory_authorized,
        target_access_token: refreshed.accessToken,
        target_refresh_token: refreshed.refreshToken,
        target_expires_at: refreshed.expiresAt,
      });
      if (saveError) throw saveError;
      secret = { access_token: refreshed.accessToken, refresh_token: refreshed.refreshToken, expires_at: refreshed.expiresAt };
    }

    const rpc = admin.rpc.bind(admin) as unknown as DirectoryRpc;
    const requestId = crypto.randomUUID();
    const accessToken = secret.access_token;
    if (!accessToken) throw new Error("access_token_unavailable");
    let cursor: string | null = null;
    let pageNumber = 0;
    let processed = 0;
    let complete = false;
    while (!complete && pageNumber < 25) {
      const page = await loadDirectoryPage(parsed.data.provider, accessToken, cursor);
      const { error: applyError } = await rpc("apply_directory_sync_batch_v1_8", {
        target_organization_id: access.organizationId,
        target_provider: parsed.data.provider,
        target_users: page.users,
        target_cursor: page.cursor,
        target_full_sync_completed: page.complete,
        target_trigger: pageNumber === 0 ? "manual" : "initial",
        target_idempotency_key: `${requestId}:${pageNumber}`,
      });
      if (applyError) throw new Error(`directory_apply_failed:${applyError.message}`);
      processed += page.users.length;
      cursor = page.cursor;
      complete = page.complete;
      pageNumber += 1;
    }
    if (!complete) throw new Error("directory_page_limit_reached");
    return NextResponse.json({ ok: true, processed, pages: pageNumber });
  } catch (error) {
    const code = error instanceof Error ? error.message.split(":")[0] : "directory_sync_failed";
    return NextResponse.json({ error: "No se pudo completar la sincronización.", code }, { status: 502 });
  }
}
