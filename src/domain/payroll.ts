import { z } from "zod";
import { plainTextSchema } from "@/domain/validation";

export const payrollStatuses = [
  "collecting",
  "validating",
  "calculated",
  "reviewed",
  "closed",
] as const;

export const payrollCurrencies = ["EUR", "USD", "GBP"] as const;

export type PayrollStatus = (typeof payrollStatuses)[number];
export type PayrollCurrency = (typeof payrollCurrencies)[number];

export type PayrollRun = {
  id: string;
  periodStart: string;
  periodEnd: string;
  peopleCount: number;
  grossTotalCents: number;
  deductionTotalCents: number;
  netTotalCents: number;
  employerCostTotalCents?: number;
  currency: PayrollCurrency;
  notes: string;
  status: PayrollStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type PayrollBreakdown = {
  id: string;
  runId: string;
  team: string;
  peopleCount: number;
  grossTotalCents: number;
  employerCostTotalCents: number;
};

export type PayrollCheck = {
  id: string;
  runId: string;
  code: "headcount_variation" | "gross_variation" | "totals_consistency";
  severity: "info" | "warning" | "critical";
  status: "passed" | "review";
  summary: string;
};

export const payrollParticipantInclusionStatuses = [
  "included",
  "excluded",
] as const;
export const payrollParticipantValidationStatuses = [
  "validated",
  "pending",
  "review",
] as const;

export type PayrollParticipant = {
  id: string;
  runId: string;
  personId: string;
  personName: string;
  team: string;
  positionTitle: string;
  inclusionStatus: (typeof payrollParticipantInclusionStatuses)[number];
  validationStatus: (typeof payrollParticipantValidationStatuses)[number];
};

export type PayrollEvent = {
  id: string;
  runId: string;
  kind: "created" | "updated" | "status";
  fromStatus: PayrollStatus | null;
  toStatus: PayrollStatus;
  note: string;
  actorName: string;
  createdAt: string;
};

export const payrollInputSchema = z
  .object({
    periodStart: z.iso.date(),
    periodEnd: z.iso.date(),
    peopleCount: z.number().int().min(1).max(10_000),
    grossTotalCents: z.number().int().min(1).max(10_000_000_000),
    deductionTotalCents: z.number().int().min(0).max(10_000_000_000),
    currency: z.enum(payrollCurrencies),
    notes: plainTextSchema({ max: 1_000 }),
  })
  .refine((value) => value.periodEnd >= value.periodStart, {
    message: "El periodo finaliza antes de comenzar.",
    path: ["periodEnd"],
  })
  .refine((value) => value.deductionTotalCents <= value.grossTotalCents, {
    message: "Las deducciones no pueden superar el total bruto.",
    path: ["deductionTotalCents"],
  });

export type PayrollInput = z.infer<typeof payrollInputSchema>;

const nextPayrollStatus: Partial<Record<PayrollStatus, PayrollStatus>> = {
  collecting: "validating",
  validating: "calculated",
  calculated: "reviewed",
  reviewed: "closed",
};

export function canTransitionPayroll(from: PayrollStatus, to: PayrollStatus) {
  return nextPayrollStatus[from] === to;
}

export function transitionPayrollRun(
  run: PayrollRun,
  status: PayrollStatus,
  updatedAt: string,
): PayrollRun {
  if (!canTransitionPayroll(run.status, status)) {
    throw new Error(`Invalid Payroll transition: ${run.status} -> ${status}`);
  }
  return { ...run, status, updatedAt };
}

export function payrollNetTotal(input: Pick<PayrollInput, "grossTotalCents" | "deductionTotalCents">) {
  return input.grossTotalCents - input.deductionTotalCents;
}
