"use client";

import {
  IconAlertTriangle,
  IconAutomation,
  IconBell,
  IconBrandGoogleDrive,
  IconBrandOffice,
  IconCalendarEvent,
  IconCheck,
  IconFileExport,
  IconMail,
  IconPlayerPlay,
  IconPlugConnected,
  IconTemplate,
  IconUsersGroup,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Person } from "@/domain/people";
import type { Project } from "@/domain/projects";
import {
  automationActions,
  automationConditionFields,
  automationConditionOperators,
  automationTriggers,
  buildMailComposerUrl,
  capacityStatus,
  exportTargets,
  recurrenceFrequencies,
  type AutomationAction,
  type AutomationRule,
  type AutomationTrigger,
  type CapacityAllocation,
  type ExportTarget,
  type NotificationStatus,
  type OperationsState,
  type WorkspaceProvider,
} from "@/domain/operations";

type Result = boolean | Promise<boolean>;
type OperationsWorkspaceProps = OperationsState & {
  mode: "guest" | "authenticated";
  people: Person[];
  projects: Project[];
  pending?: boolean;
  loadError?: string;
  canManage?: boolean;
  onCreateRule: (input: Pick<AutomationRule, "name" | "trigger" | "action" | "condition">) => Result;
  onToggleRule: (id: string, enabled: boolean) => Result;
  onRunRule: (id: string) => Result;
  onApplyTemplate: (id: string) => Result;
  onAddAllocation: (input: Omit<CapacityAllocation, "id" | "personName" | "projectName">) => Result;
  onMarkNotification: (id: string, status: NotificationStatus) => Result;
  onCreateExport: (input: { name: string; moduleId: string; target: ExportTarget }) => Result;
  onDisconnect: (provider: WorkspaceProvider) => Result;
};

const triggerLabels: Record<AutomationTrigger, string> = {
  task_assigned: "Tarea asignada",
  task_due: "Tarea próxima a vencer",
  task_status_changed: "Estado de tarea actualizado",
  leave_submitted: "Vacaciones enviadas a revisión",
  leave_approved: "Vacaciones aprobadas",
  incident_sla_risk: "Riesgo de incumplir un SLA",
  scheduled_report: "Informe programado",
};
const actionLabels: Record<AutomationAction, string> = {
  create_task: "Crear una tarea",
  notify: "Crear una notificación",
  prepare_export: "Preparar una exportación",
  prepare_email: "Preparar un correo",
  prepare_calendar_event: "Preparar un evento",
};
const targetLabels: Record<ExportTarget, string> = {
  csv: "CSV",
  xlsx: "Excel (.xlsx)",
  google_sheets: "Google Sheets",
  microsoft_excel: "Excel en Microsoft 365",
};

export function OperationsWorkspace(props: OperationsWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"automations" | "templates" | "capacity" | "integrations" | "exports">("automations");
  const [ruleName, setRuleName] = useState("");
  const [trigger, setTrigger] = useState<AutomationTrigger>("task_due");
  const [action, setAction] = useState<AutomationAction>("notify");
  const [conditionField, setConditionField] = useState<(typeof automationConditionFields)[number]>("priority");
  const [conditionOperator, setConditionOperator] = useState<(typeof automationConditionOperators)[number]>("equals");
  const [conditionValue, setConditionValue] = useState("");
  const [personId, setPersonId] = useState(props.people[0]?.id ?? "");
  const [projectId, setProjectId] = useState(props.projects[0]?.id ?? "");
  const [hours, setHours] = useState(24);
  const [exportName, setExportName] = useState("Informe operativo");
  const [exportModule, setExportModule] = useState("analitica");
  const [exportTarget, setExportTarget] = useState<ExportTarget>("xlsx");
  const [mailProvider, setMailProvider] = useState<WorkspaceProvider>("google_workspace");
  const [mailSubject, setMailSubject] = useState("Seguimiento operativo");
  const [mailBody, setMailBody] = useState("Te comparto el resumen preparado desde la plataforma de gestión.");
  const [calendarProvider, setCalendarProvider] = useState<WorkspaceProvider>("google_workspace");
  const [calendarTitle, setCalendarTitle] = useState("Revisión operativa");
  const [calendarStartsAt, setCalendarStartsAt] = useState("2026-08-11T10:00");
  const [calendarEndsAt, setCalendarEndsAt] = useState("2026-08-11T10:30");
  const [calendarMessage, setCalendarMessage] = useState("");
  const [executingExportId, setExecutingExportId] = useState<string | null>(null);
  const [directorySyncing, setDirectorySyncing] = useState<WorkspaceProvider | null>(null);
  const [directoryMessage, setDirectoryMessage] = useState("");
  const summary = useMemo(() => {
    const grouped = new Map<string, CapacityAllocation>();
    for (const allocation of props.capacityAllocations) {
      const key = `${allocation.personId}:${allocation.weekStart}`;
      const current = grouped.get(key);
      grouped.set(key, current ? {
        ...current,
        allocatedHours: current.allocatedHours + allocation.allocatedHours,
        availableHours: Math.min(current.availableHours, allocation.availableHours),
        projectName: `${current.projectName}, ${allocation.projectName}`,
      } : allocation);
    }
    return [...grouped.values()].map((allocation) => ({ allocation, ...capacityStatus(allocation) }));
  }, [props.capacityAllocations]);
  const unread = props.operationalNotifications.filter((notification) => notification.status === "unread");

  async function executeExternalExport(id: string) {
    setExecutingExportId(id);
    try {
      const response = await fetch(`/api/exports/${id}/execute`, { method: "POST" });
      const result = await response.json() as { externalUrl?: string };
      if (response.ok && result.externalUrl) window.open(result.externalUrl, "_blank", "noopener,noreferrer");
      router.refresh();
    } finally {
      setExecutingExportId(null);
    }
  }

  async function confirmCalendarEvent() {
    if (props.mode === "guest") {
      setCalendarMessage("Evento simulado preparado. No se ha contactado con ningún proveedor.");
      return;
    }
    setCalendarMessage("Creando evento…");
    const response = await fetch("/api/calendar/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider: calendarProvider,
        title: calendarTitle,
        description: "Evento confirmado desde la plataforma de gestión.",
        startsAt: new Date(calendarStartsAt).toISOString(),
        endsAt: new Date(calendarEndsAt).toISOString(),
      }),
    });
    const result = await response.json() as { externalUrl?: string; error?: string };
    setCalendarMessage(response.ok ? "Evento creado correctamente." : result.error ?? "No se pudo crear el evento.");
    if (response.ok && result.externalUrl) window.open(result.externalUrl, "_blank", "noopener,noreferrer");
  }

  async function syncDirectory(provider: WorkspaceProvider) {
    setDirectorySyncing(provider);
    setDirectoryMessage("Sincronizando el directorio…");
    try {
      const response = await fetch("/api/directory/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const result = await response.json() as { processed?: number; error?: string };
      setDirectoryMessage(response.ok ? `${result.processed ?? 0} perfiles revisados correctamente.` : result.error ?? "No se pudo sincronizar el directorio.");
      if (response.ok) router.refresh();
    } finally {
      setDirectorySyncing(null);
    }
  }

  return (
    <main className="workspace operations-workspace" id="main-content">
      <div className="page-heading">
        <div><p className="eyebrow">Coordinación del trabajo</p><h1>Operaciones</h1><p className="lede">Automatiza tareas repetitivas, planifica capacidad y prepara información para Google Workspace o Microsoft 365.</p></div>
        <span className="status-chip"><IconBell size={17} aria-hidden="true" />{unread.length} avisos nuevos</span>
      </div>
      {props.loadError ? <div className="inline-alert" role="status">{props.loadError}</div> : null}
      <div className="operations-summary cards-grid" aria-label="Resumen operativo">
        <article className="card"><span className="muted">Reglas activas</span><strong className="metric-value">{props.automationRules.filter((rule) => rule.enabled).length}</strong></article>
        <article className="card"><span className="muted">Personas con sobrecarga</span><strong className="metric-value">{summary.filter((item) => item.state === "over").length}</strong></article>
        <article className="card"><span className="muted">Exportaciones preparadas</span><strong className="metric-value">{props.exportJobs.filter((job) => job.status === "ready").length}</strong></article>
      </div>
      <div className="operations-tabs" role="tablist" aria-label="Áreas de operaciones">
        <Tab active={tab === "automations"} onClick={() => setTab("automations")} icon={<IconAutomation size={18} />}>Automatizaciones</Tab>
        <Tab active={tab === "templates"} onClick={() => setTab("templates")} icon={<IconTemplate size={18} />}>Plantillas</Tab>
        <Tab active={tab === "capacity"} onClick={() => setTab("capacity")} icon={<IconUsersGroup size={18} />}>Capacidad</Tab>
        <Tab active={tab === "integrations"} onClick={() => setTab("integrations")} icon={<IconPlugConnected size={18} />}>Integraciones</Tab>
        <Tab active={tab === "exports"} onClick={() => setTab("exports")} icon={<IconFileExport size={18} />}>Informes</Tab>
      </div>

      {tab === "automations" ? <section className="operations-panel" aria-labelledby="automations-title">
        <div className="section-header"><div><p className="eyebrow">Reglas controladas</p><h2 id="automations-title">Automatizaciones</h2></div></div>
        <div className="operations-grid">
          <div className="operations-list">{props.automationRules.map((rule) => <article className="card operation-item" key={rule.id}><div><strong>{rule.name}</strong><p className="muted">{triggerLabels[rule.trigger]} → {actionLabels[rule.action]}</p></div><div className="operation-actions"><label className="switch-label"><input type="checkbox" checked={rule.enabled} disabled={!props.canManage || props.pending} onChange={(event) => void props.onToggleRule(rule.id, event.target.checked)} /><span>{rule.enabled ? "Activa" : "Pausada"}</span></label><button className="button button-secondary" type="button" disabled={!props.canManage || props.pending || !rule.enabled} onClick={() => void props.onRunRule(rule.id)}><IconPlayerPlay size={17} />Ejecutar</button></div></article>)}</div>
          <form className="card operations-form" onSubmit={(event) => { event.preventDefault(); if (ruleName.trim().length < 3) return; void Promise.resolve(props.onCreateRule({ name: ruleName.trim(), trigger, action, condition: conditionValue.trim() ? { field: conditionField, operator: conditionOperator, value: conditionValue.trim() } : null })).then((ok) => { if (ok) { setRuleName(""); setConditionValue(""); } }); }}>
            <h3>Nueva regla</h3>
            <label>Nombre<input value={ruleName} maxLength={100} onChange={(event) => setRuleName(event.target.value)} /></label>
            <label>Cuando ocurra<select value={trigger} onChange={(event) => setTrigger(event.target.value as AutomationTrigger)}>{automationTriggers.map((value) => <option value={value} key={value}>{triggerLabels[value]}</option>)}</select></label>
            <label>Preparar acción<select value={action} onChange={(event) => setAction(event.target.value as AutomationAction)}>{automationActions.map((value) => <option value={value} key={value}>{actionLabels[value]}</option>)}</select></label>
            <label>Campo de condición<select value={conditionField} onChange={(event) => setConditionField(event.target.value as (typeof automationConditionFields)[number])}>{automationConditionFields.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Operador<select value={conditionOperator} onChange={(event) => setConditionOperator(event.target.value as (typeof automationConditionOperators)[number])}>{automationConditionOperators.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Valor validado (opcional)<input value={conditionValue} maxLength={80} onChange={(event) => setConditionValue(event.target.value)} /></label>
            <p className="form-hint">Las condiciones usan campos cerrados. Las acciones externas siempre quedan pendientes de confirmación.</p>
            <button className="button button-primary" type="submit" disabled={!props.canManage || props.pending || ruleName.trim().length < 3}>Crear regla</button>
          </form>
        </div>
        <div className="card notification-list"><h3>Centro operativo</h3>{props.operationalNotifications.map((notification) => <article key={notification.id} className={`notification-item priority-${notification.priority}`}><div><strong>{notification.title}</strong><p className="muted">{notification.description}</p></div><div className="operation-actions"><span className="status-chip">{notification.status === "unread" ? "Nueva" : notification.status === "read" ? "Leída" : "Descartada"}</span>{notification.status === "unread" ? <button className="button button-quiet" type="button" onClick={() => void props.onMarkNotification(notification.id, "read")}><IconCheck size={17} />Marcar leída</button> : null}</div></article>)}</div>
      </section> : null}

      {tab === "templates" ? <section className="operations-panel" aria-labelledby="templates-title"><div className="section-header"><div><p className="eyebrow">Trabajo repetible</p><h2 id="templates-title">Plantillas y recurrencias</h2></div></div><div className="cards-grid">{props.projectTemplates.map((template) => <article className="card" key={template.id}><IconTemplate size={26} aria-hidden="true" /><h3>{template.name}</h3><p>{template.description}</p><p className="muted">{template.taskCount} tareas · {template.durationDays} días</p><button className="button button-primary" type="button" disabled={!props.canManage || props.pending} onClick={() => void props.onApplyTemplate(template.id)}>Crear proyecto desde plantilla</button></article>)}</div><div className="card"><h3>Trabajo recurrente</h3><div className="table-scroll"><table><thead><tr><th>Nombre</th><th>Frecuencia</th><th>Próxima ejecución</th><th>Estado</th></tr></thead><tbody>{props.recurrenceRules.map((rule) => <tr key={rule.id}><td>{rule.name}</td><td>{recurrenceFrequencies.includes(rule.frequency) ? rule.frequency : "—"}</td><td>{rule.nextRunDate}</td><td><span className="status-chip">{rule.enabled ? "Activa" : "Pausada"}</span></td></tr>)}</tbody></table></div></div></section> : null}

      {tab === "capacity" ? <section className="operations-panel" aria-labelledby="capacity-title"><div className="section-header"><div><p className="eyebrow">Planificación semanal</p><h2 id="capacity-title">Capacidad del equipo</h2></div></div><div className="capacity-grid">{summary.map(({ allocation, utilization, remaining, state }) => <article className={`card capacity-card capacity-${state}`} key={allocation.id}><div><strong>{allocation.personName}</strong><p className="muted">{allocation.projectName}</p></div><strong className="capacity-percentage">{utilization}%</strong><div className="capacity-track" aria-label={`${utilization}% de capacidad asignada`}><span style={{ width: `${Math.min(utilization, 100)}%` }} /></div><p>{remaining < 0 ? `${Math.abs(remaining)} h de sobrecarga` : `${remaining} h disponibles`}</p>{state === "over" ? <span className="inline-alert"><IconAlertTriangle size={17} />Revisa la distribución; no se ha bloqueado la asignación.</span> : null}</article>)}</div><form className="card capacity-form" onSubmit={(event) => { event.preventDefault(); if (!personId || !projectId) return; void props.onAddAllocation({ personId, projectId, weekStart: new Date().toISOString().slice(0, 10), allocatedHours: hours, availableHours: 40 }); }}><h3>Nueva asignación</h3><label>Persona<select value={personId} onChange={(event) => setPersonId(event.target.value)}>{props.people.filter((person) => person.status === "active").map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}</select></label><label>Proyecto<select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{props.projects.filter((project) => project.status === "active").map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><label>Horas semanales<input type="number" min={0} max={80} value={hours} onChange={(event) => setHours(Number(event.target.value))} /></label><button className="button button-primary" type="submit" disabled={!props.canManage || props.pending || !personId || !projectId}>Guardar asignación</button></form></section> : null}

      {tab === "integrations" ? <section className="operations-panel" aria-labelledby="integrations-title">
        <div className="section-header"><div><p className="eyebrow">Ecosistema de trabajo</p><h2 id="integrations-title">Google Workspace y Microsoft 365</h2></div></div>
        <div className="cards-grid">{props.workspaceConnections.map((connection) => { const google = connection.provider === "google_workspace"; return <article className="card integration-card" key={connection.provider}>{google ? <IconBrandGoogleDrive size={30} /> : <IconBrandOffice size={30} />}<h3>{google ? "Google Workspace" : "Microsoft 365"}</h3><p className="muted">{connection.accountLabel}</p><div className="capability-list">{connection.capabilities.map((capability) => <span className="status-chip" key={capability}>{capability}</span>)}</div>{props.mode === "guest" ? <p className="demo-note-compact">Conexión simulada: no se abre OAuth ni se escriben datos externos.</p> : connection.status === "connected" ? <div className="operation-actions"><button className="button button-primary" type="button" disabled={directorySyncing !== null} onClick={() => void syncDirectory(connection.provider)}>{directorySyncing === connection.provider ? "Sincronizando…" : "Sincronizar directorio"}</button><button className="button button-secondary" type="button" onClick={() => void props.onDisconnect(connection.provider)}>Desconectar</button></div> : <a className="button button-primary" href={`/api/workspace/oauth/${connection.provider}/start`}>Conectar</a>}</article>; })}</div>
        {directoryMessage ? <div className="inline-alert" role="status">{directoryMessage}</div> : null}
        <div className="operations-grid">
          <div className="card mail-composer"><IconMail size={25} /><h3>Preparar correo</h3><p className="muted">La plataforma abre el compositor elegido. No lee el buzón ni envía mensajes.</p><label>Proveedor<select value={mailProvider} onChange={(event) => setMailProvider(event.target.value as WorkspaceProvider)}><option value="google_workspace">Gmail</option><option value="microsoft_365">Outlook</option></select></label><label>Asunto<input value={mailSubject} maxLength={160} onChange={(event) => setMailSubject(event.target.value)} /></label><label>Mensaje<textarea value={mailBody} maxLength={2000} onChange={(event) => setMailBody(event.target.value)} /></label><a className="button button-primary" target="_blank" rel="noreferrer" href={buildMailComposerUrl(mailProvider, { subject: mailSubject, body: mailBody })}><IconMail size={17} />Abrir compositor</a></div>
          <form className="card mail-composer" onSubmit={(event) => { event.preventDefault(); void confirmCalendarEvent(); }}><IconCalendarEvent size={25} /><h3>Crear evento de calendario</h3><p className="muted">El evento solo se crea después de esta confirmación.</p><label>Proveedor<select value={calendarProvider} onChange={(event) => setCalendarProvider(event.target.value as WorkspaceProvider)}><option value="google_workspace">Google Calendar</option><option value="microsoft_365">Outlook Calendar</option></select></label><label>Título<input value={calendarTitle} maxLength={160} onChange={(event) => setCalendarTitle(event.target.value)} /></label><label>Inicio<input type="datetime-local" value={calendarStartsAt} onChange={(event) => setCalendarStartsAt(event.target.value)} /></label><label>Fin<input type="datetime-local" value={calendarEndsAt} onChange={(event) => setCalendarEndsAt(event.target.value)} /></label><button className="button button-primary" type="submit" disabled={calendarTitle.trim().length < 3 || calendarEndsAt <= calendarStartsAt}><IconCalendarEvent size={17} />Confirmar y crear evento</button>{calendarMessage ? <p className="form-hint" role="status">{calendarMessage}</p> : null}</form>
        </div>
      </section> : null}

      {tab === "exports" ? <section className="operations-panel" aria-labelledby="exports-title"><div className="section-header"><div><p className="eyebrow">Información reutilizable</p><h2 id="exports-title">Informes y exportaciones</h2></div></div><form className="card export-form" onSubmit={(event) => { event.preventDefault(); void props.onCreateExport({ name: exportName, moduleId: exportModule, target: exportTarget }); }}><label>Nombre<input value={exportName} maxLength={120} onChange={(event) => setExportName(event.target.value)} /></label><label>Vista autorizada<select value={exportModule} onChange={(event) => setExportModule(event.target.value)}><option value="analitica">Analítica</option><option value="proyectos">Proyectos</option><option value="tareas">Tareas</option><option value="incidencias">Incidencias</option><option value="personal">Personal</option><option value="vacaciones">Vacaciones</option></select></label><label>Destino<select value={exportTarget} onChange={(event) => setExportTarget(event.target.value as ExportTarget)}>{exportTargets.map((target) => <option value={target} key={target}>{targetLabels[target]}</option>)}</select></label><button className="button button-primary" type="submit" disabled={!props.canManage || props.pending || exportName.trim().length < 3}><IconFileExport size={17} />Preparar exportación</button></form><div className="operations-list">{props.exportJobs.map((job) => <article className="card operation-item" key={job.id}><div><strong>{job.name}</strong><p className="muted">{targetLabels[job.target]} · {job.rowCount} filas · {job.moduleId}</p></div><div className="operation-actions"><span className="status-chip">{job.status === "ready" ? "Preparada" : job.status}</span>{props.mode === "authenticated" && job.status === "ready" && (job.target === "csv" || job.target === "xlsx") ? <a className="button button-secondary" href={`/api/exports/${job.id}/download`}><IconFileExport size={17} />Descargar</a> : null}{props.mode === "authenticated" && job.status === "pending" && (job.target === "google_sheets" || job.target === "microsoft_excel") ? <button className="button button-primary" type="button" disabled={executingExportId === job.id} onClick={() => void executeExternalExport(job.id)}>{executingExportId === job.id ? "Creando…" : "Confirmar y crear"}</button> : null}{job.externalUrl ? <a className="button button-secondary" href={job.externalUrl} target="_blank" rel="noreferrer">Abrir</a> : null}</div></article>)}</div><div className="inline-alert"><IconCalendarEvent size={18} /><span>Los informes programados preparan el trabajo y notifican; una persona confirma siempre el destino externo.</span></div></section> : null}
    </main>
  );
}

function Tab({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} className={active ? "active" : ""} onClick={onClick}>{icon}{children}</button>;
}
