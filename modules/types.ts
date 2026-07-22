/**
 * Sleep Wellness Platform — Version 3.0 Module contracts.
 * Every feature ships as an independent Module with the same surface area.
 */

export type ModuleStatus = "active" | "beta" | "planned";

export type ModuleId =
  | "dashboard"
  | "clients"
  | "analysis"
  | "ai"
  | "sleep-coach"
  | "journey"
  | "homework"
  | "academy"
  | "community"
  | "insights"
  | "research"
  | "retreat"
  | "events"
  | "companies"
  | "reports"
  | "billing"
  | "notifications"
  | "settings"
  | "developer";

export type ModuleManifest = {
  id: ModuleId;
  name: string;
  description: string;
  /** Primary App Router path for this module */
  basePath: string;
  status: ModuleStatus;
  /** Optional secondary routes owned by the module */
  routes?: readonly string[];
};

/** Standard folder contract every module must expose. */
export type ModuleSurface = {
  components: string;
  services: string;
  repositories: string;
  hooks: string;
  routes: string;
};
