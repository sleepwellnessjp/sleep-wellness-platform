import { apiPlatformService } from "@/lib/api-platform/service";

export const developerService = {
  getDashboard: () => apiPlatformService.getDashboard(),
  listKeys: () => apiPlatformService.listKeys(),
  createKey: apiPlatformService.createKey,
  revokeKey: apiPlatformService.revokeKey,
  listWebhooks: () => apiPlatformService.listWebhooks(),
  createWebhook: apiPlatformService.createWebhook,
  updateWebhook: apiPlatformService.updateWebhook,
  deleteWebhook: apiPlatformService.deleteWebhook,
  listAudit: apiPlatformService.listAudit,
  getRateLimit: () => apiPlatformService.getRateLimit(),
  updateRateLimit: apiPlatformService.updateRateLimit,
  getOpenApi: apiPlatformService.getOpenApi,
};

export type DeveloperService = typeof developerService;
