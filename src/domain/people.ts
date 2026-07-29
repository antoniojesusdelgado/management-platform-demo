import { z } from "zod";
import type { LeaveRequest } from "@/domain/vacations";

export const personStatuses = ["invited", "active", "suspended", "inactive"] as const;
export const personRoleCodes = ["admin", "manager", "collaborator", "viewer"] as const;
export const employmentContractTypes = [
  "indefinite_ordinary",
  "permanent_discontinuous",
  "temporary_production",
  "temporary_substitution",
] as const;

export type PersonStatus = (typeof personStatuses)[number];
export type PersonRoleCode = (typeof personRoleCodes)[number];
export type EmploymentContractType = (typeof employmentContractTypes)[number];

export const employmentContractLabels: Record<EmploymentContractType, string> = {
  indefinite_ordinary: "Indefinido ordinario",
  permanent_discontinuous: "Indefinido fijo-discontinuo",
  temporary_production: "Temporal por circunstancias de la producción",
  temporary_substitution: "Temporal de sustitución",
};

export type Person = {
  id: string;
  displayName: string;
  team: string;
  positionTitle: string;
  managerPersonId?: string | null;
  employmentContractType: EmploymentContractType;
  employmentStartDate: string;
  employmentEndDate: string | null;
  status: PersonStatus;
  roleCode: PersonRoleCode;
  createdAt: string;
  updatedAt: string;
};

export type PersonEvent = {
  id: string;
  personId: string;
  kind: "created" | "updated" | "status" | "role";
  note: string;
  actorName: string;
  createdAt: string;
};

export const personInputSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  team: z.string().trim().min(2).max(100),
  positionTitle: z.string().trim().min(2).max(120),
  managerPersonId: z.string().nullable().optional(),
  employmentContractType: z.enum(employmentContractTypes),
  employmentStartDate: z.iso.date().default("2025-01-01"),
  employmentEndDate: z.iso.date().nullable().default(null),
  status: z.enum(personStatuses),
  roleCode: z.enum(personRoleCodes),
});

export type PersonInput = z.infer<typeof personInputSchema>;

export function getPersonAvailability(
  person: Person,
  leaveRequests: readonly LeaveRequest[],
  today: string,
) {
  if (person.status !== "active") return "unavailable" as const;
  const approvedAbsence = leaveRequests.some(
    (request) =>
      request.employeeName === person.displayName &&
      request.status === "approved" &&
      request.startDate <= today &&
      request.endDate >= today,
  );
  return approvedAbsence ? ("on_leave" as const) : ("available" as const);
}
