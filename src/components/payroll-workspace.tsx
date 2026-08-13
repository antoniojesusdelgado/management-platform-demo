"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { IconArrowRight, IconCalculator, IconPlus, IconX } from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  canTransitionPayroll,
  payrollCurrencies,
  payrollInputSchema,
  payrollNetTotal,
  payrollStatuses,
  type PayrollCurrency,
  type PayrollEvent,
  type PayrollInput,
  type PayrollParticipant,
  type PayrollRun,
  type PayrollStatus,
} from "@/domain/payroll";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "@/lib/format";

type Props = {
  runs: PayrollRun[];
  events: PayrollEvent[];
  participants?: PayrollParticipant[];
  pending?: boolean;
  loadError?: string;
  canManage?: boolean;
  onCreate: (input: PayrollInput) => boolean | Promise<boolean>;
  onUpdate: (id: string, input: PayrollInput) => boolean | Promise<boolean>;
  onTransition: (id: string, status: PayrollStatus, note: string) => boolean | Promise<boolean>;
};

type FormState = {
  periodStart: string;
  periodEnd: string;
  peopleCount: string;
  grossTotal: string;
  deductionTotal: string;
  currency: PayrollCurrency;
  notes: string;
};

const statusLabels: Record<PayrollStatus, string> = {
  collecting: "Recopilación",
  validating: "Validación",
  calculated: "Calculado",
  reviewed: "Revisado",
  closed: "Cerrado",
};

const emptyForm = (): FormState => ({ periodStart: "", periodEnd: "", peopleCount: "", grossTotal: "", deductionTotal: "", currency: "EUR", notes: "" });
const money = formatCurrency;
const date = formatDate;

function toForm(run: PayrollRun): FormState {
  return { periodStart: run.periodStart, periodEnd: run.periodEnd, peopleCount: String(run.peopleCount), grossTotal: (run.grossTotalCents / 100).toFixed(2), deductionTotal: (run.deductionTotalCents / 100).toFixed(2), currency: run.currency, notes: run.notes };
}

export function PayrollWorkspace({ runs, events, participants = [], pending = false, loadError, canManage = true, onCreate, onUpdate, onTransition }: Props) {
  const [status, setStatus] = useState<"all" | PayrollStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [formError, setFormError] = useState("");
  const [note, setNote] = useState("");
  const [participantSearch, setParticipantSearch] = useState("");
  const [participantTeam, setParticipantTeam] = useState("all");
  const [participantPage, setParticipantPage] = useState(1);
  const selected = runs.find((run) => run.id === selectedId) ?? null;
  const selectedParticipants = useMemo(
    () =>
      participants.filter(
        (participant) =>
          participant.runId === selectedId &&
          (participantTeam === "all" || participant.team === participantTeam) &&
          `${participant.personName} ${participant.positionTitle}`
            .toLocaleLowerCase("es")
            .includes(participantSearch.trim().toLocaleLowerCase("es")),
      ),
    [participantSearch, participantTeam, participants, selectedId],
  );
  const participantTeams = [...new Set(participants.map((participant) => participant.team))].sort();
  const participantPageCount = Math.max(1, Math.ceil(selectedParticipants.length / 8));
  const visibleParticipants = selectedParticipants.slice((participantPage - 1) * 8, participantPage * 8);
  const visibleRuns = useMemo(() => runs.filter((run) => status === "all" || run.status === status), [runs, status]);
  const orderedRuns = [...runs].sort((a, b) =>
    b.periodStart.localeCompare(a.periodStart),
  );
  const latestRun = orderedRuns[0];
  const previousRun = orderedRuns[1];
  const latestVariation =
    latestRun && previousRun
      ? ((latestRun.grossTotalCents - previousRun.grossTotalCents) /
          previousRun.grossTotalCents) *
        100
      : 0;
  const latestEmployerCost =
    latestRun?.employerCostTotalCents ??
    (latestRun ? Math.round(latestRun.grossTotalCents * 1.315) : 0);
  const currentYear = latestRun?.periodStart.slice(0, 4);
  const yearToDateGross = orderedRuns
    .filter(
      (run) => run.currency === "EUR" && run.periodStart.startsWith(currentYear ?? ""),
    )
    .reduce((total, run) => total + run.grossTotalCents, 0);
  const variationAlerts = orderedRuns.slice(0, -1).filter((run, index) => {
    const prior = orderedRuns[index + 1];
    return (
      prior &&
      Math.abs(
        (run.grossTotalCents - prior.grossTotalCents) /
          prior.grossTotalCents,
      ) > 0.08
    );
  }).length;

  function openCreate() { setEditingId(null); setForm(emptyForm()); setFormError(""); setFormOpen(true); }
  function openEdit(run: PayrollRun) { setEditingId(run.id); setForm(toForm(run)); setFormError(""); setSelectedId(null); setFormOpen(true); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const gross = Number(form.grossTotal.replace(",", "."));
    const deductions = Number(form.deductionTotal.replace(",", "."));
    const parsed = payrollInputSchema.safeParse({ periodStart: form.periodStart, periodEnd: form.periodEnd, peopleCount: Number(form.peopleCount), grossTotalCents: Math.round(gross * 100), deductionTotalCents: Math.round(deductions * 100), currency: form.currency, notes: form.notes });
    if (!parsed.success) { setFormError("Revisa el periodo, las personas y los totales agregados. Las deducciones no pueden superar el bruto."); return; }
    const saved = editingId ? await onUpdate(editingId, parsed.data) : await onCreate(parsed.data);
    if (saved) setFormOpen(false); else setFormError("No se pudo guardar el ciclo. Comprueba que el periodo no esté duplicado.");
  }
  async function transition(next: PayrollStatus) {
    if (!selected || note.trim().length < 3) return;
    if (await onTransition(selected.id, next, note.trim())) setNote("");
  }

  return <main className="workspace" id="main-content">
    <div className="page-heading"><div><p className="eyebrow">Costes y controles</p><h1>Nóminas</h1><p className="lede">Consulta los ciclos, los costes totales y las comprobaciones de cada periodo.</p></div>{canManage ? <button className="button button-primary" type="button" onClick={openCreate}><IconPlus size={19} />Nuevo ciclo</button> : null}</div>
    <div className="inline-alert treasury-safety" role="note"><IconCalculator size={20} aria-hidden="true" /><span><strong>Información agregada.</strong> Esta sección no incluye salarios individuales, recibos ni identificadores personales.</span></div>
    {loadError ? <div className="inline-alert" role="alert"><strong>No se pudo cargar Nóminas.</strong><span>{loadError}</span></div> : null}
    <section className="cards-grid" aria-label="Resumen de Nóminas">
      <article className="card"><span className="muted">Bruto del último periodo</span><strong className="metric-value">{money(latestRun?.grossTotalCents ?? 0, "EUR")}</strong></article>
      <article className="card"><span className="muted">Ciclos en control</span><strong className="metric-value">{runs.filter((run) => !["collecting", "closed"].includes(run.status)).length}</strong></article>
      <article className="card"><span className="muted">Ciclos cerrados</span><strong className="metric-value">{runs.filter((run) => run.status === "closed").length}</strong></article>
      <article className="card"><span className="muted">Coste empresa del último periodo</span><strong className="metric-value">{money(latestEmployerCost, "EUR")}</strong></article>
    </section>
    <section className="section-block payroll-overview">
      <div className="section-heading"><div><p className="eyebrow">Control agregado</p><h2>Evolución y comprobaciones</h2></div></div>
      <div className="settings-summary-grid">
        <article className="settings-summary-card"><span className="muted">Variación del último periodo</span><strong className="metric-value">{latestVariation > 0 ? "+" : ""}{formatPercent(latestVariation)}</strong><span>Comparación del bruto agregado frente al periodo anterior.</span></article>
        <article className="settings-summary-card"><span className="muted">Personas incluidas</span><strong className="metric-value">{latestRun?.peopleCount ?? 0}</strong><span>Personas incluidas en el ciclo más reciente.</span></article>
        <article className="settings-summary-card"><span className="muted">Bruto acumulado del año</span><strong className="metric-value">{money(yearToDateGross, "EUR")}</strong><span>Suma de los ciclos del año del último periodo.</span></article>
        <article className="settings-summary-card"><span className="muted">Variaciones a revisar</span><strong className="metric-value">{variationAlerts}</strong><span>Periodos con cambios agregados superiores al umbral del 8 %.</span></article>
      </div>
    </section>
    <section className="section-block">
      <div className="toolbar treasury-toolbar"><label className="field compact-filter">Estado<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos</option>{payrollStatuses.map((item) => <option value={item} key={item}>{statusLabels[item]}</option>)}</select></label></div>
      {visibleRuns.length ? <div className="treasury-list">{visibleRuns.map((run) => <button className="card treasury-row" type="button" key={run.id} onClick={() => setSelectedId(run.id)}><span className="treasury-direction positive" aria-hidden="true"><IconCalculator size={20} /></span><span className="treasury-row-copy"><strong>{date(run.periodStart)} — {date(run.periodEnd)}</strong><span className="muted">{run.peopleCount} personas · {statusLabels[run.status]}</span></span><strong>{money(run.netTotalCents, run.currency)} neto</strong><IconArrowRight size={19} aria-hidden="true" /></button>)}</div> : <div className="empty-state"><p>No hay ciclos que coincidan con el filtro.</p></div>}
    </section>

    <Dialog.Root open={formOpen} onOpenChange={setFormOpen}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content"><div className="dialog-header"><div><Dialog.Title>{editingId ? "Editar recopilación" : "Nuevo ciclo"}</Dialog.Title><Dialog.Description className="muted">Introduce los totales agregados del periodo.</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div><form onSubmit={submit}><div className="field-grid">
      <label className="field">Inicio<input type="date" value={form.periodStart} onChange={(event) => setForm({ ...form, periodStart: event.target.value })} /></label><label className="field">Fin<input type="date" value={form.periodEnd} onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} /></label>
      <label className="field">Personas incluidas<input type="number" min="1" value={form.peopleCount} onChange={(event) => setForm({ ...form, peopleCount: event.target.value })} /></label><label className="field">Moneda<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as PayrollCurrency })}>{payrollCurrencies.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="field">Bruto agregado<input type="number" min="0.01" step="0.01" value={form.grossTotal} onChange={(event) => setForm({ ...form, grossTotal: event.target.value })} /></label><label className="field">Deducciones agregadas<input type="number" min="0" step="0.01" value={form.deductionTotal} onChange={(event) => setForm({ ...form, deductionTotal: event.target.value })} /></label>
      <label className="field field-span">Notas<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Contexto opcional del periodo" /></label>
    </div>{formError ? <p className="field-error" role="alert">{formError}</p> : null}<div className="dialog-actions"><Dialog.Close className="button button-secondary">Cancelar</Dialog.Close><button className="button button-primary" disabled={pending}>{editingId ? "Guardar cambios" : "Guardar ciclo"}</button></div></form></Dialog.Content></Dialog.Portal></Dialog.Root>

    <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}><Dialog.Portal><Dialog.Overlay className="dialog-overlay" />{selected ? <Dialog.Content className="dialog-content task-detail-dialog"><div className="dialog-header"><div><p className="eyebrow">{statusLabels[selected.status]} · {selected.currency}</p><Dialog.Title>{date(selected.periodStart)} — {date(selected.periodEnd)}</Dialog.Title><Dialog.Description className="muted">{selected.peopleCount} personas · Neto agregado {money(selected.netTotalCents, selected.currency)}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar detalle"><IconX size={19} /></Dialog.Close></div>
      <section className="cards-grid payroll-detail-metrics" aria-label="Totales del ciclo"><article className="card payroll-detail-metric"><span className="muted">Bruto</span><strong>{money(selected.grossTotalCents, selected.currency)}</strong></article><article className="card payroll-detail-metric"><span className="muted">Deducciones</span><strong>{money(selected.deductionTotalCents, selected.currency)}</strong></article><article className="card payroll-detail-metric"><span className="muted">Neto</span><strong>{money(payrollNetTotal(selected), selected.currency)}</strong></article><article className="card payroll-detail-metric"><span className="muted">Coste empresa</span><strong>{money(selected.employerCostTotalCents ?? Math.round(selected.grossTotalCents * 1.315), selected.currency)}</strong></article></section>
      <div className="metadata-strip"><span>Control de totales <strong>{selected.netTotalCents === selected.grossTotalCents - selected.deductionTotalCents ? "Correcto" : "Revisar"}</strong></span><span>Variación de personas <strong>Dentro de umbral</strong></span></div>
      {selected.notes ? <p>{selected.notes}</p> : null}{canManage && selected.status === "collecting" ? <button className="button button-secondary" type="button" onClick={() => openEdit(selected)}>Editar recopilación</button> : null}
      <section className="section-block payroll-participants">
        <div className="section-heading">
          <div><h3>Personas incluidas</h3><p className="muted">Estado de inclusión y validación, sin importes individuales.</p></div>
          <span className="status-chip">{selectedParticipants.length} personas</span>
        </div>
        <div className="payroll-participant-filters">
          <label className="field">Buscar<input value={participantSearch} onChange={(event) => { setParticipantSearch(event.target.value); setParticipantPage(1); }} placeholder="Nombre o puesto" /></label>
          <label className="field">Equipo<select value={participantTeam} onChange={(event) => { setParticipantTeam(event.target.value); setParticipantPage(1); }}><option value="all">Todos los equipos</option>{participantTeams.map((team) => <option key={team}>{team}</option>)}</select></label>
        </div>
        <div className="payroll-participant-list">
          {visibleParticipants.map((participant) => <article key={participant.id}><span><strong>{participant.personName}</strong><small>{participant.positionTitle} · {participant.team}</small></span><span className="status">{participant.inclusionStatus === "included" ? "Incluida" : "Excluida"}</span><span className="status">{participant.validationStatus === "validated" ? "Validada" : participant.validationStatus === "pending" ? "Pendiente" : "Revisar"}</span></article>)}
        </div>
        {participantPageCount > 1 ? <div className="pagination"><button className="button button-secondary" type="button" disabled={participantPage === 1} onClick={() => setParticipantPage((page) => page - 1)}>Anterior</button><span>Página {participantPage} de {participantPageCount}</span><button className="button button-secondary" type="button" disabled={participantPage === participantPageCount} onClick={() => setParticipantPage((page) => page + 1)}>Siguiente</button></div> : null}
      </section>
      {canManage && selected.status !== "closed" ? <section className="section-block"><h3>Siguiente control</h3><label className="field transition-note-field">Nota de decisión<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe la comprobación agregada realizada." /></label><div className="task-actions">{payrollStatuses.filter((item) => canTransitionPayroll(selected.status, item)).map((item) => <button className="button button-primary" type="button" disabled={pending || note.trim().length < 3} onClick={() => transition(item)} key={item}>Marcar como {statusLabels[item].toLocaleLowerCase("es")}</button>)}</div></section> : null}
      <section className="section-block"><h3>Historial</h3><ul className="request-timeline">{events.filter((event) => event.runId === selected.id).map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.note}</strong><p className="muted">{event.actorName} · {formatDateTime(event.createdAt)}</p></div></li>)}</ul></section>
    </Dialog.Content> : null}</Dialog.Portal></Dialog.Root>
  </main>;
}
