import {
  eachDayOfInterval,
  isAfter,
  isWeekend,
  isWithinInterval,
  parseISO,
} from "date-fns";
import { z } from "zod";
import { plainTextSchema } from "@/domain/validation";

export const leaveRequestStatuses = [
  "draft",
  "submitted",
  "approved",
  "rejected",
  "cancelled",
] as const;

export type LeaveRequestStatus = (typeof leaveRequestStatuses)[number];

export type LeaveRequestEvent = {
  id: string;
  requestId: string;
  from: LeaveRequestStatus | null;
  to: LeaveRequestStatus;
  note: string;
  actorName: string;
  createdAt: string;
};

export type LeaveRequest = {
  id: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  businessDays: number;
  type: "vacation" | "personal";
  reason: string;
  status: LeaveRequestStatus;
  createdAt: string;
  updatedAt: string;
};

export const leaveRequestInputSchema = z
  .object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
    type: z.enum(["vacation", "personal"]),
    reason: plainTextSchema({ min: 8, max: 300 }),
  })
  .superRefine((value, context) => {
    if (isAfter(parseISO(value.startDate), parseISO(value.endDate))) {
      context.addIssue({
        code: "custom",
        message: "La fecha final debe ser posterior a la inicial.",
        path: ["endDate"],
      });
    }
  });

export type LeaveRequestInput = z.infer<typeof leaveRequestInputSchema>;

const allowedTransitions: Record<LeaveRequestStatus, LeaveRequestStatus[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["approved", "rejected", "cancelled"],
  approved: ["cancelled"],
  rejected: [],
  cancelled: [],
};

export function canTransitionLeaveRequest(
  from: LeaveRequestStatus,
  to: LeaveRequestStatus,
): boolean {
  return allowedTransitions[from].includes(to);
}

export function transitionLeaveRequest(
  request: LeaveRequest,
  to: LeaveRequestStatus,
  now: string,
): LeaveRequest {
  if (!canTransitionLeaveRequest(request.status, to)) {
    throw new Error(`Invalid leave transition: ${request.status} -> ${to}`);
  }

  return { ...request, status: to, updatedAt: now };
}

export function calculateBusinessDays(startDate: string, endDate: string) {
  return eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  }).filter((date) => !isWeekend(date)).length;
}

export function getActiveLeaveRequestsForDate(
  requests: LeaveRequest[],
  date: Date,
) {
  return requests.filter(
    (request) =>
      (request.status === "submitted" || request.status === "approved") &&
      isWithinInterval(date, {
        start: parseISO(request.startDate),
        end: parseISO(request.endDate),
      }),
  );
}
