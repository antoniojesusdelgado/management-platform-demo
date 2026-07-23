import { z } from "zod";

export const treasuryStatuses = [
  "draft",
  "registered",
  "reconciled",
  "validated",
  "closed",
] as const;

export const treasuryCurrencies = ["EUR", "USD", "GBP"] as const;

export type TreasuryStatus = (typeof treasuryStatuses)[number];
export type TreasuryCurrency = (typeof treasuryCurrencies)[number];

export type TreasuryEntry = {
  id: string;
  entryDate: string;
  concept: string;
  amountCents: number;
  currency: TreasuryCurrency;
  status: TreasuryStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TreasuryEvent = {
  id: string;
  entryId: string;
  kind: "created" | "updated" | "status";
  fromStatus: TreasuryStatus | null;
  toStatus: TreasuryStatus;
  note: string;
  actorName: string;
  createdAt: string;
};

export const treasuryInputSchema = z.object({
  entryDate: z.iso.date(),
  concept: z.string().trim().min(3).max(160),
  amountCents: z
    .number()
    .int()
    .min(-100_000_000)
    .max(100_000_000)
    .refine((amount) => amount !== 0, "El importe no puede ser cero."),
  currency: z.enum(treasuryCurrencies),
});

export type TreasuryInput = z.infer<typeof treasuryInputSchema>;

const nextTreasuryStatus: Partial<Record<TreasuryStatus, TreasuryStatus>> = {
  draft: "registered",
  registered: "reconciled",
  reconciled: "validated",
  validated: "closed",
};

export function canTransitionTreasury(
  from: TreasuryStatus,
  to: TreasuryStatus,
): boolean {
  return nextTreasuryStatus[from] === to;
}

export function transitionTreasuryEntry(
  entry: TreasuryEntry,
  status: TreasuryStatus,
  updatedAt: string,
): TreasuryEntry {
  if (!canTransitionTreasury(entry.status, status)) {
    throw new Error(`Invalid Treasury transition: ${entry.status} -> ${status}`);
  }

  return { ...entry, status, updatedAt };
}
