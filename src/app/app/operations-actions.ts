"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { actionFailure, actionSuccess, type ActionResult } from "@/domain/action-result";
import {
  automationRuleInputSchema,
  exportTargets,
  notificationStatuses,
  type NotificationStatus,
  type WorkspaceProvider,
  workspaceProviders,
} from "@/domain/operations";
import { plainTextSchema } from "@/domain/validation";
import { getWorkspaceAccess } from "@/lib/auth";
import { hasWorkspacePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.uuid();
const allocationInputSchema = z.object({
  personId: z.uuid(),
  projectId: z.uuid(),
  weekStart: z.iso.date(),
  allocatedHours: z.number().min(0).max(80),
  availableHours: z.number().min(0).max(80),
});
const exportInputSchema = z.object({
  name: plainTextSchema({ min: 3, max: 120 }),
  moduleId: z.enum(["analitica", "proyectos", "tareas", "incidencias", "personal", "vacaciones"]),
  target: z.enum(exportTargets),
});

async function requireOperationsPermission(permission: "operations.automations.manage" | "operations.capacity.manage" | "operations.notifications.view" | "analytics.dashboards.export") {
  const access = await getWorkspaceAccess();
  if (access.status !== "active") return { access: null, error: actionFailure("authentication_required", "Inicia sesión para continuar.") } as const;
  if (!(await hasWorkspacePermission(permission))) return { access: null, error: actionFailure("permission_denied", "Tu rol no permite realizar esta operación.") } as const;
  return { access, error: null } as const;
}
export async function createAutomationRuleAction(input: unknown): Promise<ActionResult> {
  const parsed = automationRuleInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure("validation_error", "Revisa el nombre, el evento y la acción de la regla.");
  const context = await requireOperationsPermission("operations.automations.manage");
  if (context.error) return context.error;
  const supabase = await createClient();
  const { error } = await supabase.from("automation_rules").insert({ organization_id: context.access.organizationId, created_by: context.access.userId, name: parsed.data.name, trigger_code: parsed.data.trigger, action_code: parsed.data.action, condition_config: parsed.data.condition ?? {}, enabled: true });
  if (error) return actionFailure("unexpected_error", "No se pudo crear la regla.");
  revalidatePath("/app/operaciones");
  return actionSuccess();
}
export async function toggleAutomationRuleAction(ruleId: string, enabled: boolean): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(ruleId);
  if (!parsedId.success || typeof enabled !== "boolean") return actionFailure("validation_error", "La regla no es válida.");
  const context = await requireOperationsPermission("operations.automations.manage");
  if (context.error) return context.error;
  const supabase = await createClient();
  const { error } = await supabase.from("automation_rules").update({ enabled, updated_at: new Date().toISOString() }).eq("organization_id", context.access.organizationId).eq("id", parsedId.data);
  if (error) return actionFailure("unexpected_error", "No se pudo actualizar la regla.");
  revalidatePath("/app/operaciones");
  return actionSuccess();
}

export async function runAutomationRuleAction(ruleId: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(ruleId);
  if (!parsedId.success) return actionFailure("validation_error", "La regla no es válida.");
  const context = await requireOperationsPermission("operations.automations.manage");
  if (context.error) return context.error;
  const supabase = await createClient();
  const { data: rule, error: ruleError } = await supabase.from("automation_rules").select("id,name,enabled").eq("organization_id", context.access.organizationId).eq("id", parsedId.data).single();
  if (ruleError || !rule?.enabled) return actionFailure("conflict", "Activa la regla antes de ejecutarla.");
  const createdAt = new Date().toISOString();
  const idempotencyKey = `manual:${rule.id}:${createdAt.slice(0, 16)}`;
  const [runResult, notificationResult] = await Promise.all([
    supabase.from("automation_runs").insert({ organization_id: context.access.organizationId, rule_id: rule.id, status: "succeeded", summary: `Acción preparada: ${rule.name}.`, idempotency_key: idempotencyKey }),
    supabase.from("operational_notifications").insert({ organization_id: context.access.organizationId, recipient_profile_id: context.access.userId, title: "Automatización preparada", description: rule.name, priority: "medium", status: "unread", source: "automation", href: "/app/operaciones" }),
    supabase.from("automation_rules").update({ last_run_at: createdAt, updated_at: createdAt }).eq("organization_id", context.access.organizationId).eq("id", rule.id),
  ]);
  if (runResult.error || notificationResult.error) return actionFailure("unexpected_error", "No se pudo registrar la ejecución.");
  revalidatePath("/app/operaciones");
  return actionSuccess();
}

export async function applyProjectTemplateAction(templateId: string): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(templateId);
  if (!parsedId.success) return actionFailure("validation_error", "La plantilla no es válida.");
  const context = await requireOperationsPermission("operations.automations.manage");
  if (context.error) return context.error;
  if (!(await hasWorkspacePermission("projects.items.manage"))) return actionFailure("permission_denied", "Necesitas permiso para administrar proyectos.");
  const supabase = await createClient();
  const { data: template, error: templateError } = await supabase.from("project_templates").select("id,name,description,duration_days,tasks").eq("organization_id", context.access.organizationId).eq("id", parsedId.data).single();
  if (templateError || !template) return actionFailure("conflict", "No se encontró la plantilla.");
  const suffix = Date.now().toString(36).slice(-6).toUpperCase();
  const startDate = new Date();
  const targetDate = new Date(startDate.getTime() + template.duration_days * 86_400_000);
  const { data: project, error: projectError } = await supabase.from("projects").insert({ organization_id: context.access.organizationId, code: `TPL-${suffix}`, name: template.name, summary: template.description, status: "active", health: "on_track", start_date: startDate.toISOString().slice(0, 10), target_date: targetDate.toISOString().slice(0, 10), color: "#2563eb", created_by: context.access.userId }).select("id").single();
  if (projectError || !project) return actionFailure("unexpected_error", "No se pudo crear el proyecto.");
  const tasks = Array.isArray(template.tasks) ? template.tasks : [];
  if (tasks.length) {
    const { error } = await supabase.from("tasks").insert(tasks.slice(0, 100).map((task, index) => ({ organization_id: context.access.organizationId, project_id: project.id, title: typeof task === "object" && task && "title" in task ? String(task.title).slice(0, 160) : `Paso ${index + 1}`, description: "Tarea generada desde una plantilla operativa.", status: "pending", priority: "medium", due_date: new Date(startDate.getTime() + (index + 1) * 86_400_000).toISOString().slice(0, 10), created_by: context.access.userId })));
    if (error) return actionFailure("unexpected_error", "El proyecto se creó, pero no se pudieron generar todas las tareas.");
  }
  revalidatePath("/app/operaciones");
  return actionSuccess();
}

export async function addCapacityAllocationAction(input: unknown): Promise<ActionResult> {
  const parsed = allocationInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure("validation_error", "Revisa la persona, el proyecto y las horas.");
  const context = await requireOperationsPermission("operations.capacity.manage");
  if (context.error) return context.error;
  const supabase = await createClient();
  const weekEnd = new Date(`${parsed.data.weekStart}T00:00:00.000Z`);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
  const [leaveResult, tasksResult] = await Promise.all([
    supabase.from("leave_requests").select("business_days").eq("organization_id", context.access.organizationId).eq("person_id", parsed.data.personId).eq("status", "approved").lte("start_date", weekEnd.toISOString().slice(0, 10)).gte("end_date", parsed.data.weekStart),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("organization_id", context.access.organizationId).eq("assignee_person_id", parsed.data.personId).in("status", ["pending", "in_progress", "blocked", "in_review"]),
  ]);
  if (leaveResult.error || tasksResult.error) return actionFailure("unexpected_error", "No se pudo calcular la disponibilidad.");
  const leaveHours = Math.min(40, (leaveResult.data ?? []).reduce((sum, request) => sum + Number(request.business_days ?? 0) * 8, 0));
  const taskHours = Math.min(16, (tasksResult.count ?? 0) * 2);
  const availableHours = Math.max(0, 40 - leaveHours - taskHours);
  const { error } = await supabase.from("capacity_allocations").upsert({ organization_id: context.access.organizationId, created_by: context.access.userId, person_id: parsed.data.personId, project_id: parsed.data.projectId, week_start: parsed.data.weekStart, allocated_hours: parsed.data.allocatedHours, available_hours: availableHours }, { onConflict: "organization_id,person_id,project_id,week_start" });
  if (error) return actionFailure("unexpected_error", "No se pudo guardar la asignación.");
  revalidatePath("/app/operaciones");
  return actionSuccess();
}

export async function markOperationalNotificationAction(notificationId: string, status: NotificationStatus): Promise<ActionResult> {
  const parsedId = idSchema.safeParse(notificationId);
  if (!parsedId.success || !notificationStatuses.includes(status)) return actionFailure("validation_error", "La notificación no es válida.");
  const context = await requireOperationsPermission("operations.notifications.view");
  if (context.error) return context.error;
  const supabase = await createClient();
  const { error } = await supabase.from("operational_notifications").update({ status, updated_at: new Date().toISOString() }).eq("organization_id", context.access.organizationId).eq("recipient_profile_id", context.access.userId).eq("id", parsedId.data);
  if (error) return actionFailure("unexpected_error", "No se pudo actualizar la notificación.");
  revalidatePath("/app/operaciones");
  return actionSuccess();
}

export async function createExportJobAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = exportInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure("validation_error", "Revisa el nombre, la vista y el destino.");
  const context = await requireOperationsPermission("analytics.dashboards.export");
  if (context.error) return context.error;
  const supabase = await createClient();
  const tableByModule = { analitica: "saved_analytics_views", proyectos: "projects", tareas: "tasks", incidencias: "incidents", personal: "people", vacaciones: "leave_requests" } as const;
  const { count, error: countError } = await supabase.from(tableByModule[parsed.data.moduleId]).select("id", { count: "exact", head: true }).eq("organization_id", context.access.organizationId);
  if (countError) return actionFailure("unexpected_error", "No se pudo preparar la vista autorizada.");
  if ((count ?? 0) > 25_000) return actionFailure("validation_error", "Aplica filtros más concretos antes de exportar.");
  const localTarget = parsed.data.target === "csv" || parsed.data.target === "xlsx";
  const { data, error } = await supabase.from("export_jobs").insert({ organization_id: context.access.organizationId, profile_id: context.access.userId, name: parsed.data.name, module_id: parsed.data.moduleId, target: parsed.data.target, status: localTarget ? "ready" : "pending", row_count: count ?? 0, filter_snapshot: { source: "authorized_module_view" } }).select("id").single();
  if (error || !data) return actionFailure("unexpected_error", "No se pudo crear la exportación.");
  revalidatePath("/app/operaciones");
  return actionSuccess({ id: data.id });
}

export async function disconnectWorkspaceAction(provider: WorkspaceProvider): Promise<ActionResult> {
  if (!workspaceProviders.includes(provider)) return actionFailure("validation_error", "El proveedor no es válido.");
  const access = await getWorkspaceAccess();
  if (access.status !== "active") return actionFailure("authentication_required", "Inicia sesión para continuar.");
  const supabase = await createClient();
  const { error } = await supabase.rpc("disconnect_workspace_connection", { expected_organization_id: access.organizationId, expected_profile_id: access.userId, target_provider: provider });
  if (error) return actionFailure("unexpected_error", "No se pudo desconectar el proveedor.");
  revalidatePath("/app/operaciones");
  return actionSuccess();
}
