"use client";

import * as Dialog from "@radix-ui/react-dialog";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconCheck,
  IconMessage,
  IconPlus,
  IconRoute,
  IconUser,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";
import {
  canTransitionTask,
  isTaskOverdue,
  taskInputSchema,
  taskPriorities,
  taskStatuses,
  type TaskComment,
  type TaskDependency,
  type TaskEvent,
  type TaskInput,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
} from "@/domain/tasks";

type TasksWorkspaceProps = {
  tasks: TaskItem[];
  dependencies: TaskDependency[];
  comments: TaskComment[];
  events: TaskEvent[];
  pending?: boolean;
  loadError?: string;
  assigneeOptions?: string[];
  currentUserName?: string;
  onCreate: (input: TaskInput) => boolean | Promise<boolean>;
  onUpdate: (taskId: string, input: TaskInput) => boolean | Promise<boolean>;
  onTransition: (
    taskId: string,
    status: TaskStatus,
    note: string,
  ) => boolean | Promise<boolean>;
  onComment: (taskId: string, body: string) => boolean | Promise<boolean>;
  onDependency: (
    taskId: string,
    dependsOnTaskId: string,
  ) => boolean | Promise<boolean>;
};

const statusLabels: Record<TaskStatus, string> = {
  pending: "Pendiente",
  in_progress: "En curso",
  blocked: "Bloqueada",
  in_review: "En revisión",
  completed: "Completada",
};

const priorityLabels: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const defaultAssignees = ["Usuario invitado", "Elena Martín", "Diego Santos", "Marta Soler"];

function emptyInput(): TaskInput {
  return {
    title: "",
    description: "",
    priority: "medium",
    assigneeName: null,
    dueDate: null,
  };
}

export function TasksWorkspace({
  tasks,
  dependencies,
  comments,
  events,
  pending = false,
  loadError,
  assigneeOptions = defaultAssignees,
  currentUserName = "Usuario invitado",
  onCreate,
  onUpdate,
  onTransition,
  onComment,
  onDependency,
}: TasksWorkspaceProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [statusFilter, setStatusFilter] = useState<"all" | TaskStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | TaskPriority>("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "upcoming" | "none">("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValue, setFormValue] = useState<TaskInput>(emptyInput());
  const [formError, setFormError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transitionNote, setTransitionNote] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [dependencyId, setDependencyId] = useState("");

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        if (statusFilter !== "all" && task.status !== statusFilter) return false;
        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
        if (assigneeFilter !== "all") {
          if (assigneeFilter === "unassigned" && task.assigneeName !== null) return false;
          if (assigneeFilter !== "unassigned" && task.assigneeName !== assigneeFilter) return false;
        }
        if (dueFilter === "overdue" && !isTaskOverdue(task, today)) return false;
        if (dueFilter === "upcoming" && (!task.dueDate || task.dueDate < today)) return false;
        if (dueFilter === "none" && task.dueDate !== null) return false;
        return true;
      }),
    [assigneeFilter, dueFilter, priorityFilter, statusFilter, tasks, today],
  );

  const selected = tasks.find((task) => task.id === selectedId) ?? null;
  const selectedDependencies = dependencies.filter(
    (dependency) => dependency.taskId === selectedId,
  );
  const selectedComments = comments.filter((comment) => comment.taskId === selectedId);
  const selectedEvents = events.filter((event) => event.taskId === selectedId);
  const activeCount = tasks.filter((task) => task.status !== "completed").length;
  const personalCount = tasks.filter(
    (task) => task.assigneeName === currentUserName && task.status !== "completed",
  ).length;
  const blockedCount = tasks.filter((task) => task.status === "blocked").length;

  function openCreate() {
    setEditingId(null);
    setFormValue(emptyInput());
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(task: TaskItem) {
    setEditingId(task.id);
    setFormValue({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assigneeName: task.assigneeName,
      dueDate: task.dueDate,
    });
    setFormError("");
    setSelectedId(null);
    setFormOpen(true);
  }

  async function submitTask(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = taskInputSchema.safeParse(formValue);
    if (!parsed.success) {
      setFormError("Revisa el título, la descripción y los datos de planificación.");
      return;
    }
    const completed = editingId
      ? await onUpdate(editingId, parsed.data)
      : await onCreate(parsed.data);
    if (completed) setFormOpen(false);
  }

  async function changeStatus(status: TaskStatus) {
    if (!selected || transitionNote.trim().length < 3) return;
    const completed = await onTransition(selected.id, status, transitionNote.trim());
    if (completed) setTransitionNote("");
  }

  async function addComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || commentBody.trim().length < 2) return;
    const completed = await onComment(selected.id, commentBody.trim());
    if (completed) setCommentBody("");
  }

  async function addDependency(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !dependencyId) return;
    const completed = await onDependency(selected.id, dependencyId);
    if (completed) setDependencyId("");
  }

  return (
    <main className="workspace" id="main-content">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Trabajo · seguimiento</p>
          <h1>Tareas</h1>
          <p className="lede">
            Bandeja personal, planificación y actividad trazable con datos completamente sintéticos.
          </p>
        </div>
        <button className="button button-primary" type="button" onClick={openCreate}>
          <IconPlus aria-hidden="true" size={19} />
          Nueva tarea
        </button>
      </div>

      {loadError ? (
        <div className="inline-alert" role="alert">
          <strong>No se pudieron cargar las tareas.</strong>
          <span>{loadError}</span>
        </div>
      ) : null}

      <section className="cards-grid" aria-label="Resumen de tareas">
        <article className="card"><span className="muted">Tareas activas</span><strong className="metric-value">{activeCount}</strong></article>
        <article className="card"><span className="muted">Mi bandeja</span><strong className="metric-value">{personalCount}</strong></article>
        <article className="card"><span className="muted">Bloqueadas</span><strong className="metric-value">{blockedCount}</strong></article>
      </section>

      <section className="section-block" aria-labelledby="task-inbox-title">
        <div className="section-header">
          <div><p className="eyebrow">Bandeja</p><h2 id="task-inbox-title">Trabajo planificado</h2></div>
          <button className="button button-quiet" type="button" onClick={() => setAssigneeFilter(currentUserName)}>
            <IconUser aria-hidden="true" size={18} /> Mi bandeja
          </button>
        </div>
        <div className="task-filters" aria-label="Filtros de tareas">
          <label>Estado<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | TaskStatus)}><option value="all">Todos</option>{taskStatuses.map((status) => <option value={status} key={status}>{statusLabels[status]}</option>)}</select></label>
          <label>Prioridad<select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as "all" | TaskPriority)}><option value="all">Todas</option>{taskPriorities.map((priority) => <option value={priority} key={priority}>{priorityLabels[priority]}</option>)}</select></label>
          <label>Responsable<select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}><option value="all">Todas las personas</option><option value="unassigned">Sin asignar</option>{assigneeOptions.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
          <label>Vencimiento<select value={dueFilter} onChange={(event) => setDueFilter(event.target.value as typeof dueFilter)}><option value="all">Cualquier fecha</option><option value="overdue">Vencidas</option><option value="upcoming">Próximas</option><option value="none">Sin fecha</option></select></label>
        </div>

        {filteredTasks.length ? (
          <div className="task-list">
            {filteredTasks.map((task) => (
              <button className="task-row" type="button" key={task.id} onClick={() => setSelectedId(task.id)}>
                <span className={`task-priority priority-${task.priority}`} aria-label={`Prioridad ${priorityLabels[task.priority]}`} />
                <span className="task-row-main"><strong>{task.title}</strong><span className="muted">{task.assigneeName ?? "Sin asignar"} · {task.dueDate ?? "Sin vencimiento"}</span></span>
                <span className={`status-chip task-status-${task.status}`}>{statusLabels[task.status]}</span>
                {isTaskOverdue(task, today) ? <IconAlertTriangle aria-label="Vencida" size={19} /> : <IconArrowRight aria-hidden="true" size={19} />}
              </button>
            ))}
          </div>
        ) : (
          <div className="empty-state"><IconCheck aria-hidden="true" size={30} /><strong>No hay tareas para estos filtros</strong><span>Prueba otra combinación o crea una nueva tarea.</span></div>
        )}
      </section>

      <Dialog.Root open={formOpen} onOpenChange={setFormOpen}>
        <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content">
          <div className="dialog-header"><div><Dialog.Title asChild><h2>{editingId ? "Editar tarea" : "Nueva tarea"}</h2></Dialog.Title><Dialog.Description className="muted">Los datos de la demo son sintéticos y permanecen solo en esta sesión.</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" type="button" aria-label="Cerrar formulario"><IconX aria-hidden="true" size={20} /></button></Dialog.Close></div>
          <form onSubmit={submitTask} noValidate>
            {formError ? <p className="field-error" role="alert">{formError}</p> : null}
            <div className="field-grid">
              <div className="field field-span"><label htmlFor="task-title">Título</label><input id="task-title" value={formValue.title} maxLength={160} onChange={(event) => setFormValue({ ...formValue, title: event.target.value })} /></div>
              <div className="field field-span"><label htmlFor="task-description">Descripción</label><textarea id="task-description" value={formValue.description} maxLength={2000} onChange={(event) => setFormValue({ ...formValue, description: event.target.value })} /></div>
              <div className="field"><label htmlFor="task-priority">Prioridad</label><select id="task-priority" value={formValue.priority} onChange={(event) => setFormValue({ ...formValue, priority: event.target.value as TaskPriority })}>{taskPriorities.map((priority) => <option value={priority} key={priority}>{priorityLabels[priority]}</option>)}</select></div>
              <div className="field"><label htmlFor="task-assignee">Responsable</label><select id="task-assignee" value={formValue.assigneeName ?? ""} onChange={(event) => setFormValue({ ...formValue, assigneeName: event.target.value || null })}><option value="">Sin asignar</option>{assigneeOptions.map((name) => <option value={name} key={name}>{name}</option>)}</select></div>
              <div className="field field-span"><label htmlFor="task-due-date">Fecha límite</label><input id="task-due-date" type="date" value={formValue.dueDate ?? ""} onChange={(event) => setFormValue({ ...formValue, dueDate: event.target.value || null })} /></div>
            </div>
            <div className="dialog-actions"><Dialog.Close asChild><button className="button button-secondary" type="button">Cancelar</button></Dialog.Close><button className="button button-primary" type="submit" disabled={pending}>{pending ? "Guardando…" : "Guardar tarea"}</button></div>
          </form>
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <Dialog.Portal><Dialog.Overlay className="dialog-overlay" /><Dialog.Content className="dialog-content task-detail-dialog">
          {selected ? <><div className="dialog-header"><div><p className="eyebrow">{priorityLabels[selected.priority]} · {statusLabels[selected.status]}</p><Dialog.Title asChild><h2>{selected.title}</h2></Dialog.Title><Dialog.Description className="muted">{selected.description || "Sin descripción"}</Dialog.Description></div><Dialog.Close asChild><button className="icon-button" type="button" aria-label="Cerrar detalle"><IconX aria-hidden="true" size={20} /></button></Dialog.Close></div>
            <div className="task-detail-grid">
              <section><h3>Planificación</h3><p className="muted">Responsable: {selected.assigneeName ?? "Sin asignar"}<br />Fecha límite: {selected.dueDate ?? "Sin fecha"}</p><button className="button button-secondary" type="button" onClick={() => openEdit(selected)}>Editar tarea</button></section>
              <section><h3>Cambiar estado</h3><div className="field"><label htmlFor="task-transition-note">Nota de actividad</label><textarea id="task-transition-note" value={transitionNote} minLength={3} maxLength={300} onChange={(event) => setTransitionNote(event.target.value)} /></div><div className="task-actions">{taskStatuses.filter((status) => canTransitionTask(selected.status, status)).map((status) => <button className="button button-secondary" type="button" disabled={pending || transitionNote.trim().length < 3} key={status} onClick={() => changeStatus(status)}>{statusLabels[status]}</button>)}</div></section>
            </div>
            <div className="task-detail-grid">
              <section><h3><IconRoute aria-hidden="true" size={19} /> Dependencias</h3><ul className="compact-list">{selectedDependencies.map((dependency) => <li key={dependency.id}>{tasks.find((task) => task.id === dependency.dependsOnTaskId)?.title ?? "Tarea no disponible"}</li>)}</ul><form onSubmit={addDependency} className="inline-form"><label className="sr-only" htmlFor="task-dependency">Nueva dependencia</label><select id="task-dependency" value={dependencyId} onChange={(event) => setDependencyId(event.target.value)}><option value="">Seleccionar tarea</option>{tasks.filter((task) => task.id !== selected.id).map((task) => <option value={task.id} key={task.id}>{task.title}</option>)}</select><button className="button button-secondary" type="submit" disabled={!dependencyId || pending}>Añadir</button></form></section>
              <section><h3><IconMessage aria-hidden="true" size={19} /> Comentarios</h3><ul className="compact-list">{selectedComments.map((comment) => <li key={comment.id}><strong>{comment.authorName}</strong><br />{comment.body}</li>)}</ul><form onSubmit={addComment} className="inline-form"><label className="sr-only" htmlFor="task-comment">Nuevo comentario</label><input id="task-comment" value={commentBody} placeholder="Añadir comentario" maxLength={1000} onChange={(event) => setCommentBody(event.target.value)} /><button className="button button-secondary" type="submit" disabled={commentBody.trim().length < 2 || pending}>Comentar</button></form></section>
            </div>
            <section><h3>Actividad</h3><ul className="activity-list">{selectedEvents.map((event) => <li className="activity-item" key={event.id}><span className="attention-icon"><IconArrowRight aria-hidden="true" size={18} /></span><span><strong>{event.note}</strong><br /><span className="muted">{event.actorName} · {new Date(event.createdAt).toLocaleString("es-ES")}</span></span></li>)}</ul></section>
          </> : null}
        </Dialog.Content></Dialog.Portal>
      </Dialog.Root>
    </main>
  );
}
