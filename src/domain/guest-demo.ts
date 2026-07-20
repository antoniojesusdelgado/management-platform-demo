import type { ModuleId } from "@/domain/modules";
import {
  calculateBusinessDays,
  transitionLeaveRequest,
  type LeaveRequest,
  type LeaveRequestEvent,
  type LeaveRequestInput,
  type LeaveRequestStatus,
} from "@/domain/vacations";

export type GuestDemoState = {
  version: 1;
  activeModule: ModuleId;
  organizationName: string;
  leaveRequests: LeaveRequest[];
  leaveEvents: LeaveRequestEvent[];
};

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
  | { type: "rename-organization"; name: string }
  | { type: "reset" };

export const initialGuestDemoState: GuestDemoState = {
  version: 1,
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
};

function stableId(prefix: string, state: GuestDemoState) {
  return `${prefix}-${String(
    state.leaveRequests.length + state.leaveEvents.length + 1,
  ).padStart(3, "0")}`;
}

export function guestDemoReducer(
  state: GuestDemoState,
  action: GuestDemoAction,
): GuestDemoState {
  switch (action.type) {
    case "hydrate":
      return action.state.version === 1 ? action.state : state;
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
