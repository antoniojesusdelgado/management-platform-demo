import { z } from "zod";

export const incidentStatuses = [
  "registered",
  "triaged",
  "assigned",
  "investigating",
  "resolved",
  "closed",
] as const;

export const incidentPriorities = ["low", "medium", "high", "critical"] as const;
export const incidentCategories = ["access", "data", "hardware", "software", "other"] as const;

export type IncidentStatus = (typeof incidentStatuses)[number];
export type IncidentPriority = (typeof incidentPriorities)[number];
export type IncidentCategory = (typeof incidentCategories)[number];

export type Incident = {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  priority: IncidentPriority;
  category: IncidentCategory;
  requesterName: string;
  assigneeName: string | null;
  slaDueAt: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IncidentEvent = {
  id: string;
  incidentId: string;
  kind: "created" | "updated" | "assigned" | "status" | "priority";
  fromStatus: IncidentStatus | null;
  toStatus: IncidentStatus | null;
  note: string;
  actorName: string;
  createdAt: string;
};

export const incidentInputSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(3).max(2_000),
  priority: z.enum(incidentPriorities),
  category: z.enum(incidentCategories),
  assigneeName: z.string().trim().min(2).max(100).nullable(),
});

export type IncidentInput = z.infer<typeof incidentInputSchema>;

const allowedTransitions: Record<IncidentStatus, readonly IncidentStatus[]> = {
  registered: ["triaged"],
  triaged: ["assigned"],
  assigned: ["investigating"],
  investigating: ["resolved"],
  resolved: ["closed", "investigating"],
  closed: [],
};

const slaHours: Record<IncidentPriority, number> = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 120,
};

export function canTransitionIncident(from: IncidentStatus, to: IncidentStatus) {
  return allowedTransitions[from].includes(to);
}

export function transitionIncident(
  incident: Incident,
  status: IncidentStatus,
  updatedAt = new Date().toISOString(),
  note?: string,
): Incident {
  if (!canTransitionIncident(incident.status, status)) {
    throw new Error("Invalid incident transition");
  }
  if (status === "assigned" && !incident.assigneeName) {
    throw new Error("Incident assignment required");
  }
  return {
    ...incident,
    status,
    resolution:
      status === "resolved"
        ? note?.trim() || incident.resolution
        : status === "investigating" && incident.status === "resolved"
          ? null
          : incident.resolution,
    updatedAt,
  };
}

export function calculateSyntheticSlaDueAt(
  priority: IncidentPriority,
  createdAt = new Date().toISOString(),
) {
  return new Date(new Date(createdAt).getTime() + slaHours[priority] * 60 * 60 * 1_000).toISOString();
}

export function isIncidentOverdue(incident: Incident, now = new Date().toISOString()) {
  return incident.slaDueAt < now && !["resolved", "closed"].includes(incident.status);
}
