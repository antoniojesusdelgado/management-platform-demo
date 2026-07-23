"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  IconAlertTriangle,
  IconCalendar,
  IconCircleCheck,
  IconFolder,
  IconPlus,
  IconUsers,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import type { Incident } from "@/domain/incidents";
import type { Person } from "@/domain/people";
import {
  getProjectProgress,
  projectHealthValues,
  projectInputSchema,
  projectStatuses,
  type Project,
  type ProjectEvent,
  type ProjectHealth,
  type ProjectInput,
  type ProjectStatus,
} from "@/domain/projects";
import type { TaskItem } from "@/domain/tasks";

type ProjectsWorkspaceProps = {
  projects: Project[];
  events: ProjectEvent[];
  people: Person[];
  tasks: TaskItem[];
  incidents: Incident[];
  pending?: boolean;
  loadError?: string;
  canManage?: boolean;
  onCreate: (input: ProjectInput) => boolean | Promise<boolean>;
  onUpdate: (
    projectId: string,
    input: ProjectInput,
  ) => boolean | Promise<boolean>;
};

const statusLabels: Record<ProjectStatus, string> = {
  planned: "Planificado",
  active: "Activo",
  on_hold: "En pausa",
  completed: "Completado",
  cancelled: "Cancelado",
};

const healthLabels: Record<ProjectHealth, string> = {
  on_track: "En plazo",
  at_risk: "En riesgo",
  off_track: "Desviado",
};

function emptyInput(): ProjectInput {
  return {
    code: "",
    name: "",
    summary: "",
    status: "planned",
    health: "on_track",
    ownerPersonId: null,
    startDate: null,
    targetDate: null,
    color: "#4f46e5",
    memberIds: [],
  };
}

export function ProjectsWorkspace({
  projects,
  events,
  people,
  tasks,
  incidents,
  pending = false,
  loadError,
  canManage = true,
  onCreate,
  onUpdate,
}: ProjectsWorkspaceProps) {
  const [status, setStatus] = useState<"all" | ProjectStatus>("all");
  const [health, setHealth] = useState<"all" | ProjectHealth>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [input, setInput] = useState<ProjectInput>(emptyInput());
  const [formError, setFormError] = useState("");

  const filtered = useMemo(
    () =>
      projects.filter(
        (project) =>
          (status === "all" || project.status === status) &&
          (health === "all" || project.health === health),
      ),
    [health, projects, status],
  );
  const selected =
    projects.find((project) => project.id === selectedId) ?? null;

  function openCreate() {
    setEditingId(null);
    setInput(emptyInput());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(project: Project) {
    setEditingId(project.id);
    setInput({
      code: project.code,
      name: project.name,
      summary: project.summary,
      status: project.status,
      health: project.health,
      ownerPersonId: project.ownerPersonId,
      startDate: project.startDate,
      targetDate: project.targetDate,
      color: project.color,
      memberIds: project.memberIds,
    });
    setSelectedId(null);
    setFormError("");
    setFormOpen(true);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = projectInputSchema.safeParse(input);
    if (!parsed.success) {
      setFormError(
        parsed.error.issues[0]?.message ??
          "Revisa el código, las fechas y los datos del proyecto.",
      );
      return;
    }
    const completed = editingId
      ? await onUpdate(editingId, parsed.data)
      : await onCreate(parsed.data);
    if (completed) setFormOpen(false);
  }

  const active = projects.filter((project) => project.status === "active");
  const atRisk = active.filter((project) => project.health !== "on_track");
  const openTasks = tasks.filter((task) => task.status !== "completed");
  const openIncidents = incidents.filter(
    (incident) => !["resolved", "closed"].includes(incident.status),
  );

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Portfolio · ejecución</p>
          <h1>Proyectos</h1>
          <p className="lede">
            Una vista común de alcance, salud, responsables y trabajo
            relacionado, construida exclusivamente con datos sintéticos.
          </p>
        </div>
        {canManage ? (
          <button
            className="button button-primary"
            type="button"
            onClick={openCreate}
          >
            <IconPlus aria-hidden="true" size={19} />
            Nuevo proyecto
          </button>
        ) : null}
      </div>

      {loadError ? (
        <div className="inline-alert" role="alert">
          <strong>No se pudo cargar el portfolio.</strong>
          <span>{loadError}</span>
        </div>
      ) : null}

      <section className="cards-grid" aria-label="Resumen de proyectos">
        <article className="card">
          <span className="muted">Proyectos activos</span>
          <strong className="metric-value">{active.length}</strong>
        </article>
        <article className="card">
          <span className="muted">En riesgo o desviados</span>
          <strong className="metric-value">{atRisk.length}</strong>
        </article>
        <article className="card">
          <span className="muted">Trabajo abierto vinculado</span>
          <strong className="metric-value">
            {openTasks.length + openIncidents.length}
          </strong>
        </article>
      </section>

      <section className="section-block" aria-labelledby="portfolio-title">
        <div className="section-header">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h2 id="portfolio-title">Iniciativas del workspace</h2>
          </div>
          <div className="task-filters">
            <label>
              Estado
              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as typeof status)
                }
              >
                <option value="all">Todos</option>
                {projectStatuses.map((value) => (
                  <option key={value} value={value}>
                    {statusLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Salud
              <select
                value={health}
                onChange={(event) =>
                  setHealth(event.target.value as typeof health)
                }
              >
                <option value="all">Todas</option>
                {projectHealthValues.map((value) => (
                  <option key={value} value={value}>
                    {healthLabels[value]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filtered.length ? (
          <div className="cards-grid project-grid">
            {filtered.map((project) => {
              const progress = getProjectProgress(project.id, tasks);
              const projectOpenIncidents = openIncidents.filter(
                (incident) => incident.projectId === project.id,
              ).length;
              return (
                <button
                  className="card project-card"
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedId(project.id)}
                >
                  <span
                    className="project-color"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="project-card-header">
                    <span>
                      <span className="eyebrow">{project.code}</span>
                      <strong>{project.name}</strong>
                    </span>
                    <span className={`status project-health-${project.health}`}>
                      {healthLabels[project.health]}
                    </span>
                  </span>
                  <span className="muted project-summary">
                    {project.summary || "Sin resumen."}
                  </span>
                  <span
                    className="project-progress"
                    role="progressbar"
                    aria-label={`Progreso de ${project.name}`}
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span style={{ width: `${progress}%` }} />
                  </span>
                  <span className="project-card-meta">
                    <span>
                      <IconUsers aria-hidden="true" size={17} />
                      {project.memberIds.length}
                    </span>
                    <span>
                      <IconAlertTriangle aria-hidden="true" size={17} />
                      {projectOpenIncidents}
                    </span>
                    <span>{progress}%</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <IconFolder aria-hidden="true" size={32} />
            <p>No hay proyectos para estos filtros.</p>
          </div>
        )}
      </section>

      <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="dialog-content dialog-content-wide">
            <div className="dialog-header">
              <div>
                <p className="eyebrow">Portfolio</p>
                <Dialog.Title>
                  {editingId ? "Editar proyecto" : "Nuevo proyecto"}
                </Dialog.Title>
                <Dialog.Description className="muted">
                  Define alcance, responsable, fechas y miembros del equipo.
                </Dialog.Description>
              </div>
              <Dialog.Close className="icon-button" aria-label="Cerrar">
                <IconX aria-hidden="true" size={19} />
              </Dialog.Close>
            </div>
            <form onSubmit={submit}>
              <div className="field-grid">
                <label className="field">
                  Código
                  <input
                    value={input.code}
                    placeholder="OPS-01"
                    onChange={(event) =>
                      setInput({
                        ...input,
                        code: event.target.value.toUpperCase(),
                      })
                    }
                  />
                </label>
                <label className="field">
                  Color
                  <input
                    type="color"
                    value={input.color}
                    onChange={(event) =>
                      setInput({ ...input, color: event.target.value })
                    }
                  />
                </label>
                <label className="field field-span">
                  Nombre
                  <input
                    value={input.name}
                    onChange={(event) =>
                      setInput({ ...input, name: event.target.value })
                    }
                  />
                </label>
                <label className="field field-span">
                  Resumen
                  <textarea
                    rows={3}
                    value={input.summary}
                    onChange={(event) =>
                      setInput({ ...input, summary: event.target.value })
                    }
                  />
                </label>
                <label className="field">
                  Estado
                  <select
                    value={input.status}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        status: event.target.value as ProjectStatus,
                      })
                    }
                  >
                    {projectStatuses.map((value) => (
                      <option key={value} value={value}>
                        {statusLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Salud
                  <select
                    value={input.health}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        health: event.target.value as ProjectHealth,
                      })
                    }
                  >
                    {projectHealthValues.map((value) => (
                      <option key={value} value={value}>
                        {healthLabels[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Responsable
                  <select
                    value={input.ownerPersonId ?? ""}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        ownerPersonId: event.target.value || null,
                      })
                    }
                  >
                    <option value="">Sin responsable</option>
                    {people
                      .filter((person) => person.status === "active")
                      .map((person) => (
                        <option key={person.id} value={person.id}>
                          {person.displayName}
                        </option>
                      ))}
                  </select>
                </label>
                <span />
                <label className="field">
                  Inicio
                  <input
                    type="date"
                    value={input.startDate ?? ""}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        startDate: event.target.value || null,
                      })
                    }
                  />
                </label>
                <label className="field">
                  Fecha objetivo
                  <input
                    type="date"
                    value={input.targetDate ?? ""}
                    onChange={(event) =>
                      setInput({
                        ...input,
                        targetDate: event.target.value || null,
                      })
                    }
                  />
                </label>
              </div>
              <fieldset className="project-members-fieldset">
                <legend>Miembros</legend>
                <div className="project-member-options">
                  {people.map((person) => (
                    <label key={person.id}>
                      <input
                        type="checkbox"
                        checked={input.memberIds.includes(person.id)}
                        onChange={(event) =>
                          setInput({
                            ...input,
                            memberIds: event.target.checked
                              ? [...input.memberIds, person.id]
                              : input.memberIds.filter(
                                  (id) => id !== person.id,
                                ),
                          })
                        }
                      />
                      <span>
                        <strong>{person.displayName}</strong>
                        <small>
                          {person.positionTitle} · {person.team}
                        </small>
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              {formError ? (
                <p className="field-error" role="alert">
                  {formError}
                </p>
              ) : null}
              <div className="dialog-actions">
                <Dialog.Close className="button button-secondary">
                  Cancelar
                </Dialog.Close>
                <button
                  className="button button-primary"
                  disabled={pending}
                  type="submit"
                >
                  {pending ? "Guardando…" : "Guardar proyecto"}
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
            <Dialog.Content className="dialog-content dialog-content-wide">
              <div className="dialog-header">
                <div>
                  <p className="eyebrow">{selected.code}</p>
                  <Dialog.Title>{selected.name}</Dialog.Title>
                  <Dialog.Description className="muted">
                    {selected.summary || "Proyecto sin resumen."}
                  </Dialog.Description>
                </div>
                <Dialog.Close className="icon-button" aria-label="Cerrar">
                  <IconX aria-hidden="true" size={19} />
                </Dialog.Close>
              </div>
              <dl className="request-facts">
                <div>
                  <dt>Estado</dt>
                  <dd>{statusLabels[selected.status]}</dd>
                </div>
                <div>
                  <dt>Salud</dt>
                  <dd>{healthLabels[selected.health]}</dd>
                </div>
                <div>
                  <dt>Responsable</dt>
                  <dd>{selected.ownerName ?? "Sin asignar"}</dd>
                </div>
                <div>
                  <dt>Progreso</dt>
                  <dd>{getProjectProgress(selected.id, tasks)}%</dd>
                </div>
              </dl>
              <div className="project-detail-metrics">
                <span>
                  <IconCircleCheck aria-hidden="true" size={19} />
                  {
                    tasks.filter(
                      (task) =>
                        task.projectId === selected.id &&
                        task.status === "completed",
                    ).length
                  }{" "}
                  tareas completadas
                </span>
                <span>
                  <IconAlertTriangle aria-hidden="true" size={19} />
                  {
                    openIncidents.filter(
                      (incident) => incident.projectId === selected.id,
                    ).length
                  }{" "}
                  incidencias abiertas
                </span>
                <span>
                  <IconCalendar aria-hidden="true" size={19} />
                  {selected.targetDate ?? "Sin fecha objetivo"}
                </span>
              </div>
              {canManage ? (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => openEdit(selected)}
                >
                  Editar proyecto
                </button>
              ) : null}
              <section className="section-block">
                <h3>Historial</h3>
                <ul className="request-timeline">
                  {events
                    .filter((event) => event.projectId === selected.id)
                    .map((event) => (
                      <li key={event.id}>
                        <span className="timeline-dot" />
                        <div>
                          <strong>{event.note}</strong>
                          <p className="muted">
                            {event.actorName} ·{" "}
                            {new Date(event.createdAt).toLocaleString("es-ES")}
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
