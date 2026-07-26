"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  IconArrowRight,
  IconCash,
  IconPlus,
  IconTrendingDown,
  IconTrendingUp,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  canTransitionTreasury,
  treasuryCurrencies,
  treasuryInputSchema,
  treasuryStatuses,
  type TreasuryCurrency,
  type TreasuryEntry,
  type TreasuryEvent,
  type TreasuryInput,
  type TreasuryStatus,
} from "@/domain/treasury";

type Props = {
  entries: TreasuryEntry[];
  events: TreasuryEvent[];
  pending?: boolean;
  loadError?: string;
  canManage?: boolean;
  onCreate: (input: TreasuryInput) => boolean | Promise<boolean>;
  onUpdate: (id: string, input: TreasuryInput) => boolean | Promise<boolean>;
  onTransition: (id: string, status: TreasuryStatus, note: string) => boolean | Promise<boolean>;
};

type FormState = {
  entryDate: string;
  concept: string;
  amount: string;
  currency: TreasuryCurrency;
};

const statusLabels: Record<TreasuryStatus, string> = {
  draft: "Borrador",
  registered: "Registrado",
  reconciled: "Conciliado",
  validated: "Validado",
  closed: "Cerrado",
};

const initialForm = (): FormState => ({
  entryDate: "",
  concept: "",
  amount: "",
  currency: "EUR",
});

function formatAmount(amountCents: number, currency: TreasuryCurrency) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
}

function toInput(entry: TreasuryEntry): FormState {
  return {
    entryDate: entry.entryDate,
    concept: entry.concept,
    amount: (entry.amountCents / 100).toFixed(2),
    currency: entry.currency,
  };
}

export function TreasuryWorkspace({
  entries,
  events,
  pending = false,
  loadError,
  canManage = true,
  onCreate,
  onUpdate,
  onTransition,
}: Props) {
  const [status, setStatus] = useState<"all" | TreasuryStatus>("all");
  const [currency, setCurrency] = useState<"all" | TreasuryCurrency>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm());
  const [formError, setFormError] = useState("");
  const [note, setNote] = useState("");

  const selected = entries.find((entry) => entry.id === selectedId) ?? null;
  const visibleEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    return entries.filter((entry) => (
      (status === "all" || entry.status === status) &&
      (currency === "all" || entry.currency === currency) &&
      (!normalizedQuery || entry.concept.toLocaleLowerCase("es").includes(normalizedQuery))
    ));
  }, [currency, entries, query, status]);

  const eurBalance = entries
    .filter((entry) => entry.currency === "EUR")
    .reduce((total, entry) => total + entry.amountCents, 0);

  function openCreate() {
    setEditingId(null);
    setForm(initialForm());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(entry: TreasuryEntry) {
    setEditingId(entry.id);
    setForm(toInput(entry));
    setFormError("");
    setSelectedId(null);
    setFormOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsedAmount = Number(form.amount.replace(",", "."));
    const payload = treasuryInputSchema.safeParse({
      entryDate: form.entryDate,
      concept: form.concept,
      amountCents: Number.isFinite(parsedAmount) ? Math.round(parsedAmount * 100) : Number.NaN,
      currency: form.currency,
    });
    if (!payload.success) {
      setFormError("Revisa la fecha, el concepto y un importe distinto de cero.");
      return;
    }
    const saved = editingId
      ? await onUpdate(editingId, payload.data)
      : await onCreate(payload.data);
    if (saved) setFormOpen(false);
    else setFormError("No se pudo guardar el movimiento. Vuelve a intentarlo.");
  }

  async function transition(nextStatus: TreasuryStatus) {
    if (!selected || note.trim().length < 3) return;
    if (await onTransition(selected.id, nextStatus, note.trim())) setNote("");
  }

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Finanzas · demostración acotada</p>
          <h1>Tesorería</h1>
          <p className="lede">Movimientos agregados, sintéticos y trazables. No contiene cuentas, justificantes ni contrapartes reales.</p>
        </div>
        {canManage ? <button className="button button-primary" type="button" onClick={openCreate}><IconPlus size={19} />Nuevo movimiento</button> : null}
      </div>

      <div className="inline-alert treasury-safety" role="note">
        <IconCash size={20} aria-hidden="true" />
        <span><strong>Datos exclusivamente demostrativos.</strong> Los importes representan agregados ficticios y no expedientes financieros individuales.</span>
      </div>
      {loadError ? <div className="inline-alert" role="alert"><strong>No se pudo cargar Tesorería.</strong><span>{loadError}</span></div> : null}

      <section className="cards-grid" aria-label="Resumen sintético de Tesorería">
        <article className="card"><span className="muted">Balance agregado EUR</span><strong className="metric-value">{formatAmount(eurBalance, "EUR")}</strong></article>
        <article className="card"><span className="muted">Pendientes de validar</span><strong className="metric-value">{entries.filter((entry) => ["registered", "reconciled"].includes(entry.status)).length}</strong></article>
        <article className="card"><span className="muted">Movimientos cerrados</span><strong className="metric-value">{entries.filter((entry) => entry.status === "closed").length}</strong></article>
      </section>

      <section className="section-block">
        <div className="toolbar treasury-toolbar">
          <label className="field compact-filter">Buscar<input type="search" placeholder="Concepto sintético" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          <label className="field compact-filter">Estado<select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}><option value="all">Todos</option>{treasuryStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
          <label className="field compact-filter">Moneda<select value={currency} onChange={(event) => setCurrency(event.target.value as typeof currency)}><option value="all">Todas</option>{treasuryCurrencies.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        {visibleEntries.length ? <div className="treasury-list">{visibleEntries.map((entry) => (
          <button className="card treasury-row" type="button" key={entry.id} onClick={() => setSelectedId(entry.id)}>
            <span className={`treasury-direction ${entry.amountCents >= 0 ? "positive" : "negative"}`} aria-hidden="true">{entry.amountCents >= 0 ? <IconTrendingUp size={20} /> : <IconTrendingDown size={20} />}</span>
            <span className="treasury-row-copy"><strong>{entry.concept}</strong><span className="muted">{new Date(`${entry.entryDate}T12:00:00`).toLocaleDateString("es-ES")} · {statusLabels[entry.status]}</span></span>
            <strong className={entry.amountCents >= 0 ? "amount-positive" : "amount-negative"}>{formatAmount(entry.amountCents, entry.currency)}</strong>
            <IconArrowRight size={19} aria-hidden="true" />
          </button>
        ))}</div> : <div className="empty-state"><p>No hay movimientos que coincidan con los filtros.</p></div>}
      </section>

      <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
        <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content">
          <div className="dialog-header"><div><Dialog.Title>{editingId ? "Editar borrador" : "Nuevo movimiento sintético"}</Dialog.Title><Dialog.Description className="muted">Registra solo conceptos e importes agregados de demostración.</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div>
          <form onSubmit={submit}><div className="field-grid">
            <label className="field">Fecha<input type="date" value={form.entryDate} onChange={(event) => setForm({ ...form, entryDate: event.target.value })} /></label>
            <label className="field">Moneda<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as TreasuryCurrency })}>{treasuryCurrencies.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field field-span">Concepto agregado<input value={form.concept} onChange={(event) => setForm({ ...form, concept: event.target.value })} placeholder="Operaciones agregadas · demo" /></label>
            <label className="field field-span">Importe sintético<input type="number" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} aria-describedby="treasury-amount-help" /><span className="muted" id="treasury-amount-help">Usa valores negativos para salidas y positivos para entradas.</span></label>
          </div>{formError ? <p className="field-error" role="alert">{formError}</p> : null}<div className="dialog-actions"><Dialog.Close className="button button-secondary">Cancelar</Dialog.Close><button className="button button-primary" disabled={pending}>{editingId ? "Guardar cambios" : "Guardar borrador"}</button></div></form>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <Dialog.Portal><Dialog.Overlay className="dialog-overlay" />{selected ? <Dialog.Content className="dialog-content task-detail-dialog">
          <div className="dialog-header"><div><p className="eyebrow">{statusLabels[selected.status]} · {selected.currency}</p><Dialog.Title>{selected.concept}</Dialog.Title><Dialog.Description className="muted">{formatAmount(selected.amountCents, selected.currency)} · {new Date(`${selected.entryDate}T12:00:00`).toLocaleDateString("es-ES")}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar detalle"><IconX size={19} /></Dialog.Close></div>
          {canManage && selected.status === "draft" ? <button className="button button-secondary" type="button" onClick={() => openEdit(selected)}>Editar borrador</button> : null}
          {canManage && selected.status !== "closed" ? <section className="section-block"><h3>Siguiente control</h3><label className="field transition-note-field">Nota de decisión<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe la comprobación sintética realizada." /></label><div className="task-actions">{treasuryStatuses.filter((item) => canTransitionTreasury(selected.status, item)).map((item) => <button className="button button-primary" type="button" disabled={pending || note.trim().length < 3} onClick={() => transition(item)} key={item}>Marcar como {statusLabels[item].toLocaleLowerCase("es")}</button>)}</div></section> : null}
          <section className="section-block"><h3>Trazabilidad</h3><ul className="request-timeline">{events.filter((event) => event.entryId === selected.id).map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.note}</strong><p className="muted">{event.actorName} · {new Date(event.createdAt).toLocaleString("es-ES")}</p></div></li>)}</ul></section>
        </Dialog.Content> : null}</Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
