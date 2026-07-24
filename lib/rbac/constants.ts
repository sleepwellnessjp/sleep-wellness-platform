import type { UserRole } from "@/lib/platform/types";
import type {
  AccessLevel,
  PermissionMatrix,
  PlatformAuthority,
  ResourceKey,
  RoleCatalogRecord,
} from "./types";

export const PLATFORM_AUTHORITIES = [
  "hq",
  "school",
  "instructor",
  "client",
] as const satisfies readonly PlatformAuthority[];

export const AUTHORITY_LABELS: Record<PlatformAuthority, string> = {
  hq: "SWIJ本部",
  school: "認定校",
  instructor: "認定講師",
  client: "クライアント",
};

export const AUTHORITY_DESCRIPTIONS: Record<PlatformAuthority, string> = {
  hq: "全国の認定校・認定講師・ライセンス・課金・監査を統括します。",
  school: "所属認定講師・受講生・講座の閲覧と校内運営を行います。",
  instructor: "担当クライアントの分析・宿題・招待・レポートを運営します。",
  client: "自身の睡眠データ・宿題・コーチングを閲覧・更新します。",
};

export const RESOURCE_LABELS: Record<ResourceKey, string> = {
  admin_hq: "本部ダッシュボード",
  admin_roles: "権限管理",
  admin_schools: "認定校管理",
  admin_certification: "認定講師管理",
  admin_license: "ライセンス管理",
  admin_subscriptions: "サブスクリプション",
  admin_invitations: "招待管理（本部）",
  admin_audit: "監査ログ",
  admin_feedback: "フィードバック",
  admin_ai: "AI Intelligence（本部）",
  school_dashboard: "認定校ダッシュボード",
  instructor_dashboard: "講師ダッシュボード",
  clients: "クライアント管理",
  analysis: "睡眠分析",
  reports: "レポート",
  homework: "宿題",
  journey: "Journey",
  license_self: "マイライセンス",
  billing: "課金・プラン",
  invitations: "クライアント招待",
  notifications: "通知",
  knowledge: "Knowledge",
  client_portal: "クライアントポータル",
  settings: "設定",
};

/** 各権限の閲覧・編集マトリクス */
export const PERMISSION_MATRIX: PermissionMatrix = {
  hq: {
    admin_hq: "edit",
    admin_roles: "edit",
    admin_schools: "edit",
    admin_certification: "edit",
    admin_license: "edit",
    admin_subscriptions: "edit",
    admin_invitations: "edit",
    admin_audit: "edit",
    admin_feedback: "edit",
    admin_ai: "edit",
    school_dashboard: "view",
    instructor_dashboard: "view",
    clients: "edit",
    analysis: "edit",
    reports: "edit",
    homework: "edit",
    journey: "edit",
    license_self: "view",
    billing: "edit",
    invitations: "view",
    notifications: "edit",
    knowledge: "edit",
    client_portal: "view",
    settings: "edit",
  },
  school: {
    admin_hq: "none",
    admin_roles: "none",
    admin_schools: "view",
    admin_certification: "view",
    admin_license: "view",
    admin_subscriptions: "view",
    admin_invitations: "none",
    admin_audit: "none",
    admin_feedback: "none",
    admin_ai: "none",
    school_dashboard: "edit",
    instructor_dashboard: "none",
    clients: "view",
    analysis: "none",
    reports: "view",
    homework: "none",
    journey: "view",
    license_self: "none",
    billing: "view",
    invitations: "none",
    notifications: "view",
    knowledge: "view",
    client_portal: "none",
    settings: "view",
  },
  instructor: {
    admin_hq: "none",
    admin_roles: "none",
    admin_schools: "none",
    admin_certification: "none",
    admin_license: "none",
    admin_subscriptions: "none",
    admin_invitations: "none",
    admin_audit: "none",
    admin_feedback: "edit",
    admin_ai: "none",
    school_dashboard: "none",
    instructor_dashboard: "edit",
    clients: "edit",
    analysis: "edit",
    reports: "edit",
    homework: "edit",
    journey: "edit",
    license_self: "view",
    billing: "view",
    invitations: "edit",
    notifications: "view",
    knowledge: "view",
    client_portal: "view",
    settings: "edit",
  },
  client: {
    admin_hq: "none",
    admin_roles: "none",
    admin_schools: "none",
    admin_certification: "none",
    admin_license: "none",
    admin_subscriptions: "none",
    admin_invitations: "none",
    admin_audit: "none",
    admin_feedback: "none",
    admin_ai: "none",
    school_dashboard: "none",
    instructor_dashboard: "none",
    clients: "none",
    analysis: "none",
    reports: "view",
    homework: "edit",
    journey: "view",
    license_self: "none",
    billing: "none",
    invitations: "none",
    notifications: "view",
    knowledge: "none",
    client_portal: "edit",
    settings: "edit",
  },
};

export const DEFAULT_ROLE_CATALOG: RoleCatalogRecord[] = [
  {
    id: "role-hq",
    key: "hq",
    label: AUTHORITY_LABELS.hq,
    description: AUTHORITY_DESCRIPTIONS.hq,
    mapsToRoles: ["super_admin", "admin"],
    sortOrder: 1,
    createdAt: "2026-07-24T00:00:00.000Z",
  },
  {
    id: "role-school",
    key: "school",
    label: AUTHORITY_LABELS.school,
    description: AUTHORITY_DESCRIPTIONS.school,
    mapsToRoles: ["school"],
    sortOrder: 2,
    createdAt: "2026-07-24T00:00:00.000Z",
  },
  {
    id: "role-instructor",
    key: "instructor",
    label: AUTHORITY_LABELS.instructor,
    description: AUTHORITY_DESCRIPTIONS.instructor,
    mapsToRoles: ["instructor"],
    sortOrder: 3,
    createdAt: "2026-07-24T00:00:00.000Z",
  },
  {
    id: "role-client",
    key: "client",
    label: AUTHORITY_LABELS.client,
    description: AUTHORITY_DESCRIPTIONS.client,
    mapsToRoles: ["client"],
    sortOrder: 4,
    createdAt: "2026-07-24T00:00:00.000Z",
  },
];

export function authorityFromUserRole(
  role: UserRole | string | null | undefined,
): PlatformAuthority | null {
  if (role === "super_admin" || role === "admin") return "hq";
  if (role === "school") return "school";
  if (role === "instructor") return "instructor";
  if (role === "client") return "client";
  // enterprise は本部相当の閲覧はせず、企業専用領域のみ
  if (role === "enterprise") return null;
  return null;
}

export function accessLevel(
  authority: PlatformAuthority | null,
  resource: ResourceKey,
): AccessLevel {
  if (!authority) return "none";
  return PERMISSION_MATRIX[authority][resource];
}

export function canView(
  authority: PlatformAuthority | null,
  resource: ResourceKey,
): boolean {
  const level = accessLevel(authority, resource);
  return level === "view" || level === "edit";
}

export function canEdit(
  authority: PlatformAuthority | null,
  resource: ResourceKey,
): boolean {
  return accessLevel(authority, resource) === "edit";
}

export function isHqRole(role: UserRole | string | null | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSchoolRole(
  role: UserRole | string | null | undefined,
): boolean {
  return role === "school";
}

export function isInstructorRole(
  role: UserRole | string | null | undefined,
): boolean {
  return role === "instructor";
}

export function isClientRole(
  role: UserRole | string | null | undefined,
): boolean {
  return role === "client";
}
