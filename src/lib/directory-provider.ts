import "server-only";

import { z } from "zod";
import type { WorkspaceProvider } from "@/domain/operations";

const directoryUserSchema = z.object({
  externalId: z.string().min(1).max(240),
  primaryEmail: z.email().max(254).transform((value) => value.toLowerCase()),
  displayName: z.string().trim().min(2).max(160),
  externalTeam: z.string().trim().max(160).nullable(),
  status: z.enum(["active", "suspended", "deleted"]),
  externalVersion: z.string().max(240).nullable(),
});

export type DirectoryUser = z.infer<typeof directoryUserSchema>;
export type DirectoryPage = { users: DirectoryUser[]; cursor: string | null; complete: boolean };

export async function loadDirectoryPage(
  provider: WorkspaceProvider,
  accessToken: string,
  cursor?: string | null,
): Promise<DirectoryPage> {
  return provider === "google_workspace"
    ? loadGoogleDirectoryPage(accessToken, cursor)
    : loadMicrosoftDirectoryPage(accessToken, cursor);
}

async function loadGoogleDirectoryPage(accessToken: string, cursor?: string | null): Promise<DirectoryPage> {
  const url = new URL("https://admin.googleapis.com/admin/directory/v1/users");
  url.searchParams.set("customer", "my_customer");
  url.searchParams.set("maxResults", "100");
  url.searchParams.set("orderBy", "email");
  if (cursor) url.searchParams.set("pageToken", cursor);
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`google_directory_failed:${response.status}`);
  const payload = await response.json() as {
    users?: Array<{ id?: string; primaryEmail?: string; name?: { fullName?: string }; suspended?: boolean; orgUnitPath?: string; etag?: string }>;
    nextPageToken?: string;
  };
  const users = (payload.users ?? []).flatMap((user) => {
    const parsed = directoryUserSchema.safeParse({
      externalId: user.id,
      primaryEmail: user.primaryEmail,
      displayName: user.name?.fullName,
      externalTeam: user.orgUnitPath?.replace(/^\//, "") || null,
      status: user.suspended ? "suspended" : "active",
      externalVersion: user.etag ?? null,
    });
    return parsed.success ? [parsed.data] : [];
  });
  return { users, cursor: payload.nextPageToken ?? null, complete: !payload.nextPageToken };
}

async function loadMicrosoftDirectoryPage(accessToken: string, cursor?: string | null): Promise<DirectoryPage> {
  const url = cursor?.startsWith("https://graph.microsoft.com/")
    ? cursor
    : "https://graph.microsoft.com/v1.0/users/delta?$select=id,displayName,mail,userPrincipalName,accountEnabled,department";
  const response = await fetch(url, { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) throw new Error(`microsoft_directory_failed:${response.status}`);
  const payload = await response.json() as {
    value?: Array<{ id?: string; displayName?: string; mail?: string; userPrincipalName?: string; accountEnabled?: boolean; department?: string; "@removed"?: { reason?: string } }>;
    "@odata.nextLink"?: string;
    "@odata.deltaLink"?: string;
  };
  const users = (payload.value ?? []).flatMap((user) => {
    const email = user.mail ?? user.userPrincipalName;
    const parsed = directoryUserSchema.safeParse({
      externalId: user.id,
      primaryEmail: email,
      displayName: user.displayName ?? email,
      externalTeam: user.department ?? null,
      status: user["@removed"] ? "deleted" : user.accountEnabled === false ? "suspended" : "active",
      externalVersion: null,
    });
    return parsed.success ? [parsed.data] : [];
  });
  const next = payload["@odata.nextLink"] ?? payload["@odata.deltaLink"] ?? null;
  return { users, cursor: next, complete: Boolean(payload["@odata.deltaLink"]) };
}
