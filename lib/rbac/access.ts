import type { UserRole } from "@/lib/platform/types";
import {
  accessLevel,
  authorityFromUserRole,
  canEdit,
  canView,
} from "./constants";
import type {
  AccessDecision,
  AccessLevel,
  PlatformAuthority,
  ResourceKey,
} from "./types";

/** パス → リソース対応（画面アクセス制御） */
const PATH_RESOURCES: Array<{
  test: (pathname: string) => boolean;
  resource: ResourceKey;
  /** 最低必要なアクセスレベル */
  min?: AccessLevel;
}> = [
  {
    test: (p) => p.startsWith("/admin/roles"),
    resource: "admin_roles",
    min: "view",
  },
  {
    test: (p) => p.startsWith("/admin/schools"),
    resource: "admin_schools",
    min: "view",
  },
  {
    test: (p) => p.startsWith("/admin/certification"),
    resource: "admin_certification",
    min: "view",
  },
  {
    test: (p) => p.startsWith("/admin/license"),
    resource: "admin_license",
    min: "view",
  },
  {
    test: (p) => p.startsWith("/admin/subscriptions"),
    resource: "admin_subscriptions",
    min: "view",
  },
  {
    test: (p) => p.startsWith("/admin/invitations"),
    resource: "admin_invitations",
    min: "view",
  },
  {
    test: (p) => p.startsWith("/admin/audit") || p.startsWith("/admin/logs"),
    resource: "admin_audit",
    min: "view",
  },
  {
    test: (p) => p.startsWith("/admin/feedback"),
    resource: "admin_feedback",
    min: "view",
  },
  {
    test: (p) => p.startsWith("/admin/ai"),
    resource: "admin_ai",
    min: "view",
  },
  {
    test: (p) => p === "/admin" || p.startsWith("/admin/"),
    resource: "admin_hq",
    min: "view",
  },
  {
    test: (p) => p === "/school" || p.startsWith("/school/"),
    resource: "school_dashboard",
    min: "view",
  },
  {
    test: (p) => p === "/dashboard" || p.startsWith("/dashboard/"),
    resource: "instructor_dashboard",
    min: "view",
  },
  {
    test: (p) => p === "/clients" || p.startsWith("/clients/"),
    resource: "clients",
    min: "view",
  },
  {
    test: (p) => p === "/analysis" || p.startsWith("/analysis/"),
    resource: "analysis",
    min: "edit",
  },
  {
    test: (p) => p === "/reports" || p.startsWith("/reports/"),
    resource: "reports",
    min: "view",
  },
  {
    test: (p) => p === "/homework" || p.startsWith("/homework/"),
    resource: "homework",
    min: "view",
  },
  {
    test: (p) => p === "/journey" || p.startsWith("/journey/"),
    resource: "journey",
    min: "view",
  },
  {
    test: (p) => p === "/license" || p.startsWith("/license/"),
    resource: "license_self",
    min: "view",
  },
  {
    test: (p) => p === "/billing" || p.startsWith("/billing/"),
    resource: "billing",
    min: "view",
  },
  {
    test: (p) => p === "/invitations" || p.startsWith("/invitations/"),
    resource: "invitations",
    min: "view",
  },
  {
    test: (p) => p === "/client" || p.startsWith("/client/"),
    resource: "client_portal",
    min: "view",
  },
  {
    test: (p) => p === "/knowledge" || p.startsWith("/knowledge/"),
    resource: "knowledge",
    min: "view",
  },
  {
    test: (p) => p === "/notifications" || p.startsWith("/notifications/"),
    resource: "notifications",
    min: "view",
  },
  {
    test: (p) => p === "/settings" || p.startsWith("/settings/"),
    resource: "settings",
    min: "view",
  },
];

function meetsMin(level: AccessLevel, min: AccessLevel): boolean {
  if (min === "none") return true;
  if (min === "view") return level === "view" || level === "edit";
  return level === "edit";
}

export function decidePathAccess(
  role: UserRole | string | null | undefined,
  pathname: string,
): AccessDecision {
  const authority = authorityFromUserRole(role);
  const path = pathname.split("?")[0]?.split("#")[0] || "/";

  // 公開・認証周辺は常に許可
  if (
    path === "/" ||
    path === "/login" ||
    path.startsWith("/auth/") ||
    path.startsWith("/invite/") ||
    path === "/forbidden" ||
    path === "/demo" ||
    path.startsWith("/demo/")
  ) {
    return {
      allowed: true,
      level: "view",
      authority,
      reason: "public",
    };
  }

  for (const rule of PATH_RESOURCES) {
    if (!rule.test(path)) continue;
    const level = accessLevel(authority, rule.resource);
    const min = rule.min ?? "view";
    const allowed = meetsMin(level, min);
    return {
      allowed,
      level,
      authority,
      reason: allowed
        ? `ok:${rule.resource}`
        : `denied:${rule.resource}:${level}`,
    };
  }

  // 未定義パス: 本部は許可、それ以外はホームへ
  if (authority === "hq") {
    return {
      allowed: true,
      level: "edit",
      authority,
      reason: "hq-default",
    };
  }

  return {
    allowed: true,
    level: "view",
    authority,
    reason: "unlisted",
  };
}

export function canAccessResource(
  role: UserRole | string | null | undefined,
  resource: ResourceKey,
  mode: "view" | "edit" = "view",
): boolean {
  const authority = authorityFromUserRole(role);
  return mode === "edit"
    ? canEdit(authority, resource)
    : canView(authority, resource);
}

export function homePathForAuthority(
  authority: PlatformAuthority | null,
): string {
  if (authority === "hq") return "/admin";
  if (authority === "school") return "/school";
  if (authority === "instructor") return "/dashboard";
  if (authority === "client") return "/client";
  return "/dashboard";
}
