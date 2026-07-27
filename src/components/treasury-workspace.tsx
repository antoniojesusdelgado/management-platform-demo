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
import { EmptyState } from "@/components/empty-state";
import { formatCurrency, formatDate, formatDateTime, formatPercent } from "@/lib/format";

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
  const sourceLabel = (source: TreasuryEntry["source"]) => {
    if (source === "Financial Source A") return "Fuente financiera A";
    if (source === "Financial Source B") return "Fuente financiera B";
    return source ?? "Manual";
  };
  const [status, setStatus] = useState<"all" | TreasuryStatus>("all");
  const [currency, setCurrency] = useState<"all" | TreasuryCurrency>("all");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
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
      (category === "all" || entry.category === category) &&
      (!normalizedQuery || entry.concept.toLocaleLowerCase("es").includes(normalizedQuery))
    ));
  }, [category, currency, entries, query, status]);
  const pageSize = 40;
  const totalPages = Math.max(1, Math.ceil(visibleEntries.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedEntries = visibleEntries.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const categories = [...new Set(entries.map((entry) => entry.category).filter(Boolean))] as string[];

  const eurBalance = entries
    .filter((entry) => entry.currency === "EUR")
    .reduce((total, entry) => total + entry.amountCents, 0);
  const eurIncome = entries
    .filter((entry) => entry.currency === "EUR" && entry.amountCents > 0)
    .reduce((total, entry) => total + entry.amountCents, 0);
  const eurExpenses = Math.abs(
    entries
      .filter((entry) => entry.currency === "EUR" && entry.amountCents < 0)
      .reduce((total, entry) => total + entry.amountCents, 0),
  );
  const operatingMargin = eurIncome
    ? Math.round(((eurIncome - eurExpenses) / eurIncome) * 1000) / 10
    : 0;

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
          <p className="eyebrow">Cobros y pagos</p>
          <h1>Tesorería</h1>
          <p className="lede">Consulta cobros, pagos, conciliaciones e importaciones en una única vista.</p>
        </div>
        {canManage ? <button className="button button-primary" type="button" onClick={openCreate}><IconPlus size={19} />Nuevo movimiento</button> : null}
      </div>

      <div className="inline-alert treasury-safety" role="note">
        <IconCash size={20} aria-hidden="true" />
        <span><strong>Información agregada.</strong> Esta sección no contiene cuentas bancarias, justificantes ni contrapartes reales.</span>
      </div>
      {loadError ? <div className="inline-alert" role="alert"><strong>No se pudo cargar Tesorería.</strong><span>{loadError}</span></div> : null}

      <section className="cards-grid" aria-label="Resumen de Tesorería">
        <article className="card"><span className="muted">Saldo agregado EUR</span><strong className="metric-value">{formatCurrency(eurBalance, "EUR")}</strong></article>
        <article className="card"><span className="muted">Pendientes de validar</span><strong className="metric-value">{entries.filter((entry) => ["registered", "reconciled"].includes(entry.status)).length}</strong></article>
        <article className="card"><span className="muted">Movimientos cerrados</span><strong className="metric-value">{entries.filter((entry) => entry.status === "closed").length}</strong></article>
        <article className="card"><span className="muted">Margen operativo</span><strong className="metric-value">{formatPercent(operatingMargin)}</strong></article>
      </section>

      <section className="section-block">
        <div className="toolbar treasury-toolbar">
          <label className="field compact-filter">Buscar<input type="search" placeholder="Buscar por concepto" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>
          <label className="field compact-filter">Estado<select value={status} onChange={(event) => { setStatus(event.target.value as typeof status); setPage(1); }}><option value="all">Todos</option>{treasuryStatuses.map((item) => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
          <label className="field compact-filter">Moneda<select value={currency} onChange={(event) => { setCurrency(event.target.value as typeof currency); setPage(1); }}><option value="all">Todas</option>{treasuryCurrencies.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="field compact-filter">Categoría<select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="all">Todas</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>

        {visibleEntries.length ? <div className="treasury-list">{pagedEntries.map((entry) => (
          <button className="card treasury-row" type="button" key={entry.id} onClick={() => setSelectedId(entry.id)}>
            <span className={`treasury-direction ${entry.amountCents >= 0 ? "positive" : "negative"}`} aria-hidden="true">{entry.amountCents >= 0 ? <IconTrendingUp size={20} /> : <IconTrendingDown size={20} />}</span>
            <span className="treasury-row-copy"><strong>{entry.concept}</strong><span className="muted">{formatDate(entry.entryDate)} · {entry.category ?? "Operación"} · {sourceLabel(entry.source)} · {statusLabels[entry.status]}</span></span>
            <strong className={entry.amountCents >= 0 ? "amount-positive" : "amount-negative"}>{formatCurrency(entry.amountCents, entry.currency)}</strong>
            <IconArrowRight size={19} aria-hidden="true" />
          </button>
        ))}</div> : <EmptyState kind="finance" title="No hay movimientos para estos filtros" description="Amplía el periodo o revisa la categoría seleccionada." />}
        {visibleEntries.length > pageSize ? <nav className="pagination" aria-label="Paginación de tesorería">
          <button className="button button-secondary" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Anterior</button>
          <span>Página {currentPage} de {totalPages} · {visibleEntries.length} movimientos</span>
          <button className="button button-secondary" type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Siguiente</button>
        </nav> : null}
      </section>

      <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
        <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content">
          <div className="dialog-header"><div><Dialog.Title>{editingId ? "Editar borrador" : "Nuevo movimiento"}</Dialog.Title><Dialog.Description className="muted">Introduce el concepto, la categoría y el importe del movimiento.</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar"><IconX size={19} /></Dialog.Close></div>
          <form onSubmit={submit}><div className="field-grid">
            <label className="field">Fecha<input type="date" value={form.entryDate} onChange={(event) => setForm({ ...form, entryDate: event.target.value })} /></label>
            <label className="field">Moneda<select value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value as TreasuryCurrency })}>{treasuryCurrencies.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label className="field field-span">Concepto<input value={form.concept} onChange={(event) => setForm({ ...form, concept: event.target.value })} placeholder="Servicios de infraestructura" /></label>
            <label className="field field-span">Importe<input type="number" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} aria-describedby="treasury-amount-help" /><span className="muted" id="treasury-amount-help">Usa valores negativos para salidas y positivos para entradas.</span></label>
          </div>{formError ? <p className="field-error" role="alert">{formError}</p> : null}<div className="dialog-actions"><Dialog.Close className="button button-secondary">Cancelar</Dialog.Close><button className="button button-primary" disabled={pending}>{editingId ? "Guardar cambios" : "Guardar borrador"}</button></div></form>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <Dialog.Portal><Dialog.Overlay className="dialog-overlay" />{selected ? <Dialog.Content className="dialog-content task-detail-dialog">
          <div className="dialog-header"><div><p className="eyebrow">{statusLabels[selected.status]} · {selected.currency}</p><Dialog.Title>{selected.concept}</Dialog.Title><Dialog.Description className="muted">{formatCurrency(selected.amountCents, selected.currency)} · {formatDate(selected.entryDate)}</Dialog.Description></div><Dialog.Close className="icon-button" aria-label="Cerrar detalle"><IconX size={19} /></Dialog.Close></div>
          <div className="metadata-strip"><span>Categoría <strong>{selected.category ?? "Operación"}</strong></span><span>Origen <strong>{sourceLabel(selected.source)}</strong></span></div>
          {canManage && selected.status === "draft" ? <button className="button button-secondary" type="button" onClick={() => openEdit(selected)}>Editar borrador</button> : null}
          {canManage && selected.status !== "closed" ? <section className="section-block"><h3>Siguiente control</h3><label className="field transition-note-field">Nota de decisión<textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Describe la comprobación realizada." /></label><div className="task-actions">{treasuryStatuses.filter((item) => canTransitionTreasury(selected.status, item)).map((item) => <button className="button button-primary" type="button" disabled={pending || note.trim().length < 3} onClick={() => transition(item)} key={item}>Marcar como {statusLabels[item].toLocaleLowerCase("es")}</button>)}</div></section> : null}
          <section className="section-block"><h3>Trazabilidad</h3><ul className="request-timeline">{events.filter((event) => event.entryId === selected.id).map((event) => <li key={event.id}><span className="timeline-dot" /><div><strong>{event.note}</strong><p className="muted">{event.actorName} · {formatDateTime(event.createdAt)}</p></div></li>)}</ul></section>
        </Dialog.Content> : null}</Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
