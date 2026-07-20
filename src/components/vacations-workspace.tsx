"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import * as Dialog from "@radix-ui/react-dialog";
import {
  IconCalendarEvent,
  IconCheck,
  IconClock,
  IconHistory,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import {
  leaveRequestInputSchema,
  type LeaveRequest,
  type LeaveRequestEvent,
  type LeaveRequestInput,
  type LeaveRequestStatus,
} from "@/domain/vacations";

type VacationsWorkspaceProps = {
  requests: LeaveRequest[];
  events: LeaveRequestEvent[];
  onCreate: (input: LeaveRequestInput) => void;
  onTransition: (
    requestId: string,
    status: LeaveRequestStatus,
    note: string,
  ) => void;
};

const statusLabels: Record<LeaveRequestStatus, string> = {
  draft: "Borrador",
  submitted: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  cancelled: "Cancelada",
};

function formatDate(value: string) {
  return format(parseISO(value), "d MMM yyyy", { locale: es });
}

export function VacationsWorkspace({
  requests,
  events,
  onCreate,
  onTransition,
}: VacationsWorkspaceProps) {
  const [filter, setFilter] = useState<"all" | LeaveRequestStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
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
  const pending = requests.filter(
    (request) => request.status === "submitted",
  ).length;
  const form = useForm<LeaveRequestInput>({
    resolver: zodResolver(leaveRequestInputSchema),
    defaultValues: {
      startDate: "",
      endDate: "",
      type: "vacation",
      reason: "",
    },
  });

  function submit(input: LeaveRequestInput) {
    onCreate(input);
    form.reset();
    setDialogOpen(false);
  }

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Personas · disponibilidad</p>
          <h1>Vacaciones</h1>
          <p className="lede">
            Solicitudes, decisiones e historial trazable en un único flujo.
            Todos los nombres y registros de esta vista son sintéticos.
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
                </div>
                <div className="dialog-actions">
                  <Dialog.Close asChild>
                    <button className="button button-secondary" type="button">
                      Cancelar
                    </button>
                  </Dialog.Close>
                  <button className="button button-primary" type="submit">
                    Enviar solicitud
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>

      <section className="cards-grid" aria-label="Resumen de vacaciones">
        <article className="card">
          <span className="muted">Pendientes de decisión</span>
          <strong className="metric-value">{pending}</strong>
        </article>
        <article className="card">
          <span className="muted">Días aprobados en la demo</span>
          <strong className="metric-value">{approvedDays}</strong>
        </article>
        <article className="card">
          <span className="muted">Solicitudes registradas</span>
          <strong className="metric-value">{requests.length}</strong>
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
            {(
              [
                ["all", "Todas"],
                ["submitted", "Pendientes"],
                ["approved", "Aprobadas"],
                ["draft", "Borradores"],
              ] as const
            ).map(([value, label]) => (
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
          <table className="data-table">
            <caption className="sr-only">
              Solicitudes de vacaciones de demostración
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
                    {request.status === "submitted" ? (
                      <span style={{ display: "flex", gap: ".35rem", flexWrap: "wrap" }}>
                        <button
                          type="button"
                          className="button button-quiet"
                          onClick={() =>
                            onTransition(
                              request.id,
                              "approved",
                              "Cobertura validada en la demo.",
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
                          onClick={() =>
                            onTransition(
                              request.id,
                              "rejected",
                              "Solicitud rechazada en la demo.",
                            )
                          }
                          aria-label={`Rechazar solicitud de ${request.employeeName}`}
                        >
                          <IconX aria-hidden="true" size={17} />
                          Rechazar
                        </button>
                      </span>
                    ) : (
                      <span className="muted">Sin acciones</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="module-placeholder section-block">
        <section className="card" aria-labelledby="calendar-title">
          <p className="eyebrow">Cobertura</p>
          <h2 id="calendar-title">Calendario operativo</h2>
          <p className="muted">
            Vista resumida de ausencias aprobadas y solicitudes pendientes.
          </p>
          <ul className="activity-list">
            {requests.slice(0, 4).map((request) => (
              <li className="activity-item" key={`calendar-${request.id}`}>
                <span className="attention-icon">
                  <IconCalendarEvent aria-hidden="true" size={20} />
                </span>
                <span>
                  <strong>{request.employeeName}</strong>
                  <br />
                  <span className="muted">
                    {formatDate(request.startDate)} · {statusLabels[request.status]}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card" aria-labelledby="history-title">
          <p className="eyebrow">Auditoría</p>
          <h2 id="history-title">Historial reciente</h2>
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
        </section>
      </div>
    </main>
  );
}
