import { computeDashboardStats } from "@/lib/dashboard-stats";

/** Dashboard Module service — role home KPIs and today's workload. */
export const dashboardService = {
  getStats: computeDashboardStats,
};

export type DashboardService = typeof dashboardService;
