/** Sleep Wellness API Platform — Version 4.0 contracts. */

export type ApiKeyStatus = "active" | "revoked" | "expired";

export type ApiKeyScope =
  | "clients:read"
  | "clients:write"
  | "analysis:read"
  | "analysis:write"
  | "journey:read"
  | "homework:read"
  | "homework:write"
  | "sleep-coach:read"
  | "academy:read"
  | "events:read"
  | "reports:read"
  | "webhooks:manage"
  | "*";

export type ApiAuthMethod = "api_key" | "jwt" | "role";

export type WebhookEventType =
  | "AnalysisCompleted"
  | "HomeworkCompleted"
  | "ScoreUpdated"
  | "JourneyUpdated"
  | "CertificateIssued";

export type ApiKeyRecord = {
  id: string;
  name: string;
  /** Prefixed public identifier (safe to display). */
  keyPrefix: string;
  /** Full key shown only once at issuance. */
  keyHash: string;
  appName: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  rateLimitPerMinute: number;
  usageCount: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
  revokedAt: string | null;
};

/** Row for Developer Dashboard (never exposes hash). */
export type ApiKeyDashboardRow = {
  id: string;
  name: string;
  keyPrefix: string;
  /** Masked display e.g. swij_live_••••abcd */
  maskedKey: string;
  appName: string;
  scopes: ApiKeyScope[];
  status: ApiKeyStatus;
  rateLimitPerMinute: number;
  usageCount: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type IssuedApiKey = ApiKeyDashboardRow & {
  /** Plaintext key — only returned on create. */
  apiKey: string;
};

export type WebhookEndpoint = {
  id: string;
  url: string;
  secret: string;
  events: WebhookEventType[];
  active: boolean;
  description: string;
  createdAt: string;
  lastDeliveryAt: string | null;
  failureCount: number;
};

export type WebhookDelivery = {
  id: string;
  webhookId: string;
  event: WebhookEventType;
  payload: Record<string, unknown>;
  status: "pending" | "delivered" | "failed";
  attempts: number;
  responseStatus: number | null;
  createdAt: string;
  deliveredAt: string | null;
};

export type ApiAuditLog = {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  authMethod: ApiAuthMethod | "none";
  apiKeyId: string | null;
  userId: string | null;
  role: string | null;
  appName: string | null;
  ip: string | null;
  userAgent: string | null;
  durationMs: number;
  error: string | null;
  createdAt: string;
};

export type RateLimitConfig = {
  defaultPerMinute: number;
  burstPerMinute: number;
  authenticatedPerMinute: number;
};

export type RateLimitState = {
  limit: number;
  remaining: number;
  resetAt: number;
  allowed: boolean;
};

export type ApiPrincipal = {
  authMethod: ApiAuthMethod;
  userId: string | null;
  role: string | null;
  apiKey: ApiKeyRecord | null;
  scopes: ApiKeyScope[];
};

export type DeveloperDashboardStats = {
  totalKeys: number;
  activeKeys: number;
  totalRequests: number;
  requestsLast24h: number;
  webhookEndpoints: number;
  auditEventsLast24h: number;
};

export const ALL_API_SCOPES: ApiKeyScope[] = [
  "clients:read",
  "clients:write",
  "analysis:read",
  "analysis:write",
  "journey:read",
  "homework:read",
  "homework:write",
  "sleep-coach:read",
  "academy:read",
  "events:read",
  "reports:read",
  "webhooks:manage",
  "*",
];

export const WEBHOOK_EVENTS: WebhookEventType[] = [
  "AnalysisCompleted",
  "HomeworkCompleted",
  "ScoreUpdated",
  "JourneyUpdated",
  "CertificateIssued",
];

export const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  defaultPerMinute: 60,
  burstPerMinute: 120,
  authenticatedPerMinute: 300,
};
