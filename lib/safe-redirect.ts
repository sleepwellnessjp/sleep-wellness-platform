/**
 * Auth redirect のオープンリダイレクト防止。
 * 同一オリジンの相対パスのみ許可する。
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

export function homePathForRole(role: string | null | undefined): string {
  if (role === "client") return "/client";
  if (role === "enterprise") return "/enterprise";
  if (role === "admin" || role === "super_admin") return "/admin";
  return "/dashboard";
}

export function isClientOnlyPath(pathname: string): boolean {
  return pathname === "/client" || pathname.startsWith("/client/");
}

export function isEnterpriseOnlyPath(pathname: string): boolean {
  return pathname === "/enterprise" || pathname.startsWith("/enterprise/");
}

export function isInstructorOnlyPath(pathname: string): boolean {
  if (isClientOnlyPath(pathname)) return false;
  if (isEnterpriseOnlyPath(pathname)) return false;
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
  ];
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
