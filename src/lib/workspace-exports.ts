import "server-only";

import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type ExportCell = string | number | boolean | null;
export type ExportDataset = { headers: string[]; rows: ExportCell[][] };

export async function loadAuthorizedExportDataset(supabase: SupabaseClient<Database>, organizationId: string, moduleId: string): Promise<ExportDataset> {
  if (moduleId === "proyectos") {
    const { data, error } = await supabase.from("projects").select("code,name,status,health,start_date,target_date").eq("organization_id", organizationId).order("code").limit(25_000);
    if (error) throw error;
    return { headers: ["Código","Proyecto","Estado","Salud","Inicio","Objetivo"], rows: (data ?? []).map((row) => [row.code,row.name,row.status,row.health,row.start_date,row.target_date]) };
  }
  if (moduleId === "tareas") {
    const { data, error } = await supabase.from("tasks").select("title,status,priority,due_date,project:projects(name),assignee:people!tasks_assignee_person_id_fkey(display_name)").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(25_000);
    if (error) throw error;
    return { headers: ["Tarea","Estado","Prioridad","Vencimiento","Proyecto","Responsable"], rows: (data ?? []).map((row) => [row.title,row.status,row.priority,row.due_date,(row.project as unknown as {name:string}|null)?.name ?? "",(row.assignee as unknown as {display_name:string}|null)?.display_name ?? ""]) };
  }
  if (moduleId === "incidencias") {
    const { data, error } = await supabase.from("incidents").select("title,status,priority,category,affected_service,sla_due_at").eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(25_000);
    if (error) throw error;
    return { headers: ["Incidencia","Estado","Prioridad","Categoría","Servicio","Objetivo SLA"], rows: (data ?? []).map((row) => [row.title,row.status,row.priority,row.category,row.affected_service,row.sla_due_at]) };
  }
  if (moduleId === "personal") {
    const { data, error } = await supabase.from("people").select("display_name,team,position_title,status,role_code,employment_start_date").eq("organization_id", organizationId).order("display_name").limit(25_000);
    if (error) throw error;
    return { headers: ["Persona","Equipo","Puesto","Estado","Rol","Fecha de incorporación"], rows: (data ?? []).map((row) => [row.display_name,row.team,row.position_title,row.status,row.role_code,row.employment_start_date]) };
  }
  if (moduleId === "vacaciones") {
    const { data, error } = await supabase.from("leave_requests").select("start_date,end_date,business_days,leave_type,status,person:people!leave_requests_person_id_fkey(display_name)").eq("organization_id", organizationId).order("start_date", { ascending: false }).limit(25_000);
    if (error) throw error;
    return { headers: ["Persona","Inicio","Fin","Días laborables","Tipo","Estado"], rows: (data ?? []).map((row) => [(row.person as unknown as {display_name:string}).display_name,row.start_date,row.end_date,row.business_days,row.leave_type,row.status]) };
  }
  if (moduleId === "analitica") {
    const { data, error } = await supabase.from("saved_analytics_views").select("name,module_id,filters,updated_at").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(25_000);
    if (error) throw error;
    return { headers: ["Vista","Módulo","Filtros","Actualización"], rows: (data ?? []).map((row) => [row.name,row.module_id,JSON.stringify(row.filters),row.updated_at]) };
  }
  throw new Error(`unsupported_export_module:${moduleId}`);
}

export function serializeCsv(dataset: ExportDataset) {
  const escape = (value: ExportCell) => { const text = value === null ? "" : String(value); return `"${text.replaceAll('"', '""')}"`; };
  return `\uFEFF${[dataset.headers, ...dataset.rows].map((row) => row.map(escape).join(";")).join("\r\n")}`;
}

export async function serializeXlsx(dataset: ExportDataset, title: string) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Plataforma de gestión";
  const worksheet = workbook.addWorksheet("Informe");
  worksheet.addRow(dataset.headers);
  dataset.rows.forEach((row) => worksheet.addRow(row));
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, dataset.rows.length + 1), column: dataset.headers.length } };
  worksheet.columns.forEach((column) => { column.width = Math.min(42, Math.max(14, ...(column.values ?? []).map((value) => String(value ?? "").length + 2))); });
  workbook.subject = title;
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

export function safeExportFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "informe";
}
