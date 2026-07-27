"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IconPlus, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { InitialsAvatar } from "@/components/initials-avatar";
import { EmptyState } from "@/components/empty-state";
import {
  getPersonAvailability,
  personInputSchema,
  personRoleCodes,
  personStatuses,
  type Person,
  type PersonEvent,
  type PersonInput,
  type PersonRoleCode,
  type PersonStatus,
} from "@/domain/people";
import type { LeaveRequest } from "@/domain/vacations";
import { formatDateTime } from "@/lib/format";

type Props = {
  people: Person[];
  events: PersonEvent[];
  leaveRequests: LeaveRequest[];
  pending?: boolean;
  loadError?: string;
  onCreate: (input: PersonInput) => boolean | Promise<boolean>;
  onUpdate: (id: string, input: PersonInput) => boolean | Promise<boolean>;
};

const statusLabels: Record<PersonStatus, string> = { invited: "Invitada", active: "Activa", suspended: "Suspendida", inactive: "Inactiva" };
const roleLabels: Record<PersonRoleCode, string> = { admin: "Administración", manager: "Responsable", collaborator: "Colaboración", viewer: "Consulta" };
const availabilityLabels = { available: "Disponible", on_leave: "Ausente", unavailable: "No disponible" };
const emptyInput = (): PersonInput => ({ displayName: "", team: "", positionTitle: "", status: "invited", roleCode: "collaborator" });

export function PeopleWorkspace({ people, events, leaveRequests, pending = false, loadError, onCreate, onUpdate }: Props) {
  const [status, setStatus] = useState<"all" | PersonStatus>("all");
  const [role, setRole] = useState<"all" | PersonRoleCode>("all");
  const [team, setTeam] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<PersonInput>(emptyInput());
  const [error, setError] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const teams = [...new Set(people.map((person) => person.team))].sort();
  const filtered = useMemo(() => people.filter((person) =>
    (status === "all" || person.status === status) &&
    (role === "all" || person.roleCode === role) &&
    (team === "all" || person.team === team)), [people, role, status, team]);
  const selected = people.find((person) => person.id === selectedId) ?? null;

  function openCreate() { setEditingId(null); setInput(emptyInput()); setError(""); setFormOpen(true); }
  function openEdit(person: Person) { setEditingId(person.id); setInput({ displayName: person.displayName, team: person.team, positionTitle: person.positionTitle, status: person.status, roleCode: person.roleCode }); setSelectedId(null); setError(""); setFormOpen(true); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = personInputSchema.safeParse(input);
    if (!parsed.success) { setError("Revisa el nombre, el equipo y el puesto."); return; }
    const ok = editingId ? await onUpdate(editingId, parsed.data) : await onCreate(parsed.data);
    if (ok) setFormOpen(false);
  }

  return <main className="workspace" id="main-content">
    <div className="page-heading"><div><p className="eyebrow">Equipo y disponibilidad</p><h1>Personal</h1><p className="lede">Consulta el directorio, los equipos, las funciones y la disponibilidad actual.</p></div><button className="button button-primary" type="button" onClick={openCreate}><IconPlus size={19} />Añadir perfil</button></div>
    {loadError ? <div className="inline-alert" role="alert"><strong>No se pudo cargar el directorio.</strong><span>{loadError}</span></div> : null}
    <section className="cards-grid" aria-label="Resumen de personal"><article className="card"><span className="muted">Perfiles activos</span><strong className="metric-value">{people.filter((person) => person.status === "active").length}</strong></article><article className="card"><span className="muted">Equipos</span><strong className="metric-value">{teams.length}</strong></article><article className="card"><span className="muted">Ausencias aprobadas hoy</span><strong className="metric-value">{people.filter((person) => getPersonAvailability(person, leaveRequests, today) === "on_leave").length}</strong></article></section>
    <section className="section-block"><div className="task-filters"><label>Estado<select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">Todos</option>{personStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label><label>Rol<select value={role} onChange={(e) => setRole(e.target.value as typeof role)}><option value="all">Todos</option>{personRoleCodes.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label><label>Equipo<select value={team} onChange={(e) => setTeam(e.target.value)}><option value="all">Todos</option>{teams.map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <div className="cards-grid people-directory-grid">{filtered.length ? filtered.map((person) => { const availability = getPersonAvailability(person, leaveRequests, today); return <button type="button" className="card people-card" key={person.id} onClick={() => setSelectedId(person.id)}><InitialsAvatar displayName={person.displayName} size="large" /><span><strong>{person.displayName}</strong><span className="muted people-card-copy">{person.positionTitle} · {person.team}</span></span><span className={`status task-status-${person.status}`}>{statusLabels[person.status]} · {availabilityLabels[availability]}</span></button>; }) : <EmptyState kind="people" title="No hay perfiles para estos filtros" description="Ajusta el equipo, el estado o el rol seleccionado." />}</div>
    </section>
    <Dialog.Root open={formOpen} onOpenChange={setFormOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content"><div className="dialog-header"><div><Dialog.Title>{editingId ? "Editar perfil" : "Añadir perfil"}</Dialog.Title><Dialog.Description className="muted">El directorio no recoge teléfono, dirección, documentos ni información retributiva.</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div><form onSubmit={submit}><div className="field-grid"><label className="field">Nombre<input value={input.displayName} onChange={(e) => setInput({ ...input, displayName: e.target.value })} /></label><label className="field">Equipo<input value={input.team} onChange={(e) => setInput({ ...input, team: e.target.value })} /></label><label className="field field-span">Puesto<input value={input.positionTitle} onChange={(e) => setInput({ ...input, positionTitle: e.target.value })} /></label><label className="field">Estado<select value={input.status} onChange={(e) => setInput({ ...input, status: e.target.value as PersonStatus })}>{personStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label><label className="field">Rol<select value={input.roleCode} onChange={(e) => setInput({ ...input, roleCode: e.target.value as PersonRoleCode })}>{personRoleCodes.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label></div>{error ? <p className="field-error" role="alert">{error}</p> : null}<div className="dialog-actions"><Dialog.Close className="button button-secondary">Cancelar</Dialog.Close><button className="button button-primary" disabled={pending}>Guardar</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" />{selected ? <Dialog.Content className="dialog-content"><div className="dialog-header"><div className="person-dialog-heading"><InitialsAvatar displayName={selected.displayName} size="large" /><div><p className="eyebrow">{roleLabels[selected.roleCode]}</p><Dialog.Title>{selected.displayName}</Dialog.Title><Dialog.Description className="muted">{selected.positionTitle} · {selected.team}</Dialog.Description></div></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div><dl className="request-facts"><div><dt>Estado</dt><dd>{statusLabels[selected.status]}</dd></div><div><dt>Disponibilidad</dt><dd>{availabilityLabels[getPersonAvailability(selected, leaveRequests, today)]}</dd></div><div><dt>Rol</dt><dd>{roleLabels[selected.roleCode]}</dd></div></dl><button type="button" className="button button-secondary" onClick={() => openEdit(selected)}>Editar perfil</button><section className="section-block"><h3>Actividad administrativa</h3><ul className="request-timeline">{events.filter((event) => event.personId === selected.id).map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.note}</strong><p className="muted">{formatDateTime(event.createdAt)}</p></div></li>)}</ul></section></Dialog.Content> : null}</Dialog.Portal></Dialog.Root>
  </main>;
}
