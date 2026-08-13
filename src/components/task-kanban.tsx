"use client";

import {
  closestCorners,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  IconAlertTriangle,
  IconGripVertical,
  IconLock,
  IconMessage,
} from "@tabler/icons-react";
import { useState, type CSSProperties } from "react";
import { InitialsAvatar } from "@/components/initials-avatar";
import {
  canTransitionTask,
  isTaskOverdue,
  taskStatuses,
  type TaskItem,
  type TaskStatus,
} from "@/domain/tasks";

type SwimlaneMode = "none" | "project" | "assignee";

type TaskKanbanProps = {
  tasks: TaskItem[];
  today: string;
  pending: boolean;
  swimlane: SwimlaneMode;
  wipLimits: Record<TaskStatus, number>;
  statusLabels: Record<TaskStatus, string>;
  statusFilter: TaskStatus | "all";
  onOpen: (taskId: string) => void;
  onMove: (task: TaskItem, status: TaskStatus) => Promise<boolean>;
  onWipLimitChange: (status: TaskStatus, limit: number) => void;
  onStatusFilterChange: (status: TaskStatus) => void;
};

function laneFor(task: TaskItem, mode: SwimlaneMode) {
  if (mode === "project") return task.projectName ?? "Sin proyecto";
  if (mode === "assignee") return task.assigneeName ?? "Sin asignar";
  return "Todo el trabajo";
}

function KanbanCard({
  task,
  today,
  pending,
  statusLabels,
  onOpen,
  onMove,
}: {
  task: TaskItem;
  today: string;
  pending: boolean;
  statusLabels: Record<TaskStatus, string>;
  onOpen: (taskId: string) => void;
  onMove: (task: TaskItem, status: TaskStatus) => Promise<boolean>;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: task.id, disabled: pending });
  const style = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
  } satisfies CSSProperties;
  const validTargets = taskStatuses.filter((status) =>
    canTransitionTask(task.status, status),
  );

  return (
    <article
      className={`kanban-card${isDragging ? " is-dragging" : ""}`}
      ref={setNodeRef}
      style={style}
    >
      <div className="kanban-card-topline">
        <span className={`task-priority priority-${task.priority}`} />
        <button
          className="kanban-drag-handle"
          type="button"
          aria-label="Mover tarea en Kanban"
          disabled={pending}
          {...listeners}
          {...attributes}
        >
          <IconGripVertical aria-hidden="true" size={18} />
        </button>
      </div>
      <button
        className="kanban-card-content"
        type="button"
        onClick={() => onOpen(task.id)}
      >
        <strong>{task.title}</strong>
        <span>{task.projectName ?? "Sin proyecto"}</span>
        <small className="kanban-assignee">
          {task.assigneeName ? (
            <InitialsAvatar
              displayName={task.assigneeName}
              size="small"
            />
          ) : null}
          {task.assigneeName ?? "Sin asignar"}
        </small>
      </button>
      <div className="kanban-card-meta">
        {task.status === "blocked" ? (
          <IconLock aria-label="Bloqueada" size={16} />
        ) : null}
        {isTaskOverdue(task, today) ? (
          <IconAlertTriangle aria-label="Vencida" size={16} />
        ) : null}
        <IconMessage aria-hidden="true" size={15} />
        <span>{task.dueDate ?? "Sin fecha"}</span>
      </div>
      {validTargets.length ? (
        <label className="kanban-move-control">
          <span className="sr-only">Mover {task.title}</span>
          <select
            value=""
            disabled={pending}
            onChange={(event) => {
              const status = event.target.value as TaskStatus;
              if (status) void onMove(task, status);
            }}
          >
            <option value="">Mover a…</option>
            {validTargets.map((status) => (
              <option value={status} key={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </article>
  );
}

function KanbanColumn({
  lane,
  status,
  tasks,
  today,
  pending,
  limit,
  statusLabels,
  onOpen,
  onMove,
  onWipLimitChange,
}: {
  lane: string;
  status: TaskStatus;
  tasks: TaskItem[];
  today: string;
  pending: boolean;
  limit: number;
  statusLabels: Record<TaskStatus, string>;
  onOpen: (taskId: string) => void;
  onMove: (task: TaskItem, status: TaskStatus) => Promise<boolean>;
  onWipLimitChange: (status: TaskStatus, limit: number) => void;
}) {
  const dropId = `${lane}::${status}`;
  const { isOver, setNodeRef } = useDroppable({ id: dropId });
  const atLimit = status !== "completed" && tasks.length >= limit;

  return (
    <section
      className={`kanban-column${isOver ? " is-over" : ""}${
        atLimit ? " is-at-limit" : ""
      }`}
      ref={setNodeRef}
      aria-label={`${statusLabels[status]}, ${tasks.length} tareas`}
    >
      <header className="kanban-column-header">
        <div>
          <strong>{statusLabels[status]}</strong>
          <span>{tasks.length}</span>
        </div>
        <label title="Máximo de tareas en esta columna">
          <span>Máximo</span>
          <input
            type="number"
            min={1}
            max={99}
            value={limit}
            disabled={status === "completed"}
            onChange={(event) =>
              onWipLimitChange(status, Number(event.target.value))
            }
          />
        </label>
      </header>
      <div className="kanban-column-body">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            today={today}
            pending={pending}
            statusLabels={statusLabels}
            onOpen={onOpen}
            onMove={onMove}
          />
        ))}
        {!tasks.length ? <span className="kanban-empty">Sin tareas</span> : null}
      </div>
    </section>
  );
}

export function TaskKanban({
  tasks,
  today,
  pending,
  swimlane,
  wipLimits,
  statusLabels,
  statusFilter,
  onOpen,
  onMove,
  onWipLimitChange,
  onStatusFilterChange,
}: TaskKanbanProps) {
  const [mobileStatus, setMobileStatus] = useState<TaskStatus>(
    statusFilter === "all" ? "pending" : statusFilter,
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const lanes = [...new Set(tasks.map((task) => laneFor(task, swimlane)))];
  const visibleStatuses = taskStatuses.filter(
    (status) => statusFilter === "all" || status === statusFilter,
  );

  const activeMobileStatus =
    statusFilter === "all" ? mobileStatus : statusFilter;

  async function handleDragEnd(event: DragEndEvent) {
    if (!event.over) return;
    const task = tasks.find((item) => item.id === event.active.id);
    const target = String(event.over.id).split("::").at(-1) as TaskStatus;
    if (!task || !taskStatuses.includes(target)) return;
    await onMove(task, target);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={(event) => void handleDragEnd(event)}
    >
      <div className="kanban-board">
        <label className="kanban-mobile-status">
          <span>Columna del tablero</span>
          <select
            value={activeMobileStatus}
            onChange={(event) => {
              const nextStatus = event.target.value as TaskStatus;
              setMobileStatus(nextStatus);
              if (statusFilter !== "all") onStatusFilterChange(nextStatus);
            }}
          >
            {taskStatuses.map((status) => (
              <option value={status} key={status}>
                {statusLabels[status]}
              </option>
            ))}
          </select>
        </label>
        {lanes.map((lane) => (
          <section className="kanban-swimlane" key={lane}>
            {swimlane !== "none" ? <h3>{lane}</h3> : null}
            <div
              className="kanban-columns"
              data-single-column={visibleStatuses.length === 1}
              key={`${lane}-${statusFilter}`}
            >
              {visibleStatuses.map((status) => (
                <div
                  className="kanban-column-slot"
                  data-mobile-active={
                    statusFilter !== "all" || status === activeMobileStatus
                  }
                  key={status}
                >
                  <KanbanColumn
                    lane={lane}
                    status={status}
                    tasks={tasks.filter(
                      (task) =>
                        laneFor(task, swimlane) === lane &&
                        task.status === status,
                    )}
                    today={today}
                    pending={pending}
                    limit={wipLimits[status]}
                    statusLabels={statusLabels}
                    onOpen={onOpen}
                    onMove={onMove}
                    onWipLimitChange={onWipLimitChange}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </DndContext>
  );
}
