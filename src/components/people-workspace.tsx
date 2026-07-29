"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IconHierarchy3, IconList, IconPlus, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import { InitialsAvatar } from "@/components/initials-avatar";
import { EmptyState } from "@/components/empty-state";
import {
  employmentContractLabels,
  employmentContractTypes,
  getPersonAvailability,
  personInputSchema,
  personRoleCodes,
  personStatuses,
  type Person,
  type EmploymentContractType,
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
  referenceDate?: string;
  pending?: boolean;
  loadError?: string;
  onCreate: (input: PersonInput) => boolean | Promise<boolean>;
  onUpdate: (id: string, input: PersonInput) => boolean | Promise<boolean>;
};

const statusLabels: Record<PersonStatus, string> = { invited: "Invitada", active: "Activa", suspended: "Suspendida", inactive: "Inactiva" };
const roleLabels: Record<PersonRoleCode, string> = { admin: "Administración", manager: "Responsable", collaborator: "Colaboración", viewer: "Consulta" };
const availabilityLabels = { available: "Disponible", on_leave: "Ausente", unavailable: "No disponible" };
const emptyInput = (): PersonInput => ({
  displayName: "",
  team: "",
  positionTitle: "",
  status: "invited",
  roleCode: "collaborator",
  managerPersonId: null,
  employmentContractType: "indefinite_ordinary",
  employmentStartDate: "2025-01-01",
  employmentEndDate: null,
});

export function PeopleWorkspace({ people, events, leaveRequests, referenceDate = new Date().toISOString().slice(0, 10), pending = false, loadError, onCreate, onUpdate }: Props) {
  const [status, setStatus] = useState<"all" | PersonStatus>("all");
  const [role, setRole] = useState<"all" | PersonRoleCode>("all");
  const [team, setTeam] = useState("all");
  const [contractType, setContractType] = useState<"all" | EmploymentContractType>("all");
  const [view, setView] = useState<"directory" | "organization">("directory");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<PersonInput>(emptyInput());
  const [error, setError] = useState("");
  const today = referenceDate;
  const teams = useMemo(
    () => [...new Set(people.map((person) => person.team))].sort(),
    [people],
  );
  const filtered = useMemo(() => people.filter((person) =>
    (status === "all" || person.status === status) &&
    (role === "all" || person.roleCode === role) &&
    (team === "all" || person.team === team) &&
    (contractType === "all" || person.employmentContractType === contractType)), [contractType, people, role, status, team]);
  const selected = people.find((person) => person.id === selectedId) ?? null;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const organizationTeams = useMemo(() => teams.map((teamName) => {
    const members = people.filter((person) => person.team === teamName && person.status !== "inactive");
    const lead = members.find((person) => person.roleCode === "manager")
      ?? members.find((person) => !person.managerPersonId)
      ?? members[0];
    return { teamName, lead, members: members.filter((person) => person.id !== lead?.id) };
  }), [people, teams]);

  function openCreate() { setEditingId(null); setInput(emptyInput()); setError(""); setFormOpen(true); }
  function openEdit(person: Person) { setEditingId(person.id); setInput({ displayName: person.displayName, team: person.team, positionTitle: person.positionTitle, status: person.status, roleCode: person.roleCode, managerPersonId: person.managerPersonId ?? null, employmentContractType: person.employmentContractType, employmentStartDate: person.employmentStartDate, employmentEndDate: person.employmentEndDate }); setSelectedId(null); setError(""); setFormOpen(true); }
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
    <section className="section-block">
      <div className="segmented-control people-view-switch" aria-label="Vista de personal">
        <button type="button" className={view === "directory" ? "is-active" : ""} onClick={() => setView("directory")}><IconList size={18} />Directorio</button>
        <button type="button" className={view === "organization" ? "is-active" : ""} onClick={() => setView("organization")}><IconHierarchy3 size={18} />Organigrama</button>
      </div>
      {view === "directory" ? <><div className="task-filters"><label>Estado<select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}><option value="all">Todos</option>{personStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label><label>Rol<select value={role} onChange={(e) => setRole(e.target.value as typeof role)}><option value="all">Todos</option>{personRoleCodes.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label><label>Equipo<select value={team} onChange={(e) => setTeam(e.target.value)}><option value="all">Todos</option>{teams.map((value) => <option key={value}>{value}</option>)}</select></label><label>Contrato<select value={contractType} onChange={(e) => setContractType(e.target.value as typeof contractType)}><option value="all">Todos</option>{employmentContractTypes.map((value) => <option key={value} value={value}>{employmentContractLabels[value]}</option>)}</select></label></div>
      <div className="cards-grid people-directory-grid">{filtered.length ? filtered.map((person) => { const availability = getPersonAvailability(person, leaveRequests, today); return <button type="button" className="card people-card" key={person.id} onClick={() => setSelectedId(person.id)}><InitialsAvatar displayName={person.displayName} size="large" /><span><strong>{person.displayName}</strong><span className="muted people-card-copy">{person.positionTitle} · {person.team}</span><span className="muted people-card-copy">{employmentContractLabels[person.employmentContractType]}</span></span><span className={`status task-status-${person.status}`}>{statusLabels[person.status]} · {availabilityLabels[availability]}</span></button>; }) : <EmptyState kind="people" title="No hay perfiles para estos filtros" description="Ajusta el equipo, el estado, el rol o el contrato seleccionado." />}</div></> :
      <div className="organization-chart" aria-label="Organigrama por equipos">
        {organizationTeams.map(({ teamName, lead, members }) => <details className="organization-team" key={teamName} open>
          <summary><span><strong>{teamName}</strong><span className="muted">{members.length + (lead ? 1 : 0)} personas</span></span></summary>
          {lead ? <button type="button" className="organization-node organization-lead" onClick={() => setSelectedId(lead.id)}><InitialsAvatar displayName={lead.displayName} /><span><strong>{lead.displayName}</strong><small>{lead.positionTitle}</small><small className="muted">{employmentContractLabels[lead.employmentContractType]}</small></span><span className="status">Responsable</span></button> : null}
          <div className="organization-members">{members.map((person) => <button type="button" className="organization-node" key={person.id} onClick={() => setSelectedId(person.id)}><InitialsAvatar displayName={person.displayName} /><span><strong>{person.displayName}</strong><small>{person.positionTitle}</small><small className="muted">{employmentContractLabels[person.employmentContractType]}</small></span><small className="muted">{person.managerPersonId ? `Coordina ${peopleById.get(person.managerPersonId)?.displayName ?? "el equipo"}` : "Sin responsable asignado"}</small></button>)}</div>
        </details>)}
      </div>}
    </section>
    <Dialog.Root open={formOpen} onOpenChange={setFormOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content"><div className="dialog-header"><div><Dialog.Title>{editingId ? "Editar perfil" : "Añadir perfil"}</Dialog.Title><Dialog.Description className="muted">El directorio no recoge teléfono, dirección, documentos ni información retributiva.</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div><form onSubmit={submit}><div className="field-grid"><label className="field">Nombre<input value={input.displayName} onChange={(e) => setInput({ ...input, displayName: e.target.value })} /></label><label className="field">Equipo<select value={input.team} disabled={teams.length === 0} onChange={(e) => setInput({ ...input, team: e.target.value })}><option value="" disabled>{teams.length ? "Selecciona un equipo" : "No hay equipos disponibles"}</option>{teams.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label className="field field-span">Puesto<input value={input.positionTitle} onChange={(e) => setInput({ ...input, positionTitle: e.target.value })} /></label><label className="field">Estado<select value={input.status} onChange={(e) => setInput({ ...input, status: e.target.value as PersonStatus })}>{personStatuses.map((value) => <option key={value} value={value}>{statusLabels[value]}</option>)}</select></label><label className="field">Rol<select value={input.roleCode} onChange={(e) => setInput({ ...input, roleCode: e.target.value as PersonRoleCode })}>{personRoleCodes.map((value) => <option key={value} value={value}>{roleLabels[value]}</option>)}</select></label><label className="field field-span">Contrato<select value={input.employmentContractType} onChange={(e) => setInput({ ...input, employmentContractType: e.target.value as EmploymentContractType })}>{employmentContractTypes.map((value) => <option key={value} value={value}>{employmentContractLabels[value]}</option>)}</select></label><label className="field field-span">Responsable<select value={input.managerPersonId ?? ""} onChange={(e) => setInput({ ...input, managerPersonId: e.target.value || null })}><option value="">Sin responsable asignado</option>{people.filter((person) => person.id !== editingId).map((person) => <option key={person.id} value={person.id}>{person.displayName} · {person.team}</option>)}</select></label></div>{error ? <p className="field-error" role="alert">{error}</p> : null}<div className="dialog-actions"><Dialog.Close className="button button-secondary">Cancelar</Dialog.Close><button className="button button-primary" disabled={pending}>Guardar</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>
    <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" />{selected ? <Dialog.Content className="dialog-content"><div className="dialog-header"><div className="person-dialog-heading"><InitialsAvatar displayName={selected.displayName} size="large" /><div><p className="eyebrow">{roleLabels[selected.roleCode]}</p><Dialog.Title>{selected.displayName}</Dialog.Title><Dialog.Description className="muted">{selected.positionTitle} · {selected.team}</Dialog.Description></div></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div><dl className="request-facts"><div><dt>Estado</dt><dd>{statusLabels[selected.status]}</dd></div><div><dt>Disponibilidad</dt><dd>{availabilityLabels[getPersonAvailability(selected, leaveRequests, today)]}</dd></div><div><dt>Rol</dt><dd>{roleLabels[selected.roleCode]}</dd></div><div><dt>Contrato</dt><dd>{employmentContractLabels[selected.employmentContractType]}</dd></div></dl><button type="button" className="button button-secondary" onClick={() => openEdit(selected)}>Editar perfil</button><section className="section-block"><h3>Actividad administrativa</h3><ul className="request-timeline">{events.filter((event) => event.personId === selected.id).map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.note}</strong><p className="muted">{formatDateTime(event.createdAt)}</p></div></li>)}</ul></section></Dialog.Content> : null}</Dialog.Portal></Dialog.Root>
  </main>;
}
