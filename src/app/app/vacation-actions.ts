"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { LeaveRequestInput } from "@/domain/vacations";
import { leaveRequestInputSchema } from "@/domain/vacations";
import { requirePermission } from "@/lib/authorization";
import { createClient } from "@/lib/supabase/server";

const transitionSchema = z.object({
  requestId: z.uuid(),
  status: z.enum(["approved", "rejected", "cancelled"]),
  note: z.string().trim().min(3).max(300),
});

export async function createLeaveRequestAction(input: LeaveRequestInput) {
  const payload = leaveRequestInputSchema.parse(input);
  const access = await requirePermission("vacations.requests.create");
  const supabase = await createClient();
  const { error } = await supabase.from("leave_requests").insert({
    organization_id: access.organizationId,
    profile_id: access.userId,
    start_date: payload.startDate,
    end_date: payload.endDate,
    leave_type: payload.type,
    reason: payload.reason,
    status: "submitted",
  });

  if (error) throw new Error("Unable to create leave request");
  revalidatePath("/app/vacaciones");
}

export async function transitionLeaveRequestAction(input: {
  requestId: string;
  status: "approved" | "rejected" | "cancelled";
  note: string;
}) {
  const payload = transitionSchema.parse(input);
  const access = await requirePermission("vacations.requests.approve");
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_leave_request", {
    target_request_id: payload.requestId,
    target_status: payload.status,
    transition_note: payload.note,
    expected_organization_id: access.organizationId,
  });

  if (error) throw new Error("Unable to update leave request");
  revalidatePath("/app/vacaciones");
}
