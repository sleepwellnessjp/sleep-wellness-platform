import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
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
  "/setup",
  "/analysis/new",
  "/analysis/confirm",
  "/analysis/loading",
  "/analysis/result",
];

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_PREFIXES.some((prefix) => pathname === prefix)) {
    return true;
  }
  if (pathname.startsWith("/clients/")) return true;
  if (pathname.startsWith("/analysis/")) return true;
  return false;
}

function needsSessionRefresh(pathname: string): boolean {
  return isProtectedPath(pathname) || pathname.startsWith("/api/platform");
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

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/portal/:path*",
    "/admin/:path*",
    "/clients/:path*",
    "/setup",
    "/analysis/new",
    "/analysis/confirm",
    "/analysis/loading",
    "/analysis/result",
    "/analysis/result/:path*",
    "/api/platform/:path*",
  ],
};
