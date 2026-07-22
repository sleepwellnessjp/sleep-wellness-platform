export const DASHBOARD_ROUTES = {
  instructorHome: "/dashboard",
  adminHome: "/admin",
  clientHome: "/client",
  enterpriseHome: "/enterprise",
  executiveApi: "/api/executive",
} as const;

export type DashboardRouteKey = keyof typeof DASHBOARD_ROUTES;
