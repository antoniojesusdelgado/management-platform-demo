import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { WorkspaceProvider } from "@/domain/operations";

export function getWorkspaceOAuthOrigin(requestUrl: string) {
  const requestOrigin = new URL(requestUrl).origin;
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured) return process.env.NODE_ENV === "production" ? null : requestOrigin;
  try {
    const configuredOrigin = new URL(configured).origin;
    return configuredOrigin === requestOrigin ? configuredOrigin : null;
  } catch {
    return null;
  }
}

export function signOAuthState(provider: WorkspaceProvider, nonce: string, verifier: string, origin: string, userId: string, organizationId: string) {
  const key = getStateEncryptionKey();
  if (!key) throw new Error("WORKSPACE_OAUTH_STATE_SECRET is not configured");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const payload = Buffer.from(JSON.stringify({ provider, nonce, verifier, origin, userId, organizationId, issuedAt: Date.now() }), "utf8");
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  return `${iv.toString("base64url")}.${encrypted.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function verifyOAuthState(value: string, provider: WorkspaceProvider, origin: string, userId: string, organizationId: string) {
  const key = getStateEncryptionKey();
  if (!key) return null;
  const [encodedIv, encodedPayload, encodedTag] = value.split(".");
  if (!encodedIv || !encodedPayload || !encodedTag) return null;
  try {
    const iv = Buffer.from(encodedIv, "base64url");
    const tag = Buffer.from(encodedTag, "base64url");
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const payload = Buffer.concat([decipher.update(Buffer.from(encodedPayload, "base64url")), decipher.final()]);
    const parsed = JSON.parse(payload.toString("utf8")) as { provider?: string; nonce?: string; verifier?: string; origin?: string; userId?: string; organizationId?: string; issuedAt?: number };
    const age = typeof parsed.issuedAt === "number" ? Date.now() - parsed.issuedAt : -1;
    const valid = parsed.provider === provider
      && typeof parsed.nonce === "string"
      && parsed.nonce.length >= 24
      && typeof parsed.verifier === "string"
      && parsed.verifier.length >= 43
      && parsed.origin === origin
      && parsed.userId === userId
      && parsed.organizationId === organizationId
      && age >= 0
      && age < 10 * 60_000;
    return valid ? parsed.verifier : null;
  } catch {
    return null;
  }
}

function getStateEncryptionKey() {
  const encodedKey = process.env.WORKSPACE_OAUTH_STATE_SECRET;
  if (!encodedKey) return null;
  const key = Buffer.from(encodedKey, "base64url");
  return key.length === 32 ? key : null;
}
