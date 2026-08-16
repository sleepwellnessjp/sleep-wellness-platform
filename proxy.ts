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

/**
 * 未認証でもアクセス可能なパス。
 * /login・OAuth・認定講師公開ページ。それ以外のページはログイン必須。
 */
function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/welcome" || pathname.startsWith("/welcome/")) return true;
  if (pathname === "/login") return true;
  if (pathname.startsWith("/auth/")) return true;
  if (pathname === "/contact" || pathname.startsWith("/contact/")) return true;
  if (pathname === "/instructors" || pathname.startsWith("/instructors/")) {
    return true;
  }
  if (pathname === "/license/verify" || pathname.startsWith("/license/verify/")) {
    return true;
  }
  if (
    pathname === "/academy/certified-instructor" ||
    pathname.startsWith("/academy/certified-instructor/")
  ) {
    return true;
  }
  // 開発時のみ: 分析UIの表示確認（本番ではログイン必須）
  if (
    process.env.NODE_ENV === "development" &&
    (pathname === "/analysis" || pathname.startsWith("/analysis/"))
  ) {
    return true;
  }
  return false;
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

/** ページは /login・/auth 以外すべて認証必須 */
function requiresAuth(pathname: string): boolean {
  return !isApiPath(pathname) && !isPublicPath(pathname);
}

function redirectToLogin(request: NextRequest, pathname: string): NextResponse {
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (pathname !== "/login") {
    const redirectTarget = `${pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("redirect", redirectTarget);
  }
  return NextResponse.redirect(loginUrl);
}

function needsApiSessionRefresh(pathname: string): boolean {
  return (
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
    pathname.startsWith("/api/ai-intelligence") ||
    pathname.startsWith("/api/instructor/profile") ||
    pathname.startsWith("/api/instructor/activity-schedules")
  );
}

function needsSessionRefresh(pathname: string): boolean {
  // API は認証が必要なものだけ（OCR/分析 API には触らない）
  if (isApiPath(pathname)) {
    return needsApiSessionRefresh(pathname);
  }
  // ページは公開パスでも Cookie セッションを更新する
  // （開発時の /analysis 公開でも、ログイン済みならセッションを維持）
  return true;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 本番で Supabase 未設定の場合も未ログイン扱いでガードを維持する
  if (!isSupabaseConfigured()) {
    if (requiresAuth(pathname)) {
      return redirectToLogin(request, pathname);
    }
    return NextResponse.next();
  }

  if (!needsSessionRefresh(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabaseAnonKey();
  if (!supabaseUrl || !supabaseKey) {
    if (requiresAuth(pathname)) {
      return redirectToLogin(request, pathname);
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
      },
    },
  });

  // createServerClient 直後に getClaims（公式推奨。未ログイン時も AuthSessionMissing を投げない）
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  const claimsEmail =
    typeof claims?.email === "string" ? claims.email : undefined;

  if (!userId && requiresAuth(pathname)) {
    return redirectToLogin(request, pathname);
  }

  if (userId && requiresAuth(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", userId)
      .maybeSingle();

    const role =
      profile && typeof profile === "object" && "role" in profile
        ? String((profile as { role?: unknown }).role ?? "")
        : "";
    const profileEmail =
      profile && typeof profile === "object" && "email" in profile
        ? String((profile as { email?: unknown }).email ?? "")
        : "";

    const access = await evaluateClosedBetaLoginAccess(supabase, userId, {
      role,
      email: profileEmail || claimsEmail,
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
  // 静的アセット以外をすべて対象にし、新規ページもデフォルトで認証必須にする
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml|webmanifest)$).*)",
  ],
};
