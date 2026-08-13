"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import {
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconEye,
  IconHistory,
  IconPlus,
  IconSend,
  IconX,
} from "@tabler/icons-react";
import { isAfter, parseISO } from "date-fns";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { LeaveCalendar } from "@/components/leave-calendar";
import { LeaveTransitionDialog } from "@/components/leave-transition-dialog";
import {
  leaveRequestInputSchema,
  calculateBusinessDays,
  type LeaveRequest,
  type LeaveRequestEvent,
  type LeaveRequestInput,
  type LeaveRequestStatus,
} from "@/domain/vacations";
import { formatDate, formatDateTime } from "@/lib/format";

type VacationsWorkspaceProps = {
  requests: LeaveRequest[];
  events: LeaveRequestEvent[];
  pending?: boolean;
  loadError?: string;
  initialFocusId?: string | null;
  onCreate: (input: LeaveRequestInput) => boolean | Promise<boolean>;
  onTransition: (
    requestId: string,
    status: LeaveRequestStatus,
    note: string,
  ) => boolean | Promise<boolean>;
};

type TransitionIntent = {
  requestId: string;
  employeeName: string;
  status: "rejected" | "cancelled";
};

const statusLabels: Record<LeaveRequestStatus, string> = {
  draft: "Borrador",
  submitted: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

export function VacationsWorkspace({
  requests,
  events,
  pending = false,
  loadError,
  initialFocusId,
  onCreate,
  onTransition,
}: VacationsWorkspaceProps) {
  const [filter, setFilter] = useState<"all" | LeaveRequestStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(() => initialFocusId ?? null);
  const [transitionIntent, setTransitionIntent] =
    useState<TransitionIntent | null>(null);
  const filtered = useMemo(
    () =>
      filter === "all"
        ? requests
        : requests.filter((request) => request.status === filter),
    [filter, requests],
  );
  const approvedDays = requests
    .filter((request) => request.status === "approved")
    .reduce((total, request) => total + request.businessDays, 0);
  const pendingCount = requests.filter(
    (request) => request.status === "submitted",
  ).length;
  const pendingDays = requests
    .filter((request) => request.status === "submitted")
    .reduce((total, request) => total + request.businessDays, 0);
  const selectedRequest = requests.find(
    (request) => request.id === selectedRequestId,
  );
  const selectedEvents = events.filter(
    (event) => event.requestId === selectedRequestId,
  );
  const form = useForm<LeaveRequestInput>({
    resolver: zodResolver(leaveRequestInputSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      type: "vacation",
      reason: "",
    },
  });
  const [startDate, endDate] = useWatch({
    control: form.control,
    name: ["startDate", "endDate"],
  });
  const businessDaysPreview = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (isAfter(parseISO(startDate), parseISO(endDate))) return null;
    return calculateBusinessDays(startDate, endDate);
  }, [endDate, startDate]);

  async function submit(input: LeaveRequestInput) {
    const completed = await onCreate(input);
    if (completed) {
      form.reset();
      setDialogOpen(false);
    }
  }

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Personas · disponibilidad</p>
          <h1>Vacaciones</h1>
          <p className="lede">
            Consulta las solicitudes, las decisiones, el calendario y la
            disponibilidad del equipo.
          </p>
        </div>
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger asChild>
            <button className="button button-primary" type="button">
              <IconPlus aria-hidden="true" size={19} />
              Nueva solicitud
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className="dialog-overlay" />
            <Dialog.Content className="dialog-content">
              <div className="dialog-header">
                <div>
                  <Dialog.Title asChild>
                    <h2>Nueva solicitud</h2>
                  </Dialog.Title>
                  <Dialog.Description className="muted">
                    La solicitud se conservará solo durante esta sesión.
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Cerrar formulario"
                  >
                    <IconX aria-hidden="true" size={20} />
                  </button>
                </Dialog.Close>
              </div>

              <form onSubmit={form.handleSubmit(submit)} noValidate>
                <div className="field-grid">
                  <div className="field">
                    <label htmlFor="leave-start">Fecha inicial</label>
                    <input
                      id="leave-start"
                      type="date"
                      aria-invalid={Boolean(form.formState.errors.startDate)}
                      {...form.register("startDate")}
                    />
                    {form.formState.errors.startDate ? (
                      <p className="field-error" role="alert">
                        {form.formState.errors.startDate.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="field">
                    <label htmlFor="leave-end">Fecha final</label>
                    <input
                      id="leave-end"
                      type="date"
                      aria-invalid={Boolean(form.formState.errors.endDate)}
                      {...form.register("endDate")}
                    />
                    {form.formState.errors.endDate ? (
                      <p className="field-error" role="alert">
                        {form.formState.errors.endDate.message}
                      </p>
                    ) : null}
                  </div>
                  <div className="field field-span">
                    <label htmlFor="leave-type">Tipo</label>
                    <select id="leave-type" {...form.register("type")}>
                      <option value="vacation">Vacaciones</option>
                      <option value="personal">Asunto personal</option>
                    </select>
                  </div>
                  <div className="field field-span">
                    <label htmlFor="leave-reason">Motivo</label>
                    <textarea
                      id="leave-reason"
                      maxLength={300}
                      aria-invalid={Boolean(form.formState.errors.reason)}
                      {...form.register("reason")}
                    />
                    {form.formState.errors.reason ? (
                      <p className="field-error" role="alert">
                        {form.formState.errors.reason.message}
                      </p>
                    ) : null}
                  </div>
                  {businessDaysPreview !== null ? (
                    <div className="leave-preview field-span" role="status">
                      <IconCalendarEvent aria-hidden="true" size={20} />
                      <span>
                        El periodo incluye <strong>{businessDaysPreview}</strong>{" "}
                        {businessDaysPreview === 1
                          ? "día laborable"
                          : "días laborables"}
                        .
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="dialog-actions">
                  <Dialog.Close asChild>
                    <button className="button button-secondary" type="button">
                      Cancelar
                    </button>
                  </Dialog.Close>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={pending}
                  >
                    {pending ? "Enviando…" : "Enviar solicitud"}
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      {loadError ? (
        <div className="inline-alert" role="alert">
          <strong>No se pudieron cargar las solicitudes.</strong>
          <span>{loadError}</span>
        </div>
      ) : null}

      <section className="cards-grid" aria-label="Resumen de vacaciones">
        <article className="card">
          <span className="muted">Pendientes de decisión</span>
          <strong className="metric-value">{pendingCount}</strong>
        </article>
        <article className="card">
          <span className="muted">Días aprobados</span>
          <strong className="metric-value">{approvedDays}</strong>
        </article>
        <article className="card">
          <span className="muted">Solicitudes registradas</span>
          <strong className="metric-value">{requests.length}</strong>
        </article>
        <article className="card">
          <span className="muted">Días pendientes de revisión</span>
          <strong className="metric-value">{pendingDays}</strong>
        </article>
      </section>

      <section className="section-block" aria-labelledby="requests-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Bandeja de gestión</p>
            <h2 id="requests-title">Solicitudes</h2>
          </div>
        </div>
        <div className="toolbar">
          <div className="segmented" aria-label="Filtrar solicitudes">
            {([
              ["all", "Todas"],
              ["submitted", "Pendientes"],
              ["approved", "Aprobadas"],
              ["draft", "Borradores"],
              ["rejected", "Rechazadas"],
              ["cancelled", "Canceladas"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                className="segment"
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <span className="muted" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "solicitud" : "solicitudes"}
          </span>
        </div>

        <div className="data-table-wrap">
          <table className="data-table vacations-table">
            <caption className="sr-only">
              Solicitudes de vacaciones
            </caption>
            <thead>
              <tr>
                <th>Persona</th>
                <th>Periodo</th>
                <th>Días</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((request) => (
                <tr key={request.id}>
                  <td data-label="Persona">
                    <strong>{request.employeeName}</strong>
                  </td>
                  <td data-label="Periodo">
                    {formatDate(request.startDate)} – {formatDate(request.endDate)}
                  </td>
                  <td data-label="Días">{request.businessDays}</td>
                  <td data-label="Estado">
                    <span className={`status status-${request.status}`}>
                      {statusLabels[request.status]}
                    </span>
                  </td>
                  <td data-label="Acciones">
                    <span className="table-actions">
                      <button
                        type="button"
                        className="button button-quiet"
                        disabled={pending}
                        onClick={() => setSelectedRequestId(request.id)}
                        aria-label={`Ver detalle de la solicitud de ${request.employeeName}`}
                      >
                        <IconEye aria-hidden="true" size={17} />
                        Detalle
                      </button>
                      {request.status === "submitted" ? (
                        <>
                        <button
                          type="button"
                          className="button button-quiet"
                          disabled={pending}
                          onClick={() =>
                            onTransition(
                              request.id,
                              "approved",
                              "Cobertura del equipo validada.",
                            )
                          }
                          aria-label={`Aprobar solicitud de ${request.employeeName}`}
                        >
                          <IconCheck aria-hidden="true" size={17} />
                          Aprobar
                        </button>
                        <button
                          type="button"
                          className="button button-danger"
                          disabled={pending}
                          onClick={() =>
                            setTransitionIntent({
                              requestId: request.id,
                              employeeName: request.employeeName,
                              status: "rejected",
                            })
                          }
                          aria-label={`Rechazar solicitud de ${request.employeeName}`}
                        >
                          <IconX aria-hidden="true" size={17} />
                          Rechazar
                        </button>
                        </>
                      ) : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <div className="table-empty">
              No hay solicitudes con este estado en la sesión actual.
            </div>
          ) : null}
        </div>
      </section>

      <Dialog.Root
        open={Boolean(selectedRequest)}
        onOpenChange={(open) => {
          if (!open) setSelectedRequestId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          {selectedRequest ? (
            <Dialog.Content className="dialog-content request-detail">
              <div className="dialog-header">
                <div>
                  <p className="eyebrow">Solicitud {selectedRequest.id}</p>
                  <Dialog.Title asChild>
                    <h2>{selectedRequest.employeeName}</h2>
                  </Dialog.Title>
                  <Dialog.Description className="muted">
                    {formatDate(selectedRequest.startDate)} –{" "}
                    {formatDate(selectedRequest.endDate)}
                  </Dialog.Description>
                </div>
                <Dialog.Close asChild>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Cerrar detalle"
                  >
                    <IconX aria-hidden="true" size={20} />
                  </button>
                </Dialog.Close>
              </div>

              <dl className="request-facts">
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span className={`status status-${selectedRequest.status}`}>
                      {statusLabels[selectedRequest.status]}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Tipo</dt>
                  <dd>
                    {selectedRequest.type === "vacation"
                      ? "Vacaciones"
                      : "Asunto personal"}
                  </dd>
                </div>
                <div>
                  <dt>Días laborables</dt>
                  <dd>{selectedRequest.businessDays}</dd>
                </div>
              </dl>

              <section className="request-reason" aria-labelledby="reason-title">
                <h3 id="reason-title">Motivo</h3>
                <p>{selectedRequest.reason}</p>
              </section>

              <section aria-labelledby="request-history-title">
                <h3 id="request-history-title">Historial</h3>
                {selectedEvents.length > 0 ? (
                  <ol className="request-timeline">
                    {selectedEvents.map((event) => (
                      <li key={event.id}>
                        <span className="timeline-dot" aria-hidden="true" />
                        <div>
                          <strong>{statusLabels[event.to]}</strong>
                          <p>{event.note}</p>
                          <span className="muted">
                            {event.actorName} ·{" "}
                            {formatDateTime(event.createdAt)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">Aún no hay eventos registrados.</p>
                )}
              </section>

              <div className="dialog-actions request-actions">
                {selectedRequest.status === "draft" ? (
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      onTransition(
                        selectedRequest.id,
                        "submitted",
                        "Borrador enviado a revisión.",
                      )
                    }
                  >
                    <IconSend aria-hidden="true" size={17} />
                    Enviar a revisión
                  </button>
                ) : null}
                {selectedRequest.status === "submitted" ? (
                  <>
                    <button
                      className="button button-primary"
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        onTransition(
                          selectedRequest.id,
                          "approved",
                          "Cobertura del equipo validada.",
                        )
                      }
                    >
                      <IconCheck aria-hidden="true" size={17} />
                      Aprobar
                    </button>
                    <button
                      className="button button-danger"
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        setTransitionIntent({
                          requestId: selectedRequest.id,
                          employeeName: selectedRequest.employeeName,
                          status: "rejected",
                        })
                      }
                    >
                      <IconX aria-hidden="true" size={17} />
                      Rechazar
                    </button>
                  </>
                ) : null}
                {selectedRequest.status === "draft" ||
                selectedRequest.status === "submitted" ||
                selectedRequest.status === "approved" ? (
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      setTransitionIntent({
                        requestId: selectedRequest.id,
                        employeeName: selectedRequest.employeeName,
                        status: "cancelled",
                      })
                    }
                  >
                    Cancelar solicitud
                  </button>
                ) : null}
              </div>
            </Dialog.Content>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>

      <LeaveTransitionDialog
        open={Boolean(transitionIntent)}
        title={
          transitionIntent?.status === "rejected"
            ? "Rechazar solicitud"
            : "Cancelar solicitud"
        }
        description={
          transitionIntent
            ? `Esta decisión se registrará en el historial de ${transitionIntent.employeeName}.`
            : ""
        }
        confirmLabel={
          transitionIntent?.status === "rejected"
            ? "Rechazar solicitud"
            : "Cancelar solicitud"
        }
        destructive
        pending={pending}
        onOpenChange={(open) => {
          if (!open) setTransitionIntent(null);
        }}
        onConfirm={(note) => {
          if (!transitionIntent) return false;
          return onTransition(
            transitionIntent.requestId,
            transitionIntent.status,
            note,
          );
        }}
      />

      <div className="module-placeholder section-block">
        <LeaveCalendar requests={requests} />

        <section className="card" aria-labelledby="history-title">
          <p className="eyebrow">Auditoría</p>
          <h2 id="history-title">Historial reciente</h2>
          {events.length > 0 ? (
            <ul className="activity-list">
              {events.slice(0, 5).map((event) => (
              <li className="activity-item" key={event.id}>
                <span className="attention-icon cyan">
                  {event.to === "approved" ? (
                    <IconCheck aria-hidden="true" size={19} />
                  ) : event.to === "submitted" ? (
                    <IconClock aria-hidden="true" size={19} />
                  ) : (
                    <IconHistory aria-hidden="true" size={19} />
                  )}
                </span>
                <span>
                  <strong>{statusLabels[event.to]}</strong>
                  <br />
                  <span className="muted">{event.note}</span>
                </span>
              </li>
              ))}
            </ul>
          ) : (
            <div className="compact-empty-state">
              <IconHistory aria-hidden="true" size={24} />
              <span>Aún no hay decisiones registradas.</span>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
