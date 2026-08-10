import { NextResponse } from "next/server";
import { getWorkspaceAccess } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadAuthorizedExportDataset, safeExportFilename, serializeCsv, serializeXlsx } from "@/lib/workspace-exports";

type ExportRouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: ExportRouteContext) {
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Exportación no válida" }, { status: 400 });
  const access = await getWorkspaceAccess();
  if (access.status !== "active") return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const supabase = await createClient();
  const { data: job, error } = await supabase.from("export_jobs").select("id,name,module_id,target,status").eq("organization_id", access.organizationId).eq("profile_id", access.userId).eq("id", id).single();
  if (error || !job || !["csv", "xlsx"].includes(job.target) || job.status !== "ready") return NextResponse.json({ error: "Exportación no disponible" }, { status: 404 });
  try {
    const dataset = await loadAuthorizedExportDataset(supabase, access.organizationId, job.module_id);
    const filename = safeExportFilename(job.name);
    if (job.target === "csv") return new Response(serializeCsv(dataset), { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${filename}.csv"`, "cache-control": "private, no-store" } });
    const buffer = await serializeXlsx(dataset, job.name);
    return new Response(buffer, { headers: { "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "content-disposition": `attachment; filename="${filename}.xlsx"`, "cache-control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "No se pudo generar el archivo" }, { status: 500 });
  }
}
