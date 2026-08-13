"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
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
import { EmptyState } from "@/components/empty-state";
import { formatDateTime } from "@/lib/format";

type Props = {
  incidents: Incident[];
  events: IncidentEvent[];
  assigneeOptions?: string[];
  projectOptions?: Array<{ id: string; name: string }>;
  referenceDate?: string;
  pending?: boolean;
  loadError?: string;
  initialFocusId?: string | null;
  onCreate: (input: IncidentInput) => boolean | Promise<boolean>;
  onUpdate: (id: string, input: IncidentInput) => boolean | Promise<boolean>;
  onTransition: (
    id: string,
    status: IncidentStatus,
    note: string,
  ) => boolean | Promise<boolean>;
};

const statusLabels: Record<IncidentStatus, string> = {
  registered: "Registrada",
  triaged: "Priorizada",
  assigned: "Asignada",
  investigating: "En investigación",
  resolved: "Resuelta",
  closed: "Cerrada",
};
const priorityLabels: Record<IncidentPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  critical: "Crítica",
};
const categoryLabels: Record<IncidentCategory, string> = {
  access: "Acceso",
  data: "Datos",
  hardware: "Hardware",
  software: "Software",
  other: "Otra",
};
const defaultAssignees = ["Elena Martín", "Diego Santos", "Marta Soler"];
const emptyInput = (): IncidentInput => ({
  title: "",
  description: "",
  priority: "medium",
  category: "software",
  projectId: null,
  assigneeName: null,
  affectedService: "Plataforma operativa",
  impactScope: "team",
  detectionChannel: "monitoring",
});

export function IncidentsWorkspace({
  incidents,
  events,
  assigneeOptions = defaultAssignees,
  projectOptions = [],
  referenceDate = new Date().toISOString(),
  pending = false,
  loadError,
  initialFocusId,
  onCreate,
  onUpdate,
  onTransition,
}: Props) {
  const [status, setStatus] = useState<"all" | IncidentStatus>("all");
  const [priority, setPriority] = useState<"all" | IncidentPriority>("all");
  const [category, setCategory] = useState<"all" | IncidentCategory>("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(() => initialFocusId ?? null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [input, setInput] = useState<IncidentInput>(emptyInput());
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const selected =
    incidents.find((item) => item.id === selectedId) ?? null;
  const filtered = useMemo(
    () =>
      incidents.filter(
        (item) =>
          (status === "all" || item.status === status) &&
          (priority === "all" || item.priority === priority) &&
          (category === "all" || item.category === category),
      ),
    [category, incidents, priority, status],
  );
  const pageSize = 30;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedIncidents = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const overdue = incidents.filter((item) =>
    isIncidentOverdue(item, referenceDate),
  ).length;

  function openCreate() {
    setEditingId(null);
    setInput(emptyInput());
    setError("");
    setFormOpen(true);
  }

  function openEdit(item: Incident) {
    setEditingId(item.id);
    setInput({
      title: item.title,
      description: item.description,
      priority: item.priority,
      category: item.category,
      projectId: item.projectId ?? null,
      assigneeName: item.assigneeName,
      affectedService: item.affectedService ?? "Plataforma operativa",
      impactScope: item.impactScope ?? "team",
      detectionChannel: item.detectionChannel ?? "support",
    });
    setSelectedId(null);
    setError("");
    setFormOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = incidentInputSchema.safeParse(input);
    if (!parsed.success) {
      setError("Revisa el título, la descripción y la clasificación.");
      return;
    }
    const completed = editingId
      ? await onUpdate(editingId, parsed.data)
      : await onCreate(parsed.data);
    if (completed) setFormOpen(false);
  }

  async function changeStatus(next: IncidentStatus) {
    if (!selected || note.trim().length < 3) return;
    if (await onTransition(selected.id, next, note.trim())) setNote("");
  }

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Soporte · seguimiento</p>
          <h1>Incidencias</h1>
          <p className="lede">
            Registra, prioriza y resuelve incidencias con seguimiento de
            tiempos, responsables y acciones correctivas.
          </p>
        </div>
        <button
          className="button button-primary"
          type="button"
          onClick={openCreate}
        >
          <IconPlus size={19} aria-hidden="true" />
          Nueva incidencia
        </button>
      </div>
      {loadError ? (
        <div className="inline-alert" role="alert">
          <strong>No se pudieron cargar las incidencias.</strong>
          <span>{loadError}</span>
        </div>
      ) : null}
      <section className="cards-grid" aria-label="Resumen de incidencias">
        <article className="card">
          <span className="muted">Abiertas</span>
          <strong className="metric-value">
            {
              incidents.filter(
                (item) => !["resolved", "closed"].includes(item.status),
              ).length
            }
          </strong>
        </article>
        <article className="card">
          <span className="muted">Fuera de plazo</span>
          <strong className="metric-value">{overdue}</strong>
        </article>
        <article className="card">
          <span className="muted">Críticas</span>
          <strong className="metric-value">
            {
              incidents.filter((item) => item.priority === "critical")
                .length
            }
          </strong>
        </article>
      </section>
      <section className="section-block">
        <div className="task-filters">
          <label>
            Estado
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as typeof status)
                setPage(1);
              }}
            >
              <option value="all">Todos</option>
              {incidentStatuses.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Prioridad
            <select
              value={priority}
              onChange={(event) => {
                setPriority(event.target.value as typeof priority)
                setPage(1);
              }}
            >
              <option value="all">Todas</option>
              {incidentPriorities.map((value) => (
                <option key={value} value={value}>
                  {priorityLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Categoría
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as typeof category)
                setPage(1);
              }}
            >
              <option value="all">Todas</option>
              {incidentCategories.map((value) => (
                <option key={value} value={value}>
                  {categoryLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="task-list">
          {filtered.length ? (
            pagedIncidents.map((item) => (
              <button
                className="task-row incident-row"
                type="button"
                key={item.id}
                onClick={() => setSelectedId(item.id)}
              >
                <span
                  className={`task-priority priority-${
                    item.priority === "critical"
                      ? "urgent"
                      : item.priority
                  }`}
                />
                <span className="task-row-main">
                  <strong>{item.title}</strong>
                  <span className="muted">
                    {item.projectName ?? "Sin proyecto"} ·{" "}
                    {categoryLabels[item.category]} ·{" "}
                    {item.assigneeName ?? "Sin asignar"} · Fecha límite{" "}
                    {formatDateTime(item.slaDueAt)}
                  </span>
                </span>
                <span className={`status task-status-${item.status}`}>
                  {statusLabels[item.status]}
                </span>
                <IconArrowRight size={18} aria-hidden="true" />
              </button>
            ))
          ) : (
            <EmptyState
              kind="incidents"
              title="No hay incidencias para estos filtros"
              description="Ajusta los criterios o registra un nuevo caso operativo."
            />
          )}
        </div>
        {filtered.length > pageSize ? (
          <nav className="pagination" aria-label="Paginación de incidencias">
            <button
              className="button button-secondary"
              type="button"
              disabled={currentPage === 1}
              onClick={() => setPage(currentPage - 1)}
            >
              Anterior
            </button>
            <span>
              Página {currentPage} de {totalPages} · {filtered.length} incidencias
            </span>
            <button
              className="button button-secondary"
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setPage(currentPage + 1)}
            >
              Siguiente
            </button>
          </nav>
        ) : null}
      </section>

      <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content">
            <div className="dialog-header">
              <div>
                <Dialog.Title>
                  {editingId ? "Editar incidencia" : "Nueva incidencia"}
                </Dialog.Title>
                <Dialog.Description className="muted">
                  Describe el problema, su alcance y el servicio afectado.
                </Dialog.Description>
              </div>
              <Dialog.Close className="icon-button" aria-label="Cerrar">
                <IconX size={19} />
              </Dialog.Close>
            </div>
            <form onSubmit={submit}>
              <div className="field-grid">
                <label className="field field-span">
                  Título
                  <input
                    value={input.title}
                    onChange={(event) =>
                      setInput({ ...input, title: event.target.value })
                    }
                  />
                </label>
                <label className="field field-span">
                  Descripción
                  <textarea
                    value={input.description}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        description: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="field">
                  Prioridad
                  <select
                    value={input.priority}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        priority: event.target.value as IncidentPriority,
                      })
                    }
                  >
                    {incidentPriorities.map((value) => (
                      <option key={value} value={value}>
                        {priorityLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Categoría
                  <select
                    value={input.category}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        category: event.target.value as IncidentCategory,
                      })
                    }
                  >
                    {incidentCategories.map((value) => (
                      <option key={value} value={value}>
                        {categoryLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Proyecto
                  <select
                    value={input.projectId ?? ""}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        projectId: event.target.value || null,
                      })
                    }
                  >
                    <option value="">Sin proyecto</option>
                    {projectOptions.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Responsable
                  <select
                    value={input.assigneeName ?? ""}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        assigneeName: event.target.value || null,
                      })
                    }
                  >
                    <option value="">Sin asignar</option>
                    {assigneeOptions.map((name) => (
                      <option key={name}>{name}</option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Servicio afectado
                  <input
                    value={input.affectedService ?? ""}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        affectedService: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="field">
                  Alcance
                  <select
                    value={input.impactScope ?? "team"}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        impactScope: event.target.value as
                          | "individual"
                          | "team"
                          | "workspace",
                      })
                    }
                  >
                    <option value="individual">Individual</option>
                    <option value="team">Equipo</option>
                    <option value="workspace">Toda la aplicación</option>
                  </select>
                </label>
                <label className="field">
                  Canal de detección
                  <select
                    value={input.detectionChannel ?? "support"}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        detectionChannel: event.target.value as
                          | "monitoring"
                          | "support"
                          | "team"
                          | "automation",
                      })
                    }
                  >
                    <option value="monitoring">Monitorización</option>
                    <option value="support">Soporte</option>
                    <option value="team">Equipo</option>
                    <option value="automation">Automatización</option>
                  </select>
                </label>
              </div>
              {error ? (
                <p className="field-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="dialog-actions">
                <Dialog.Close className="button button-secondary">
                  Cancelar
                </Dialog.Close>
                <button
                  className="button button-primary"
                  disabled={pending}
                >
                  Guardar
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelectedId(null)}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          {selected ? (
            <Dialog.Content className="dialog-content task-detail-dialog">
              <div className="dialog-header">
                <div>
                  <p className="eyebrow">
                    {priorityLabels[selected.priority]} ·{" "}
                    {categoryLabels[selected.category]}
                  </p>
                  <Dialog.Title>{selected.title}</Dialog.Title>
                  <Dialog.Description className="muted">
                    {selected.description}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="icon-button" aria-label="Cerrar">
                  <IconX size={19} />
                </Dialog.Close>
              </div>
              <div className="task-detail-grid">
                <section>
                  <h3>Gestión</h3>
                  <p className="muted">
                    Proyecto: {selected.projectName ?? "Sin proyecto"}
                  </p>
                  <p className="muted">
                    Responsable: {selected.assigneeName ?? "Sin asignar"}
                  </p>
                  <p className="muted">
                    Servicio: {selected.affectedService ?? "Operación"}
                  </p>
                  <p className="muted">
                    Alcance:{" "}
                    {selected.impactScope === "workspace"
                      ? "Toda la aplicación"
                      : selected.impactScope === "individual"
                        ? "Individual"
                        : "Equipo"}{" "}
                    · detección{" "}
                    {selected.detectionChannel ?? "soporte"}
                  </p>
                  {selected.firstResponseAt ? (
                    <p className="muted">
                      Primera respuesta:{" "}
                      {formatDateTime(selected.firstResponseAt)}
                    </p>
                  ) : null}
                  <p className="muted">
                    Fecha límite:{" "}
                    {formatDateTime(selected.slaDueAt)}
                  </p>
                  {selected.resolution ? (
                    <p>
                      <strong>Resolución:</strong> {selected.resolution}
                    </p>
                  ) : null}
                  {selected.rootCause ? (
                    <p>
                      <strong>Causa raíz:</strong> {selected.rootCause}
                    </p>
                  ) : null}
                  {selected.correctiveTaskId ? (
                    <p className="muted">
                      Tarea correctiva vinculada:{" "}
                      {selected.correctiveTaskId.slice(0, 8)}
                    </p>
                  ) : null}
                  <button
                    className="button button-secondary"
                    type="button"
                    onClick={() => openEdit(selected)}
                  >
                    Editar clasificación
                  </button>
                </section>
                <section>
                  <h3>
                    <IconAlertTriangle size={18} />
                    Flujo
                  </h3>
                  <label className="field">
                    Nota de decisión
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                    />
                  </label>
                  {selected.status === "triaged" &&
                  !selected.assigneeName ? (
                    <p className="field-error">
                      Asigna una persona responsable antes de avanzar.
                    </p>
                  ) : null}
                  <div className="task-actions">
                    {incidentStatuses
                      .filter(
                        (next) =>
                          canTransitionIncident(selected.status, next) &&
                          (next !== "assigned" ||
                            Boolean(selected.assigneeName)),
                      )
                      .map((next) => (
                        <button
                          className="button button-primary"
                          type="button"
                          disabled={pending || note.trim().length < 3}
                          key={next}
                          onClick={() => changeStatus(next)}
                        >
                          {statusLabels[next]}
                        </button>
                      ))}
                  </div>
                </section>
              </div>
              <section>
                <h3>Actividad</h3>
                <ul className="request-timeline">
                  {events
                    .filter((event) => event.incidentId === selected.id)
                    .map((event) => (
                      <li key={event.id}>
                        <span className="timeline-dot" />
                        <div>
                          <strong>{event.note}</strong>
                          <p className="muted">
                            {event.actorName} ·{" "}
                            {formatDateTime(event.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                </ul>
              </section>
            </Dialog.Content>
          ) : null}
        </Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
