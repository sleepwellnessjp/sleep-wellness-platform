import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  homePathForRole,
  isClientOnlyPath,
  isEnterpriseOnlyPath,
  isInstructorOnlyPath,
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
  "/programs",
  "/academy",
  "/community",
  "/insights",
  "/settings",
  "/setup",
  "/analysis/new",
  "/analysis/confirm",
  "/analysis/loading",
  "/analysis/result",
  // Version 3.0 module routes
  "/research",
  "/retreat",
  "/events",
  "/companies",
  "/reports",
  "/billing",
  "/notifications",
  // Version 4.0 API Platform
  "/developer",
];

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix)) {
    return true;
  }
  if (pathname.startsWith("/clients/")) return true;
  if (pathname.startsWith("/client/")) return true;
  if (pathname.startsWith("/enterprise/")) return true;
  if (pathname.startsWith("/programs/")) return true;
  if (pathname.startsWith("/academy/")) return true;
  if (pathname.startsWith("/community/")) return true;
  if (pathname.startsWith("/insights/")) return true;
  if (pathname.startsWith("/settings/")) return true;
  if (pathname.startsWith("/analysis/")) return true;
  if (pathname.startsWith("/developer/")) return true;
  return false;
}

function needsSessionRefresh(pathname: string): boolean {
  return (
    isProtectedPath(pathname) ||
    pathname.startsWith("/api/platform") ||
    pathname.startsWith("/api/os") ||
    pathname.startsWith("/api/developer")
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

  // ページ保護のみリダイレクト。API は各 route が 401 を返す
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isProtectedPath(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role =
      profile && typeof profile === "object" && "role" in profile
        ? String((profile as { role?: unknown }).role ?? "")
        : "";

    if (
      (role === "client" || role === "enterprise") &&
      isInstructorOnlyPath(pathname)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = homePathForRole(role);
      url.search = "";
      return NextResponse.redirect(url);
    }

    // /admin と /developer は admin / super_admin のみ
    if (
      (pathname === "/admin" ||
        pathname.startsWith("/admin/") ||
        pathname === "/developer" ||
        pathname.startsWith("/developer/")) &&
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
    "/analysis/new",
    "/analysis/confirm",
    "/analysis/loading",
    "/analysis/result",
    "/analysis/result/:path*",
    "/api/platform/:path*",
    "/api/os/:path*",
    "/api/developer/:path*",
    "/developer",
    "/developer/:path*",
  ],
};
