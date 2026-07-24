import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { evaluateClosedBetaLoginAccess } from "@/lib/closed-beta/beta-access-service";
import { decidePathAccess } from "@/lib/rbac/access";
import {
  homePathForRole,
  isClientOnlyPath,
  isEnterpriseOnlyPath,
  isInstructorOnlyPath,
  isSchoolAllowedAdminPath,
  isSchoolOnlyPath,
} from "@/lib/safe-redirect";
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/portal",
  "/admin",
  "/clients",
  "/client",
  "/enterprise",
  "/school",
  "/programs",
  "/academy",
  "/community",
  "/insights",
  "/settings",
  "/feedback",
  "/license",
  "/billing",
  "/invitations",
  "/setup",
  "/analysis",
  "/journey",
  "/homework",
  "/research",
  "/retreat",
  "/events",
  "/companies",
  "/reports",
  "/notifications",
  "/developer",
  "/knowledge",
];

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/setup/beta-verify") return false;
  if (pathname === "/invite" || pathname.startsWith("/invite/")) return false;
  if (pathname === "/forbidden") return false;
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix)) {
    return true;
  }
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname.startsWith(`${prefix}/`),
  );
}

function needsSessionRefresh(pathname: string): boolean {
  return (
    isProtectedPath(pathname) ||
    pathname.startsWith("/api/platform") ||
    pathname.startsWith("/api/os") ||
    pathname.startsWith("/api/developer") ||
    pathname.startsWith("/api/setup") ||
    pathname.startsWith("/api/invitations") ||
    pathname.startsWith("/api/audit") ||
    pathname.startsWith("/api/subscription") ||
    pathname.startsWith("/api/rbac") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/feedback") ||
    pathname.startsWith("/api/evidence") ||
    pathname.startsWith("/api/client-portal") ||
    pathname.startsWith("/api/beta-invitations") ||
    pathname.startsWith("/api/license") ||
    pathname.startsWith("/api/ops") ||
    pathname.startsWith("/api/journey") ||
    pathname.startsWith("/api/ai-intelligence")
  );
}

export async function proxy(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (!needsSessionRefresh(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    const redirectTarget = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("redirect", redirectTarget);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isProtectedPath(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle();

    const role =
      profile && typeof profile === "object" && "role" in profile
        ? String((profile as { role?: unknown }).role ?? "")
        : "";
    const profileEmail =
      profile && typeof profile === "object" && "email" in profile
        ? String((profile as { email?: unknown }).email ?? "")
        : "";

    const access = await evaluateClosedBetaLoginAccess(supabase, user.id, {
      role,
      email: profileEmail || user.email,
    });
    if (!access.allowed) {
      await supabase.auth.signOut();
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/login";
      loginUrl.search = "";
      loginUrl.searchParams.set("error", access.message);
      return NextResponse.redirect(loginUrl);
    }

    // RBAC 画面アクセス
    const decision = decidePathAccess(role, pathname);
    if (!decision.allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/forbidden";
      url.search = "";
      url.searchParams.set("from", pathname);
      return NextResponse.redirect(url);
    }

    if (
      (role === "client" || role === "enterprise") &&
      isInstructorOnlyPath(pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRole(role);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (
      role === "school" &&
      isInstructorOnlyPath(pathname) &&
      !isSchoolAllowedAdminPath(pathname) &&
      pathname !== "/billing" &&
      !pathname.startsWith("/billing/") &&
      pathname !== "/notifications" &&
      !pathname.startsWith("/notifications/") &&
      pathname !== "/settings" &&
      !pathname.startsWith("/settings/")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRole(role);
      url.search = "";
      return NextResponse.redirect(url);
    }

    // /admin と /developer は admin / super_admin のみ（認定校は schools 閲覧のみ例外）
    if (
      (pathname === "/developer" || pathname.startsWith("/developer/")) &&
      role &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRole(role);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (
      (pathname === "/admin" || pathname.startsWith("/admin/")) &&
      role &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      // 認定校は自校・認定・ライセンス・プランの閲覧のみ
      if (role === "school" && isSchoolAllowedAdminPath(pathname)) {
        // allow
      } else {
        const url = request.nextUrl.clone();
        url.pathname = "/forbidden";
        url.search = "";
        return NextResponse.redirect(url);
      }
    }

    if (
      role &&
      role !== "client" &&
      isClientOnlyPath(pathname) &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRole(role);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (
      role &&
      role !== "enterprise" &&
      isEnterpriseOnlyPath(pathname) &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRole(role);
      url.search = "";
      return NextResponse.redirect(url);
    }

    if (
      role &&
      role !== "school" &&
      isSchoolOnlyPath(pathname) &&
      role !== "admin" &&
      role !== "super_admin"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRole(role);
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/portal/:path*",
    "/admin/:path*",
    "/clients/:path*",
    "/client",
    "/client/:path*",
    "/enterprise",
    "/enterprise/:path*",
    "/school",
    "/school/:path*",
    "/programs",
    "/programs/:path*",
    "/academy",
    "/academy/:path*",
    "/community",
    "/community/:path*",
    "/insights",
    "/insights/:path*",
    "/settings",
    "/settings/:path*",
    "/setup",
    "/setup/:path*",
    "/analysis",
    "/analysis/:path*",
    "/journey",
    "/journey/:path*",
    "/homework",
    "/homework/:path*",
    "/reports",
    "/reports/:path*",
    "/knowledge",
    "/knowledge/:path*",
    "/license",
    "/license/:path*",
    "/billing",
    "/billing/:path*",
    "/invitations",
    "/invitations/:path*",
    "/feedback",
    "/feedback/:path*",
    "/notifications",
    "/notifications/:path*",
    "/forbidden",
    "/api/platform/:path*",
    "/api/os/:path*",
    "/api/developer/:path*",
    "/api/setup/:path*",
    "/api/invitations/:path*",
    "/api/audit/:path*",
    "/api/subscription/:path*",
    "/api/rbac/:path*",
    "/api/admin/:path*",
    "/api/feedback",
    "/api/feedback/:path*",
    "/api/evidence/:path*",
    "/api/client-portal/:path*",
    "/api/beta-invitations",
    "/api/beta-invitations/:path*",
    "/api/license",
    "/api/license/:path*",
    "/api/ops/:path*",
    "/api/journey/:path*",
    "/api/ai-intelligence/:path*",
    "/developer",
    "/developer/:path*",
  ],
};
