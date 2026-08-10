import { NextResponse } from "next/server";
import type { WorkspaceProvider } from "@/domain/operations";
import { getWorkspaceAccess } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { refreshWorkspaceAccessToken } from "@/lib/workspace-oauth";
import { loadAuthorizedExportDataset, safeExportFilename, serializeXlsx, type ExportDataset } from "@/lib/workspace-exports";

type SecretPayload = { access_token?: string; refresh_token?: string; expires_at?: string };

type ExportRouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: ExportRouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Exportación no válida" }, { status: 400 });
  const access = await getWorkspaceAccess();
  if (access.status !== "active") return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const supabase = await createClient();
  const { data: job, error: jobError } = await supabase.from("export_jobs").select("id,name,module_id,target,status").eq("organization_id", access.organizationId).eq("profile_id", access.userId).eq("id", id).single();
  if (jobError || !job || !["google_sheets", "microsoft_excel"].includes(job.target) || job.status !== "pending") return NextResponse.json({ error: "Exportación no disponible" }, { status: 404 });
  const provider: WorkspaceProvider = job.target === "google_sheets" ? "google_workspace" : "microsoft_365";
  const { data: connection, error: connectionError } = await supabase.from("workspace_connections").select("id,account_label,capabilities,token_expires_at").eq("organization_id", access.organizationId).eq("profile_id", access.userId).eq("provider", provider).eq("status", "connected").single();
  if (connectionError || !connection) return NextResponse.json({ error: "Conecta primero el proveedor elegido" }, { status: 409 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La integración externa no está configurada" }, { status: 503 });
  try {
    const { data: secretData, error: secretError } = await admin.rpc("get_workspace_connection_secret", { target_connection_id: connection.id });
    if (secretError || !secretData) throw new Error("secret_unavailable");
    let secret = secretData as SecretPayload;
    if (!secret.access_token) throw new Error("access_token_unavailable");
    if (!secret.expires_at || Date.parse(secret.expires_at) < Date.now() + 60_000) {
      const refreshed = await refreshWorkspaceAccessToken(provider, secret.refresh_token ?? "");
      const { error } = await supabase.rpc("save_workspace_connection", { expected_organization_id: access.organizationId, expected_profile_id: access.userId, target_provider: provider, target_account_label: connection.account_label, target_capabilities: connection.capabilities, target_access_token: refreshed.accessToken, target_refresh_token: refreshed.refreshToken, target_expires_at: refreshed.expiresAt });
      if (error) throw error;
      secret = { access_token: refreshed.accessToken, refresh_token: refreshed.refreshToken, expires_at: refreshed.expiresAt };
    }
    const accessToken = secret.access_token;
    if (!accessToken) throw new Error("access_token_unavailable");
    const dataset = await loadAuthorizedExportDataset(supabase, access.organizationId, job.module_id);
    const externalUrl = provider === "google_workspace"
      ? await createGoogleSpreadsheet(accessToken, job.name, dataset)
      : await createMicrosoftWorkbook(accessToken, job.name, dataset);
    const { error: updateError } = await supabase.from("export_jobs").update({ status: "ready", external_url: externalUrl, updated_at: new Date().toISOString() }).eq("id", job.id).eq("profile_id", access.userId);
    if (updateError) throw updateError;
    return NextResponse.json({ ok: true, externalUrl });
  } catch {
    await supabase.from("export_jobs").update({ status: "failed", error_summary: "No se pudo completar la exportación externa.", updated_at: new Date().toISOString() }).eq("id", job.id).eq("profile_id", access.userId);
    return NextResponse.json({ error: "No se pudo completar la exportación externa" }, { status: 502 });
  }
}

async function createGoogleSpreadsheet(accessToken: string, title: string, dataset: ExportDataset) {
  const createResponse = await fetch("https://sheets.googleapis.com/v4/spreadsheets", { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ properties: { title } }), cache: "no-store" });
  if (!createResponse.ok) throw new Error(`google_create_failed:${createResponse.status}`);
  const spreadsheet = await createResponse.json() as { spreadsheetId?: string; spreadsheetUrl?: string; sheets?: Array<{ properties?: { title?: string } }> };
  if (!spreadsheet.spreadsheetId) throw new Error("google_spreadsheet_id_missing");
  const sheetTitle = spreadsheet.sheets?.[0]?.properties?.title ?? "Sheet1";
  const values = [dataset.headers, ...dataset.rows];
  for (let offset = 0; offset < values.length; offset += 500) {
    const chunk = values.slice(offset, offset + 500);
    const range = `'${sheetTitle.replaceAll("'", "''")}'!A${offset + 1}`;
    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheet.spreadsheetId)}/values/${encodeURIComponent(range)}?valueInputOption=RAW`, { method: "PUT", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ majorDimension: "ROWS", values: chunk }), cache: "no-store" });
    if (!response.ok) throw new Error(`google_values_failed:${response.status}`);
  }
  return spreadsheet.spreadsheetUrl ?? `https://docs.google.com/spreadsheets/d/${spreadsheet.spreadsheetId}`;
}

async function createMicrosoftWorkbook(accessToken: string, title: string, dataset: ExportDataset) {
  const headers = { authorization: `Bearer ${accessToken}`, "content-type": "application/json" };
  const folderResponse = await fetch("https://graph.microsoft.com/v1.0/me/drive/root/children", { method: "POST", headers, body: JSON.stringify({ name: "Platform exports", folder: {}, "@microsoft.graph.conflictBehavior": "fail" }), cache: "no-store" });
  if (!folderResponse.ok && folderResponse.status !== 409) throw new Error(`microsoft_folder_failed:${folderResponse.status}`);
  const buffer = await serializeXlsx(dataset, title);
  const filename = `${safeExportFilename(title)}.xlsx`;
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/Platform%20exports/${encodeURIComponent(filename)}:/content`, { method: "PUT", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }, body: buffer, cache: "no-store" });
  if (!response.ok) throw new Error(`microsoft_upload_failed:${response.status}`);
  const item = await response.json() as { webUrl?: string };
  if (!item.webUrl) throw new Error("microsoft_web_url_missing");
  return item.webUrl;
}
