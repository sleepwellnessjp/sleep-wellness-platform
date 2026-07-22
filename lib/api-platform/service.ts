import {
  createDemoApiKey,
  createDemoWebhook,
  deleteDemoWebhook,
  getDemoDeveloperStats,
  getDemoRateLimitConfig,
  listDemoApiKeys,
  listDemoWebhooks,
  revokeDemoApiKey,
  setDemoRateLimitConfig,
  updateDemoWebhook,
} from "./demo-store";
import { listApiAuditLogs, listWebhookDeliveries } from "./audit";
import { buildOpenApiDocument } from "./openapi";
import type {
  ApiKeyScope,
  RateLimitConfig,
  WebhookEventType,
} from "./types";

/** Developer / API Platform service facade. */
export const apiPlatformService = {
  getDashboard() {
    return {
      stats: getDemoDeveloperStats(),
      keys: listDemoApiKeys(),
      webhooks: listDemoWebhooks(),
      rateLimit: getDemoRateLimitConfig(),
      recentAudit: listApiAuditLogs(20),
      recentDeliveries: listWebhookDeliveries(10),
    };
  },

  listKeys() {
    return listDemoApiKeys();
  },

  createKey(input: {
    name: string;
    appName: string;
    scopes: ApiKeyScope[];
    expiresAt: string | null;
    rateLimitPerMinute?: number;
    createdBy: string;
  }) {
    return createDemoApiKey(input);
  },

  revokeKey(keyId: string) {
    return revokeDemoApiKey(keyId);
  },

  listWebhooks() {
    return listDemoWebhooks();
  },

  createWebhook(input: {
    url: string;
    events: WebhookEventType[];
    description?: string;
  }) {
    return createDemoWebhook(input);
  },

  updateWebhook(
    id: string,
    patch: {
      url?: string;
      events?: WebhookEventType[];
      active?: boolean;
      description?: string;
    },
  ) {
    return updateDemoWebhook(id, patch);
  },

  deleteWebhook(id: string) {
    return deleteDemoWebhook(id);
  },

  listAudit(limit = 100) {
    return listApiAuditLogs(limit);
  },

  getRateLimit() {
    return getDemoRateLimitConfig();
  },

  updateRateLimit(config: Partial<RateLimitConfig>) {
    return setDemoRateLimitConfig(config);
  },

  getOpenApi(baseUrl = "") {
    return buildOpenApiDocument(baseUrl);
  },
};

export type ApiPlatformService = typeof apiPlatformService;
