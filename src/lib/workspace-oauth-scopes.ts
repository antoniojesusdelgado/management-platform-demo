import type { OAuthGrantPurpose, WorkspaceProvider } from "@/domain/operations";

export function getWorkspaceOAuthScopes(
  provider: WorkspaceProvider,
  purpose: Exclude<OAuthGrantPurpose, "sign_in">,
) {
  if (provider === "google_workspace") {
    return purpose === "directory"
      ? ["openid", "email", "https://www.googleapis.com/auth/admin.directory.user.readonly"]
      : ["openid", "email", "https://www.googleapis.com/auth/drive.file", "https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/calendar.events"];
  }
  return purpose === "directory"
    ? ["openid", "email", "offline_access", "User.Read", "User.Read.All"]
    : ["openid", "email", "offline_access", "User.Read", "Files.ReadWrite", "Calendars.ReadWrite"];
}
