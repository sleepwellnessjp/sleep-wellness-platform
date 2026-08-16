/**
 * Auth redirect のオープンリダイレクト防止。
 * 同一オリジンの相対パスのみ許可する（query / hash は保持可）。
 */
export function sanitizeAppRedirect(
  redirect: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!redirect) return fallback;
  const trimmed = redirect.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (trimmed.includes("://")) return fallback;
  if (trimmed.includes("\\")) return fallback;
  return trimmed;
}

/** role / 保護判定用に ?query と #hash を除いた pathname を返す */
export function appPathname(path: string): string {
  const noHash = path.split("#")[0] ?? path;
  const noQuery = noHash.split("?")[0] ?? noHash;
  return noQuery || "/";
}

export function homePathForRole(role: string | null | undefined): string {
  if (role === "client") return "/client";
  if (role === "enterprise") return "/enterprise";
  if (role === "school") return "/portal/school";
  if (role === "admin" || role === "super_admin") return "/admin";
  return "/dashboard";
}

export function isClientOnlyPath(pathname: string): boolean {
  const path = appPathname(pathname);
  return path === "/client" || path.startsWith("/client/");
}

export function isEnterpriseOnlyPath(pathname: string): boolean {
  const path = appPathname(pathname);
  return path === "/enterprise" || path.startsWith("/enterprise/");
}

export function isSchoolOnlyPath(pathname: string): boolean {
  const path = appPathname(pathname);
  return path === "/portal/school" || path.startsWith("/portal/school/");
}

export function isInstructorOnlyPath(pathname: string): boolean {
  if (isClientOnlyPath(pathname)) return false;
  if (isEnterpriseOnlyPath(pathname)) return false;
  if (isSchoolOnlyPath(pathname)) return false;
  const path = appPathname(pathname);
  if (path === "/license/verify" || path.startsWith("/license/verify/")) {
    return false;
  }
  // 認定講師養成講座の公開案内ページは講師専用パスから除外
  if (
    path === "/academy/certified-instructor" ||
    path.startsWith("/academy/certified-instructor/")
  ) {
    return false;
  }
  const prefixes = [
    "/dashboard",
    "/portal",
    "/admin",
    "/developer",
    "/clients",
    "/programs",
    "/academy",
    "/community",
    "/insights",
    "/setup",
    "/analysis",
    "/journey",
    "/homework",
    "/reports",
    // /feedback は Closed Beta 全ロール共通（クライアント・認定校含む）
    "/license",
    "/invitations",
    "/billing",
    "/instructor",
  ];
  return prefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

/** 認定校が閲覧できる本部画面（proxy / login / callback で共通） */
export function isSchoolAllowedAdminPath(pathname: string): boolean {
  const path = appPathname(pathname);
  return (
    path === "/admin/schools" ||
    path.startsWith("/admin/schools/") ||
    path === "/admin/license" ||
    path.startsWith("/admin/license/") ||
    path === "/admin/subscriptions" ||
    path.startsWith("/admin/subscriptions/")
  );
}
