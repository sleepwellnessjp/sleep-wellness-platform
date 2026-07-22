import { createHmac } from "crypto";
import {
  appendDemoAuditLog,
  enqueueDemoWebhookDelivery,
  listDemoAuditLogs,
  listDemoDeliveries,
} from "./demo-store";
import type {
  ApiAuditLog,
  ApiAuthMethod,
  WebhookDelivery,
  WebhookEventType,
} from "./types";

export function signWebhookPayload(
  secret: string,
  body: string,
  timestamp: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

export function emitWebhookEvent(
  event: WebhookEventType,
  data: Record<string, unknown>,
): WebhookDelivery[] {
  const payload = {
    id: `evt_${Date.now().toString(36)}`,
    type: event,
    createdAt: new Date().toISOString(),
    data,
  };
  return enqueueDemoWebhookDelivery(event, payload);
}

export function recordApiAudit(input: {
  method: string;
  path: string;
  statusCode: number;
  authMethod: ApiAuthMethod | "none";
  apiKeyId?: string | null;
  userId?: string | null;
  role?: string | null;
  appName?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  durationMs: number;
  error?: string | null;
}): ApiAuditLog {
  return appendDemoAuditLog({
    method: input.method,
    path: input.path,
    statusCode: input.statusCode,
    authMethod: input.authMethod,
    apiKeyId: input.apiKeyId ?? null,
    userId: input.userId ?? null,
    role: input.role ?? null,
    appName: input.appName ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent ?? null,
    durationMs: input.durationMs,
    error: input.error ?? null,
  });
}

export function listApiAuditLogs(limit = 100): ApiAuditLog[] {
  return listDemoAuditLogs(limit);
}

export function listWebhookDeliveries(limit = 50): WebhookDelivery[] {
  return listDemoDeliveries(limit);
}
