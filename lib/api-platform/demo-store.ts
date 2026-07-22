import { createHash, randomBytes, timingSafeEqual } from "crypto";
import type {
  ApiAuditLog,
  ApiKeyDashboardRow,
  ApiKeyRecord,
  ApiKeyScope,
  IssuedApiKey,
  RateLimitConfig,
  WebhookDelivery,
  WebhookEndpoint,
  WebhookEventType,
} from "./types";
import { DEFAULT_RATE_LIMIT, WEBHOOK_EVENTS } from "./types";

const KEY_PREFIX = "swij_live_";

function nowIso() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

export function hashApiKey(plain: string): string {
  return createHash("sha256").update(plain).digest("hex");
}

export function generateApiKeyPlain(): { plain: string; prefix: string } {
  const secret = randomBytes(24).toString("base64url");
  const plain = `${KEY_PREFIX}${secret}`;
  const prefix = plain.slice(0, 16);
  return { plain, prefix };
}

export function maskApiKey(prefix: string): string {
  return `${prefix}••••`;
}

function toDashboardRow(record: ApiKeyRecord): ApiKeyDashboardRow {
  return {
    id: record.id,
    name: record.name,
    keyPrefix: record.keyPrefix,
    maskedKey: maskApiKey(record.keyPrefix),
    appName: record.appName,
    scopes: record.scopes,
    status: record.status,
    rateLimitPerMinute: record.rateLimitPerMinute,
    usageCount: record.usageCount,
    lastUsedAt: record.lastUsedAt,
    expiresAt: record.expiresAt,
    createdAt: record.createdAt,
  };
}

function seedKeys(): ApiKeyRecord[] {
  const { plain, prefix } = generateApiKeyPlain();
  // Stable demo key for docs / local testing
  const demoPlain = "swij_live_demo_platform_key_v4";
  const demoPrefix = demoPlain.slice(0, 16);
  return [
    {
      id: "key_demo_partner",
      name: "Partner Integration",
      keyPrefix: demoPrefix,
      keyHash: hashApiKey(demoPlain),
      appName: "Sleep Wellness Partner App",
      scopes: ["*"],
      status: "active",
      rateLimitPerMinute: 120,
      usageCount: 1842,
      lastUsedAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString(),
      createdAt: "2026-04-01T00:00:00.000Z",
      createdBy: "admin",
      revokedAt: null,
    },
    {
      id: "key_demo_mobile",
      name: "Mobile Companion",
      keyPrefix: prefix,
      keyHash: hashApiKey(plain),
      appName: "SWIJ Mobile",
      scopes: [
        "clients:read",
        "analysis:read",
        "journey:read",
        "homework:read",
        "sleep-coach:read",
      ],
      status: "active",
      rateLimitPerMinute: 60,
      usageCount: 326,
      lastUsedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
      expiresAt: null,
      createdAt: "2026-06-12T08:30:00.000Z",
      createdBy: "admin",
      revokedAt: null,
    },
  ];
}

function seedWebhooks(): WebhookEndpoint[] {
  return [
    {
      id: "wh_demo_1",
      url: "https://hooks.example.com/swij/events",
      secret: "whsec_demo_" + randomBytes(8).toString("hex"),
      events: [...WEBHOOK_EVENTS],
      active: true,
      description: "Partner CRM sync",
      createdAt: "2026-05-01T00:00:00.000Z",
      lastDeliveryAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
      failureCount: 0,
    },
  ];
}

let keys: ApiKeyRecord[] = seedKeys();
let webhooks: WebhookEndpoint[] = seedWebhooks();
let deliveries: WebhookDelivery[] = [];
let auditLogs: ApiAuditLog[] = [];
let rateLimitConfig: RateLimitConfig = { ...DEFAULT_RATE_LIMIT };
const rateBuckets = new Map<string, { count: number; windowStart: number }>();

export function listDemoApiKeys(): ApiKeyDashboardRow[] {
  return keys.map(toDashboardRow);
}

export function getDemoApiKeyById(idValue: string): ApiKeyRecord | null {
  return keys.find((k) => k.id === idValue) ?? null;
}

export function findDemoApiKeyByPlain(plain: string): ApiKeyRecord | null {
  const hashed = hashApiKey(plain);
  const record = keys.find((k) => {
    try {
      const a = Buffer.from(k.keyHash, "hex");
      const b = Buffer.from(hashed, "hex");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return k.keyHash === hashed;
    }
  });
  if (!record) return null;
  if (record.status !== "active") return null;
  if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
    record.status = "expired";
    return null;
  }
  return record;
}

export function createDemoApiKey(input: {
  name: string;
  appName: string;
  scopes: ApiKeyScope[];
  expiresAt: string | null;
  rateLimitPerMinute?: number;
  createdBy: string;
}): IssuedApiKey {
  const { plain, prefix } = generateApiKeyPlain();
  const record: ApiKeyRecord = {
    id: id("key"),
    name: input.name.trim() || "Untitled Key",
    keyPrefix: prefix,
    keyHash: hashApiKey(plain),
    appName: input.appName.trim() || "Untitled App",
    scopes: input.scopes.length > 0 ? input.scopes : ["*"],
    status: "active",
    rateLimitPerMinute: input.rateLimitPerMinute ?? 60,
    usageCount: 0,
    lastUsedAt: null,
    expiresAt: input.expiresAt,
    createdAt: nowIso(),
    createdBy: input.createdBy,
    revokedAt: null,
  };
  keys = [record, ...keys];
  return { ...toDashboardRow(record), apiKey: plain };
}

export function revokeDemoApiKey(keyId: string): ApiKeyDashboardRow | null {
  const record = keys.find((k) => k.id === keyId);
  if (!record) return null;
  record.status = "revoked";
  record.revokedAt = nowIso();
  return toDashboardRow(record);
}

export function touchDemoApiKeyUsage(keyId: string) {
  const record = keys.find((k) => k.id === keyId);
  if (!record) return;
  record.usageCount += 1;
  record.lastUsedAt = nowIso();
}

export function listDemoWebhooks(): WebhookEndpoint[] {
  return webhooks.map((w) => ({ ...w }));
}

export function createDemoWebhook(input: {
  url: string;
  events: WebhookEventType[];
  description?: string;
}): WebhookEndpoint {
  const endpoint: WebhookEndpoint = {
    id: id("wh"),
    url: input.url,
    secret: `whsec_${randomBytes(16).toString("hex")}`,
    events: input.events,
    active: true,
    description: input.description?.trim() || "",
    createdAt: nowIso(),
    lastDeliveryAt: null,
    failureCount: 0,
  };
  webhooks = [endpoint, ...webhooks];
  return { ...endpoint };
}

export function updateDemoWebhook(
  webhookId: string,
  patch: Partial<Pick<WebhookEndpoint, "url" | "events" | "active" | "description">>,
): WebhookEndpoint | null {
  const endpoint = webhooks.find((w) => w.id === webhookId);
  if (!endpoint) return null;
  if (patch.url !== undefined) endpoint.url = patch.url;
  if (patch.events !== undefined) endpoint.events = patch.events;
  if (patch.active !== undefined) endpoint.active = patch.active;
  if (patch.description !== undefined) endpoint.description = patch.description;
  return { ...endpoint };
}

export function deleteDemoWebhook(webhookId: string): boolean {
  const before = webhooks.length;
  webhooks = webhooks.filter((w) => w.id !== webhookId);
  return webhooks.length < before;
}

export function enqueueDemoWebhookDelivery(
  event: WebhookEventType,
  payload: Record<string, unknown>,
): WebhookDelivery[] {
  const created: WebhookDelivery[] = [];
  for (const endpoint of webhooks) {
    if (!endpoint.active || !endpoint.events.includes(event)) continue;
    const delivery: WebhookDelivery = {
      id: id("del"),
      webhookId: endpoint.id,
      event,
      payload,
      status: "delivered",
      attempts: 1,
      responseStatus: 200,
      createdAt: nowIso(),
      deliveredAt: nowIso(),
    };
    endpoint.lastDeliveryAt = delivery.deliveredAt;
    created.push(delivery);
    deliveries = [delivery, ...deliveries].slice(0, 200);
  }
  return created;
}

export function listDemoDeliveries(limit = 50): WebhookDelivery[] {
  return deliveries.slice(0, limit);
}

export function appendDemoAuditLog(
  entry: Omit<ApiAuditLog, "id" | "createdAt">,
): ApiAuditLog {
  const log: ApiAuditLog = {
    ...entry,
    id: id("aud"),
    createdAt: nowIso(),
  };
  auditLogs = [log, ...auditLogs].slice(0, 500);
  return log;
}

export function listDemoAuditLogs(limit = 100): ApiAuditLog[] {
  return auditLogs.slice(0, limit);
}

export function getDemoRateLimitConfig(): RateLimitConfig {
  return { ...rateLimitConfig };
}

export function setDemoRateLimitConfig(config: Partial<RateLimitConfig>): RateLimitConfig {
  rateLimitConfig = { ...rateLimitConfig, ...config };
  return { ...rateLimitConfig };
}

export function checkDemoRateLimit(
  bucketKey: string,
  limit: number,
): { allowed: boolean; remaining: number; resetAt: number; limit: number } {
  const windowMs = 60_000;
  const now = Date.now();
  const bucket = rateBuckets.get(bucketKey);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    rateBuckets.set(bucketKey, { count: 1, windowStart: now });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAt: now + windowMs,
      limit,
    };
  }
  bucket.count += 1;
  const allowed = bucket.count <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.windowStart + windowMs,
    limit,
  };
}

export function getDemoDeveloperStats() {
  const dayAgo = Date.now() - 1000 * 60 * 60 * 24;
  return {
    totalKeys: keys.length,
    activeKeys: keys.filter((k) => k.status === "active").length,
    totalRequests: keys.reduce((sum, k) => sum + k.usageCount, 0),
    requestsLast24h: auditLogs.filter(
      (l) => new Date(l.createdAt).getTime() >= dayAgo,
    ).length,
    webhookEndpoints: webhooks.filter((w) => w.active).length,
    auditEventsLast24h: auditLogs.filter(
      (l) => new Date(l.createdAt).getTime() >= dayAgo,
    ).length,
  };
}

/** Demo plaintext key documented for local development. */
export const DEMO_API_KEY_PLAIN = "swij_live_demo_platform_key_v4";
