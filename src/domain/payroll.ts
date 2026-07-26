import { z } from "zod";

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
  currency: PayrollCurrency;
  notes: string;
  status: PayrollStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
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
    notes: z.string().trim().max(1_000),
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
