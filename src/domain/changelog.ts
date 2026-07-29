import { z } from "zod";
import { plainTextSchema } from "@/domain/validation";

export const changelogStatuses = ["draft", "in_review", "published"] as const;
export type ChangelogStatus = (typeof changelogStatuses)[number];

export type ChangelogEntry = {
  id: string;
  version: string;
  title: string;
  summary: string;
  status: ChangelogStatus;
  createdBy: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ChangelogEvent = {
  id: string;
  entryId: string;
  fromStatus: ChangelogStatus | null;
  toStatus: ChangelogStatus;
  note: string;
  actorName: string;
  createdAt: string;
};

export const changelogInputSchema = z.object({
  version: z.string().trim().min(1).max(30).regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/),
  title: plainTextSchema({ min: 3, max: 120 }),
  summary: plainTextSchema({ min: 8, max: 1_000 }),
});

export type ChangelogInput = z.infer<typeof changelogInputSchema>;

const allowedTransitions: Record<ChangelogStatus, readonly ChangelogStatus[]> = {
  draft: ["in_review"],
  in_review: ["draft", "published"],
  published: [],
};

export function canTransitionChangelog(from: ChangelogStatus, to: ChangelogStatus) {
  return allowedTransitions[from].includes(to);
}

export function transitionChangelog(
  entry: ChangelogEntry,
  status: ChangelogStatus,
  updatedAt = new Date().toISOString(),
) {
  if (!canTransitionChangelog(entry.status, status)) {
    throw new Error("Invalid changelog transition");
  }
  return {
    ...entry,
    status,
    publishedAt: status === "published" ? updatedAt : entry.publishedAt,
    updatedAt,
  };
}
