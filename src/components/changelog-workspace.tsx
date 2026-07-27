"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IconArrowRight, IconPlus, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  canTransitionChangelog,
  changelogInputSchema,
  changelogStatuses,
  type ChangelogEntry,
  type ChangelogEvent,
  type ChangelogInput,
  type ChangelogStatus,
} from "@/domain/changelog";
import { formatDate, formatDateTime } from "@/lib/format";

type Props = {
  entries: ChangelogEntry[];
  events: ChangelogEvent[];
  pending?: boolean;
  loadError?: string;
  canManage?: boolean;
  onCreate: (input: ChangelogInput) => boolean | Promise<boolean>;
  onUpdate: (id: string, input: ChangelogInput) => boolean | Promise<boolean>;
  onTransition: (id: string, status: ChangelogStatus, note: string) => boolean | Promise<boolean>;
};

const statusLabels: Record<ChangelogStatus, string> = { draft: "Borrador", in_review: "En revisión", published: "Publicada" };
const emptyInput = (): ChangelogInput => ({ version: "", title: "", summary: "" });

export function ChangelogWorkspace({ entries, events, pending = false, loadError, canManage = true, onCreate, onUpdate, onTransition }: Props) {
  const [filter, setFilter] = useState<"all" | ChangelogStatus>("all");
  const [administrative, setAdministrative] = useState(canManage);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<ChangelogInput>(emptyInput());
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const visible = useMemo(() => entries.filter((entry) => administrative ? filter === "all" || entry.status === filter : entry.status === "published"), [administrative, entries, filter]);

  function openCreate() { setEditingId(null); setInput(emptyInput()); setError(""); setFormOpen(true); }
  function openEdit(entry: ChangelogEntry) { setEditingId(entry.id); setInput({ version: entry.version, title: entry.title, summary: entry.summary }); setSelectedId(null); setError(""); setFormOpen(true); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = changelogInputSchema.safeParse(input);
    if (!parsed.success) { setError("Usa una versión semántica y revisa el título y el resumen."); return; }
    const ok = editingId ? await onUpdate(editingId, parsed.data) : await onCreate(parsed.data);
    if (ok) setFormOpen(false); else setError("No se pudo guardar. Comprueba que la versión no esté repetida.");
  }
  async function transition(status: ChangelogStatus) {
    if (!selected || note.trim().length < 3) return;
    if (await onTransition(selected.id, status, note.trim())) setNote("");
  }

  return <main className="workspace" id="main-content">
    <div className="page-heading"><div><p className="eyebrow">Actualizaciones</p><h1>Novedades</h1><p className="lede">Consulta las mejoras recientes y prepara nuevas publicaciones para el equipo.</p></div>{canManage ? <button className="button button-primary" type="button" onClick={openCreate}><IconPlus size={19} />Nueva entrada</button> : null}</div>
    {loadError ? <div className="inline-alert" role="alert"><strong>No se pudieron cargar las novedades.</strong><span>{loadError}</span></div> : null}
    <section className="cards-grid" aria-label="Resumen de novedades"><article className="card"><span className="muted">Publicadas</span><strong className="metric-value">{entries.filter((entry) => entry.status === "published").length}</strong></article><article className="card"><span className="muted">En revisión</span><strong className="metric-value">{entries.filter((entry) => entry.status === "in_review").length}</strong></article><article className="card"><span className="muted">Borradores</span><strong className="metric-value">{entries.filter((entry) => entry.status === "draft").length}</strong></article></section>
    <section className="section-block"><div className="toolbar">{canManage ? <div className="segmented" aria-label="Tipo de vista"><button className="segment" type="button" aria-pressed={administrative} onClick={() => setAdministrative(true)}>Bandeja administrativa</button><button className="segment" type="button" aria-pressed={!administrative} onClick={() => setAdministrative(false)}>Vista publicada</button></div> : <p className="muted">Vista de novedades publicadas</p>}{administrative && canManage ? <label className="field compact-filter">Estado<select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)}><option value="all">Todos</option>{changelogStatuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label> : null}</div>
      <div className="changelog-list">{visible.length ? visible.map((entry, index) => <button className={`card changelog-card${index === 0 ? " changelog-feature" : ""}`} type="button" key={entry.id} onClick={() => setSelectedId(entry.id)}><span className="changelog-card-copy"><span className="changelog-meta"><span className={`status task-status-${entry.status}`}>{statusLabels[entry.status]}</span><span>Actualización de producto</span><time dateTime={entry.publishedAt ?? entry.updatedAt}>{formatDate(entry.publishedAt ?? entry.updatedAt)}</time></span><strong className="changelog-version">v{entry.version}</strong><h2>{entry.title}</h2><p className="muted">{entry.summary}</p></span><span className="changelog-card-visual" aria-hidden="true"><span>{entry.version.split(".")[0]}</span></span><IconArrowRight size={20} aria-hidden="true" /></button>) : <div className="empty-state"><p>No hay novedades para esta vista.</p></div>}</div>
    </section>
    <Dialog.Root open={formOpen} onOpenChange={setFormOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content"><div className="dialog-header"><div><Dialog.Title>{editingId ? "Editar novedad" : "Nueva novedad"}</Dialog.Title><Dialog.Description className="muted">La publicación requiere una revisión separada.</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div><form onSubmit={submit}><div className="field-grid"><label className="field">Versión<input placeholder="0.5.0" value={input.version} onChange={(event) => setInput({ ...input, version: event.target.value })} /></label><label className="field field-span">Título<input value={input.title} onChange={(event) => setInput({ ...input, title: event.target.value })} /></label><label className="field field-span">Resumen<textarea value={input.summary} onChange={(event) => setInput({ ...input, summary: event.target.value })} /></label></div>{error ? <p className="field-error" role="alert">{error}</p> : null}<div className="dialog-actions"><Dialog.Close className="button button-secondary">Cancelar</Dialog.Close><button className="button button-primary" disabled={pending}>Guardar borrador</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" />{selected ? <Dialog.Content className="dialog-content task-detail-dialog"><div className="dialog-header"><div><p className="eyebrow">v{selected.version} · {statusLabels[selected.status]}</p><Dialog.Title>{selected.title}</Dialog.Title><Dialog.Description className="muted">{selected.summary}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar detalle"><IconX size={19} /></Dialog.Close></div>{canManage && selected.status !== "published" ? <button className="button button-secondary" type="button" onClick={() => openEdit(selected)}>Editar contenido</button> : null}{canManage ? <section className="section-block"><h3>Flujo editorial</h3><label className="field transition-note-field">Nota de decisión<textarea value={note} onChange={(event) => setNote(event.target.value)} /></label><div className="task-actions">{changelogStatuses.filter((status) => canTransitionChangelog(selected.status, status)).map((status) => <button className="button button-primary" type="button" disabled={pending || note.trim().length < 3} onClick={() => transition(status)} key={status}>{statusLabels[status]}</button>)}</div></section> : null}{canManage ? <section className="section-block"><h3>Historial</h3><ul className="request-timeline">{events.filter((event) => event.entryId === selected.id).map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.note}</strong><p className="muted">{event.actorName} · {formatDateTime(event.createdAt)}</p></div></li>)}</ul></section> : null}</Dialog.Content> : null}</Dialog.Portal></Dialog.Root>
  </main>;
}
