import type { UserRole } from "@/lib/platform/types";

/** Version 2.2 公式権限（表示・ポリシー用） */
export type PlatformAuthority =
  | "hq"
  | "school"
  | "instructor"
  | "client";

export type AccessLevel = "none" | "view" | "edit";

export type ResourceKey =
  | "admin_hq"
  | "admin_roles"
  | "admin_schools"
  | "admin_certification"
  | "admin_license"
  | "admin_subscriptions"
  | "admin_invitations"
  | "admin_audit"
  | "admin_feedback"
  | "admin_ai"
  | "school_dashboard"
  | "instructor_dashboard"
  | "clients"
  | "analysis"
  | "reports"
  | "homework"
  | "journey"
  | "license_self"
  | "billing"
  | "invitations"
  | "notifications"
  | "knowledge"
  | "client_portal"
  | "settings";

export type RoleCatalogRecord = {
  id: string;
  key: PlatformAuthority;
  label: string;
  description: string;
  mapsToRoles: UserRole[];
  sortOrder: number;
  createdAt: string;
};

export type PermissionMatrix = Record<
  PlatformAuthority,
  Record<ResourceKey, AccessLevel>
>;

export type AccessDecision = {
  allowed: boolean;
  level: AccessLevel;
  authority: PlatformAuthority | null;
  reason: string;
};
