import { z } from "zod";
import { moduleIds, type ModuleId } from "@/domain/modules";
import {
  canTransitionTask,
  createsTaskDependencyCycle,
  taskPriorities,
  taskStatuses,
  transitionTask,
  type TaskComment,
  type TaskDependency,
  type TaskEvent,
  type TaskInput,
  type TaskItem,
  type TaskStatus,
} from "@/domain/tasks";
import {
  calculateBusinessDays,
  canTransitionLeaveRequest,
  leaveRequestStatuses,
  transitionLeaveRequest,
  type LeaveRequest,
  type LeaveRequestEvent,
  type LeaveRequestInput,
  type LeaveRequestStatus,
} from "@/domain/vacations";

export type GuestDemoState = {
  version: 2;
  activeModule: ModuleId;
  organizationName: string;
  leaveRequests: LeaveRequest[];
  leaveEvents: LeaveRequestEvent[];
  tasks: TaskItem[];
  taskDependencies: TaskDependency[];
  taskComments: TaskComment[];
  taskEvents: TaskEvent[];
};

const leaveRequestSchema = z.object({
  id: z.string().min(1),
  employeeName: z.string().min(1),
  startDate: z.iso.date(),
  endDate: z.iso.date(),
  businessDays: z.number().int().nonnegative(),
  type: z.enum(["vacation", "personal"]),
  reason: z.string(),
  status: z.enum(leaveRequestStatuses),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const leaveEventSchema = z.object({
  id: z.string().min(1),
  requestId: z.string().min(1),
  from: z.enum(leaveRequestStatuses).nullable(),
  to: z.enum(leaveRequestStatuses),
  note: z.string(),
  actorName: z.string().min(1),
  createdAt: z.iso.datetime(),
});

const guestDemoStateV1Schema = z.object({
  version: z.literal(1),
  activeModule: z.enum(moduleIds),
  organizationName: z.string().min(1),
  leaveRequests: z.array(leaveRequestSchema),
  leaveEvents: z.array(leaveEventSchema),
});

const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3).max(160),
  description: z.string().max(2_000),
  status: z.enum(taskStatuses),
  priority: z.enum(taskPriorities),
  assigneeName: z.string().min(2).max(100).nullable(),
  dueDate: z.iso.date().nullable(),
  createdBy: z.string().min(1),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const taskDependencySchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  dependsOnTaskId: z.string().min(1),
  createdAt: z.iso.datetime(),
});

const taskCommentSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  authorName: z.string().min(1),
  body: z.string().min(2).max(1_000),
  createdAt: z.iso.datetime(),
});

const taskEventSchema = z.object({
  id: z.string().min(1),
  taskId: z.string().min(1),
  kind: z.enum(["created", "updated", "assigned", "status", "comment", "dependency"]),
  fromStatus: z.enum(taskStatuses).nullable(),
  toStatus: z.enum(taskStatuses).nullable(),
  note: z.string().min(1).max(1_000),
  actorName: z.string().min(1),
  createdAt: z.iso.datetime(),
});

export const guestDemoStateSchema = guestDemoStateV1Schema.extend({
  version: z.literal(2),
  tasks: z.array(taskSchema),
  taskDependencies: z.array(taskDependencySchema),
  taskComments: z.array(taskCommentSchema),
  taskEvents: z.array(taskEventSchema),
});

export function parseGuestDemoState(value: unknown): GuestDemoState | null {
  const result = guestDemoStateSchema.safeParse(value);
  if (result.success) return result.data;

  const legacy = guestDemoStateV1Schema.safeParse(value);
  if (!legacy.success) return null;
  return {
    ...legacy.data,
    version: 2,
    ...createInitialTaskState(),
  };
}

export type GuestDemoAction =
  | { type: "hydrate"; state: GuestDemoState }
  | { type: "navigate"; module: ModuleId }
  | { type: "create-leave"; input: LeaveRequestInput }
  | {
      type: "transition-leave";
      requestId: string;
      status: LeaveRequestStatus;
      note: string;
    }
  | { type: "create-task"; input: TaskInput }
  | { type: "update-task"; taskId: string; input: TaskInput }
  | { type: "transition-task"; taskId: string; status: TaskStatus; note: string }
  | { type: "add-task-comment"; taskId: string; body: string }
  | { type: "add-task-dependency"; taskId: string; dependsOnTaskId: string }
  | { type: "rename-organization"; name: string }
  | { type: "reset" };

function createInitialTaskState(): Pick<
  GuestDemoState,
  "tasks" | "taskDependencies" | "taskComments" | "taskEvents"
> {
  return {
    tasks: [
      {
        id: "task-001",
        title: "Preparar el informe semanal",
        description: "Consolidar los avances sintéticos del equipo y preparar la revisión.",
        status: "in_progress",
        priority: "high",
        assigneeName: "Usuario invitado",
        dueDate: "2026-07-24",
        createdBy: "Responsable demo",
        createdAt: "2026-07-18T08:30:00.000Z",
        updatedAt: "2026-07-21T10:15:00.000Z",
      },
      {
        id: "task-002",
        title: "Validar la documentación técnica",
        description: "Comprobar estructura, enlaces y ejemplos completamente sintéticos.",
        status: "pending",
        priority: "medium",
        assigneeName: "Elena Martín",
        dueDate: "2026-07-29",
        createdBy: "Responsable demo",
        createdAt: "2026-07-19T09:00:00.000Z",
        updatedAt: "2026-07-19T09:00:00.000Z",
      },
      {
        id: "task-003",
        title: "Revisar el flujo de permisos",
        description: "Verificar la matriz demostrativa antes de pasar el cambio a revisión.",
        status: "blocked",
        priority: "urgent",
        assigneeName: "Usuario invitado",
        dueDate: "2026-07-23",
        createdBy: "Responsable demo",
        createdAt: "2026-07-17T12:00:00.000Z",
        updatedAt: "2026-07-21T16:40:00.000Z",
      },
      {
        id: "task-004",
        title: "Publicar notas de la iteración",
        description: "Preparar un resumen interno sin referencias a proyectos u organizaciones reales.",
        status: "in_review",
        priority: "low",
        assigneeName: null,
        dueDate: null,
        createdBy: "Responsable demo",
        createdAt: "2026-07-20T10:00:00.000Z",
        updatedAt: "2026-07-22T08:10:00.000Z",
      },
    ],
    taskDependencies: [
      {
        id: "dependency-001",
        taskId: "task-004",
        dependsOnTaskId: "task-002",
        createdAt: "2026-07-20T10:05:00.000Z",
      },
    ],
    taskComments: [
      {
        id: "comment-001",
        taskId: "task-003",
        authorName: "Usuario invitado",
        body: "Pendiente de confirmar el alcance de permisos demostrativos.",
        createdAt: "2026-07-21T16:40:00.000Z",
      },
    ],
    taskEvents: [
      {
        id: "task-event-001",
        taskId: "task-003",
        kind: "status",
        fromStatus: "in_progress",
        toStatus: "blocked",
        note: "Bloqueada hasta validar el alcance sintético.",
        actorName: "Usuario invitado",
        createdAt: "2026-07-21T16:40:00.000Z",
      },
    ],
  };
}

export const initialGuestDemoState: GuestDemoState = {
  version: 2,
  activeModule: "inicio",
  organizationName: "Organización demo",
  leaveRequests: [
    {
      id: "leave-001",
      employeeName: "Elena Martín",
      startDate: "2026-08-03",
      endDate: "2026-08-07",
      businessDays: 5,
      type: "vacation",
      reason: "Descanso anual planificado.",
      status: "submitted",
      createdAt: "2026-07-18T09:20:00.000Z",
      updatedAt: "2026-07-18T09:20:00.000Z",
    },
    {
      id: "leave-002",
      employeeName: "Diego Santos",
      startDate: "2026-07-24",
      endDate: "2026-07-24",
      businessDays: 1,
      type: "personal",
      reason: "Gestión personal programada.",
      status: "approved",
      createdAt: "2026-07-11T08:30:00.000Z",
      updatedAt: "2026-07-12T10:15:00.000Z",
    },
    {
      id: "leave-003",
      employeeName: "Marta Soler",
      startDate: "2026-09-14",
      endDate: "2026-09-18",
      businessDays: 5,
      type: "vacation",
      reason: "Descanso anual pendiente de revisión.",
      status: "draft",
      createdAt: "2026-07-19T12:05:00.000Z",
      updatedAt: "2026-07-19T12:05:00.000Z",
    },
  ],
  leaveEvents: [
    {
      id: "event-001",
      requestId: "leave-001",
      from: null,
      to: "submitted",
      note: "Solicitud registrada en la demo.",
      actorName: "Elena Martín",
      createdAt: "2026-07-18T09:20:00.000Z",
    },
    {
      id: "event-002",
      requestId: "leave-002",
      from: "submitted",
      to: "approved",
      note: "Cobertura del equipo validada.",
      actorName: "Responsable demo",
      createdAt: "2026-07-12T10:15:00.000Z",
    },
  ],
  ...createInitialTaskState(),
};

function stableId(prefix: string, state: GuestDemoState) {
  return `${prefix}-${String(
    state.leaveRequests.length +
      state.leaveEvents.length +
      state.tasks.length +
      state.taskDependencies.length +
      state.taskComments.length +
      state.taskEvents.length +
      1,
  ).padStart(3, "0")}`;
}

export function guestDemoReducer(
  state: GuestDemoState,
  action: GuestDemoAction,
): GuestDemoState {
  switch (action.type) {
    case "hydrate":
      return action.state.version === 2 ? action.state : state;
    case "navigate":
      return { ...state, activeModule: action.module };
    case "create-leave": {
      const createdAt = new Date().toISOString();
      const id = stableId("leave", state);
      const request: LeaveRequest = {
        id,
        employeeName: "Usuario invitado",
        ...action.input,
        businessDays: calculateBusinessDays(
          action.input.startDate,
          action.input.endDate,
        ),
        status: "submitted",
        createdAt,
        updatedAt: createdAt,
      };

      return {
        ...state,
        leaveRequests: [request, ...state.leaveRequests],
        leaveEvents: [
          {
            id: stableId("event", state),
            requestId: id,
            from: null,
            to: "submitted",
            note: "Solicitud creada en modo invitado.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.leaveEvents,
        ],
      };
    }
    case "transition-leave": {
      const current = state.leaveRequests.find(
        (request) => request.id === action.requestId,
      );

      if (!current) return state;
      if (!canTransitionLeaveRequest(current.status, action.status)) return state;

      const createdAt = new Date().toISOString();
      const updated = transitionLeaveRequest(
        current,
        action.status,
        createdAt,
      );

      return {
        ...state,
        leaveRequests: state.leaveRequests.map((request) =>
          request.id === updated.id ? updated : request,
        ),
        leaveEvents: [
          {
            id: stableId("event", state),
            requestId: updated.id,
            from: current.status,
            to: updated.status,
            note: action.note,
            actorName: "Responsable demo",
            createdAt,
          },
          ...state.leaveEvents,
        ],
      };
    }
    case "create-task": {
      const createdAt = new Date().toISOString();
      const id = stableId("task", state);
      const task: TaskItem = {
        id,
        ...action.input,
        status: "pending",
        createdBy: "Usuario invitado",
        createdAt,
        updatedAt: createdAt,
      };
      return {
        ...state,
        tasks: [task, ...state.tasks],
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: id,
            kind: "created",
            fromStatus: null,
            toStatus: "pending",
            note: "Tarea creada en modo invitado.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
      };
    }
    case "update-task": {
      const current = state.tasks.find((task) => task.id === action.taskId);
      if (!current) return state;
      const createdAt = new Date().toISOString();
      const assignmentChanged = current.assigneeName !== action.input.assigneeName;
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.taskId
            ? { ...task, ...action.input, updatedAt: createdAt }
            : task,
        ),
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: action.taskId,
            kind: assignmentChanged ? "assigned" : "updated",
            fromStatus: current.status,
            toStatus: current.status,
            note: assignmentChanged
              ? `Responsable actualizado a ${action.input.assigneeName ?? "Sin asignar"}.`
              : "Datos de la tarea actualizados.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
      };
    }
    case "transition-task": {
      const current = state.tasks.find((task) => task.id === action.taskId);
      if (!current || !canTransitionTask(current.status, action.status)) return state;
      const createdAt = new Date().toISOString();
      const updated = transitionTask(current, action.status, createdAt);
      return {
        ...state,
        tasks: state.tasks.map((task) =>
          task.id === action.taskId ? updated : task,
        ),
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: action.taskId,
            kind: "status",
            fromStatus: current.status,
            toStatus: action.status,
            note: action.note.trim(),
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
      };
    }
    case "add-task-comment": {
      if (!state.tasks.some((task) => task.id === action.taskId)) return state;
      const body = action.body.trim();
      if (body.length < 2 || body.length > 1_000) return state;
      const createdAt = new Date().toISOString();
      return {
        ...state,
        taskComments: [
          {
            id: stableId("comment", state),
            taskId: action.taskId,
            authorName: "Usuario invitado",
            body,
            createdAt,
          },
          ...state.taskComments,
        ],
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: action.taskId,
            kind: "comment",
            fromStatus: null,
            toStatus: null,
            note: "Comentario añadido.",
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
      };
    }
    case "add-task-dependency": {
      const exists = state.tasks.some((task) => task.id === action.taskId);
      const targetExists = state.tasks.some(
        (task) => task.id === action.dependsOnTaskId,
      );
      const duplicate = state.taskDependencies.some(
        (dependency) =>
          dependency.taskId === action.taskId &&
          dependency.dependsOnTaskId === action.dependsOnTaskId,
      );
      if (
        !exists ||
        !targetExists ||
        duplicate ||
        createsTaskDependencyCycle(
          state.taskDependencies,
          action.taskId,
          action.dependsOnTaskId,
        )
      ) {
        return state;
      }
      const createdAt = new Date().toISOString();
      const target = state.tasks.find(
        (task) => task.id === action.dependsOnTaskId,
      )!;
      return {
        ...state,
        taskDependencies: [
          {
            id: stableId("dependency", state),
            taskId: action.taskId,
            dependsOnTaskId: action.dependsOnTaskId,
            createdAt,
          },
          ...state.taskDependencies,
        ],
        taskEvents: [
          {
            id: stableId("task-event", state),
            taskId: action.taskId,
            kind: "dependency",
            fromStatus: null,
            toStatus: null,
            note: `Dependencia añadida: ${target.title}.`,
            actorName: "Usuario invitado",
            createdAt,
          },
          ...state.taskEvents,
        ],
      };
    }
    case "rename-organization":
      return {
        ...state,
        organizationName: action.name.trim() || state.organizationName,
      };
    case "reset":
      return structuredClone(initialGuestDemoState);
    default:
      return state;
  }
}

export interface GuestDemoRepository {
  load(): GuestDemoState;
  save(state: GuestDemoState): void;
  reset(): GuestDemoState;
}
