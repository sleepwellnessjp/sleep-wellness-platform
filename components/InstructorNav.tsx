"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/use-auth";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

const NAV_ITEMS = [
  { href: "/dashboard", label: "ダッシュボード", match: "/dashboard" },
  { href: "/portal", label: "マイポータル", match: "/portal" },
  { href: "/clients", label: "クライアント", match: "/clients" },
  { href: "/programs", label: "改善プログラム", match: "/programs" },
  { href: "/analysis/new", label: "新規分析", match: "/analysis" },
  { href: "/", label: "ホーム", match: "home" },
] as const;

function isActive(pathname: string, match: string): boolean {
  if (match === "home") return pathname === "/";
  if (match === "/clients") {
    return pathname === "/clients" || pathname.startsWith("/clients/");
  }
  if (match === "/programs") {
    return pathname === "/programs" || pathname.startsWith("/programs/");
  }
  if (match === "/analysis") {
    return pathname.startsWith("/analysis");
  }
  return pathname === match || pathname.startsWith(`${match}/`);
}

export default function InstructorNav({
  eyebrow = "INSTRUCTOR",
}: {
  eyebrow?: string;
}) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { loading, supabaseEnabled, isAuthenticated, isDemoMode, signOut } =
    useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    if (isDemoMode) {
      setShowAdmin(true);
      return;
    }
    void fetch("/api/platform/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { profile?: { role?: string } } | null) => {
        if (json?.profile?.role === "super_admin") {
          setShowAdmin(true);
        }
      })
      .catch(() => {
        // ignore
      });
  }, [isDemoMode]);

  const showLogout =
    !loading && ((supabaseEnabled && isAuthenticated) || isDemoMode);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-4 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-3">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={160}
              height={40}
              className="h-auto w-[120px] sm:w-[140px]"
            />
          </Link>
          <div className="flex items-center gap-3">
            {showLogout && (
              <button
                type="button"
                onClick={handleLogout}
                className="hidden rounded-full border border-slate-200 px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 sm:inline-flex"
              >
                ログアウト
              </button>
            )}
            <p
              className="text-[10px] font-semibold tracking-[0.22em] sm:text-xs sm:tracking-[0.28em]"
              style={{ color: GOLD }}
            >
              {eyebrow}
            </p>
          </div>
        </div>

        <nav
          aria-label="インストラクターメニュー"
          className="flex flex-wrap items-center gap-1.5 sm:gap-2"
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.match);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3.5 py-2 text-[12px] font-semibold tracking-[-0.01em] transition sm:px-4 sm:text-[13px] ${
                  active
                    ? "text-white"
                    : "text-slate-500 hover:bg-slate-100 hover:text-[#071426]"
                }`}
                style={active ? { backgroundColor: NAVY } : undefined}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          {showAdmin && (
            <Link
              href="/admin"
              className={`rounded-full px-3.5 py-2 text-[12px] font-semibold tracking-[-0.01em] transition sm:px-4 sm:text-[13px] ${
                pathname.startsWith("/admin")
                  ? "text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-[#071426]"
              }`}
              style={
                pathname.startsWith("/admin")
                  ? { backgroundColor: GOLD }
                  : undefined
              }
            >
              管理
            </Link>
          )}
          {showLogout && (
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full px-3.5 py-2 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-100 sm:hidden"
            >
              ログアウト
            </button>
          )}
        </nav>
      </div>
    </div>
  );
}
