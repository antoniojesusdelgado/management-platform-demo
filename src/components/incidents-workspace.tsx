"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IconAlertTriangle, IconArrowRight, IconPlus, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  canTransitionIncident,
  incidentCategories,
  incidentInputSchema,
  incidentPriorities,
  incidentStatuses,
  isIncidentOverdue,
  type Incident,
  type IncidentCategory,
  type IncidentEvent,
  type IncidentInput,
  type IncidentPriority,
  type IncidentStatus,
} from "@/domain/incidents";

type Props = {
  incidents: Incident[];
  events: IncidentEvent[];
  assigneeOptions?: string[];
  pending?: boolean;
  loadError?: string;
  onCreate: (input: IncidentInput) => boolean | Promise<boolean>;
  onUpdate: (id: string, input: IncidentInput) => boolean | Promise<boolean>;
  onTransition: (id: string, status: IncidentStatus, note: string) => boolean | Promise<boolean>;
};

const statusLabels: Record<IncidentStatus, string> = {
  registered: "Registrada", triaged: "Priorizada", assigned: "Asignada",
  investigating: "En investigación", resolved: "Resuelta", closed: "Cerrada",
};
const priorityLabels: Record<IncidentPriority, string> = {
  low: "Baja", medium: "Media", high: "Alta", critical: "Crítica",
};
const categoryLabels: Record<IncidentCategory, string> = {
  access: "Acceso", data: "Datos", hardware: "Hardware", software: "Software", other: "Otra",
};
const defaultAssignees = ["Elena Martín", "Diego Santos", "Marta Soler"];
const emptyInput = (): IncidentInput => ({
  title: "", description: "", priority: "medium", category: "software", assigneeName: null,
});

export function IncidentsWorkspace({
  incidents, events, assigneeOptions = defaultAssignees, pending = false, loadError,
  onCreate, onUpdate, onTransition,
}: Props) {
  const [status, setStatus] = useState<"all" | IncidentStatus>("all");
  const [priority, setPriority] = useState<"all" | IncidentPriority>("all");
  const [category, setCategory] = useState<"all" | IncidentCategory>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<IncidentInput>(emptyInput());
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const selected = incidents.find((item) => item.id === selectedId) ?? null;
  const filtered = useMemo(() => incidents.filter((item) =>
    (status === "all" || item.status === status) &&
    (priority === "all" || item.priority === priority) &&
    (category === "all" || item.category === category)), [category, incidents, priority, status]);
  const overdue = incidents.filter((item) => isIncidentOverdue(item)).length;

  function openCreate() { setEditingId(null); setInput(emptyInput()); setError(""); setFormOpen(true); }
  function openEdit(item: Incident) {
    setEditingId(item.id);
    setInput({ title: item.title, description: item.description, priority: item.priority, category: item.category, assigneeName: item.assigneeName });
    setSelectedId(null); setError(""); setFormOpen(true);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = incidentInputSchema.safeParse(input);
    if (!parsed.success) { setError("Revisa el título, la descripción y la clasificación."); return; }
    const ok = editingId ? await onUpdate(editingId, parsed.data) : await onCreate(parsed.data);
    if (ok) setFormOpen(false);
  }
  async function changeStatus(next: IncidentStatus) {
    if (!selected || note.trim().length < 3) return;
    if (await onTransition(selected.id, next, note.trim())) setNote("");
  }

  return <main className="workspace" id="main-content">
    <div className="page-heading"><div><p className="eyebrow">Soporte · seguimiento</p><h1>Incidencias</h1><p className="lede">Registro, priorización y resolución trazable con SLA y datos exclusivamente sintéticos.</p></div><button className="button button-primary" type="button" onClick={openCreate}><IconPlus size={19} aria-hidden="true" />Nueva incidencia</button></div>
    {loadError ? <div className="inline-alert" role="alert"><strong>No se pudieron cargar las incidencias.</strong><span>{loadError}</span></div> : null}
    <section className="cards-grid" aria-label="Resumen de incidencias"><article className="card"><span className="muted">Abiertas</span><strong className="metric-value">{incidents.filter((item) => !["resolved", "closed"].includes(item.status)).length}</strong></article><article className="card"><span className="muted">SLA sintético vencido</span><strong className="metric-value">{overdue}</strong></article><article className="card"><span className="muted">Críticas</span><strong className="metric-value">{incidents.filter((item) => item.priority === "critical").length}</strong></article></section>
    <section className="section-block"><div className="task-filters">
      <label>Estado<select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">Todos</option>{incidentStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label>
      <label>Prioridad<select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}><option value="all">Todas</option>{incidentPriorities.map((value) => <option key={value} value={value}>{priorityLabels[value]}</option>)}</select></label>
      <label>Categoría<select value={category} onChange={(e) => setCategory(e.target.value as typeof category)}><option value="all">Todas</option>{incidentCategories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label>
    </div><div className="task-list">{filtered.length ? filtered.map((item) => <button className="task-row" type="button" key={item.id} onClick={() => setSelectedId(item.id)}><span className={`task-priority priority-${item.priority === "critical" ? "urgent" : item.priority}`} /><span className="task-row-main"><strong>{item.title}</strong><span className="muted">{categoryLabels[item.category]} · {item.assigneeName ?? "Sin asignar"} · SLA sintético {new Date(item.slaDueAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}</span></span><span className={`status task-status-${item.status}`}>{statusLabels[item.status]}</span><IconArrowRight size={18} aria-hidden="true" /></button>) : <div className="empty-state"><p>No hay incidencias para estos filtros.</p></div>}</div></section>

    <Dialog.Root open={formOpen} onOpenChange={setFormOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content"><div className="dialog-header"><div><Dialog.Title>{editingId ? "Editar incidencia" : "Nueva incidencia"}</Dialog.Title><Dialog.Description className="muted">Los datos de esta demostración son sintéticos.</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div><form onSubmit={submit}><div className="field-grid"><label className="field field-span">Título<input value={input.title} onChange={(e) => setInput({ ...input, title: e.target.value })} /></label><label className="field field-span">Descripción<textarea value={input.description} onChange={(e) => setInput({ ...input, description: e.target.value })} /></label><label className="field">Prioridad<select value={input.priority} onChange={(e) => setInput({ ...input, priority: e.target.value as IncidentPriority })}>{incidentPriorities.map((value) => <option key={value} value={value}>{priorityLabels[value]}</option>)}</select></label><label className="field">Categoría<select value={input.category} onChange={(e) => setInput({ ...input, category: e.target.value as IncidentCategory })}>{incidentCategories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label><label className="field field-span">Responsable<select value={input.assigneeName ?? ""} onChange={(e) => setInput({ ...input, assigneeName: e.target.value || null })}><option value="">Sin asignar</option>{assigneeOptions.map((name) => <option key={name}>{name}</option>)}</select></label></div>{error ? <p className="field-error" role="alert">{error}</p> : null}<div className="dialog-actions"><Dialog.Close className="button button-secondary">Cancelar</Dialog.Close><button className="button button-primary" disabled={pending}>Guardar</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>

      <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" />{selected ? <Dialog.Content className="dialog-content task-detail-dialog"><div className="dialog-header"><div><p className="eyebrow">{priorityLabels[selected.priority]} · {categoryLabels[selected.category]}</p><Dialog.Title>{selected.title}</Dialog.Title><Dialog.Description className="muted">{selected.description}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div><div className="task-detail-grid"><section><h3>Gestión</h3><p className="muted">Responsable: {selected.assigneeName ?? "Sin asignar"}</p><p className="muted">SLA sintético: {new Date(selected.slaDueAt).toLocaleString("es-ES")}</p>{selected.resolution ? <p><strong>Resolución:</strong> {selected.resolution}</p> : null}<button className="button button-secondary" type="button" onClick={() => openEdit(selected)}>Editar clasificación</button></section><section><h3><IconAlertTriangle size={18} />Flujo</h3><label className="field">Nota de decisión<textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>{selected.status === "triaged" && !selected.assigneeName ? <p className="field-error">Asigna una persona responsable antes de avanzar.</p> : null}<div className="task-actions">{incidentStatuses.filter((next) => canTransitionIncident(selected.status, next) && (next !== "assigned" || Boolean(selected.assigneeName))).map((next) => <button className="button button-primary" type="button" disabled={pending || note.trim().length < 3} key={next} onClick={() => changeStatus(next)}>{statusLabels[next]}</button>)}</div></section></div><section><h3>Actividad</h3><ul className="request-timeline">{events.filter((event) => event.incidentId === selected.id).map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.note}</strong><p className="muted">{event.actorName} · {new Date(event.createdAt).toLocaleString("es-ES")}</p></div></li>)}</ul></section></Dialog.Content> : null}</Dialog.Portal></Dialog.Root>
  </main>;
}
