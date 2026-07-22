"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import OsGlobalSearch from "@/components/os/OsGlobalSearch";
import OsNotificationCenter from "@/components/os/OsNotificationCenter";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { useAuth } from "@/lib/auth/use-auth";
import {
  homePathForRole,
} from "@/lib/safe-redirect";
import type { OsRole } from "@/lib/os/roles";
import { OS_ROLE_EYEBROWS, normalizeOsRole } from "@/lib/os/roles";

export default function OsTopBar({
  role,
  homeHref,
}: {
  role: OsRole;
  homeHref?: string;
}) {
  const { loading, supabaseEnabled, isAuthenticated, isDemoMode, email, signOut } =
    useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const showAuth =
    !loading && ((supabaseEnabled && isAuthenticated) || isDemoMode);
  const resolvedHome = homeHref ?? homePathForRole(role);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setNotificationsOpen(false);
        setMenuOpen(false);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setNotificationsOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [menuOpen]);

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <Link href={resolvedHome} className="flex shrink-0 items-center gap-3">
          <Image
            src="/swij-logo-horizontal.png"
            alt="Sleep Wellness Institute Japan"
            width={160}
            height={40}
            className="h-auto w-[120px] sm:w-[140px]"
            priority
          />
          <span
            className="hidden text-[10px] font-semibold tracking-[0.22em] lg:inline"
            style={{ color: GOLD }}
          >
            {OS_ROLE_EYEBROWS[role]} · OS
          </span>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              setSearchOpen(true);
              setNotificationsOpen(false);
              setMenuOpen(false);
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-2xl border border-slate-200/90 bg-white px-3 text-[12px] font-semibold text-slate-500 transition hover:bg-slate-50 sm:px-3.5"
            aria-label="全画面検索"
          >
            <span aria-hidden className="text-slate-400">
              ⌕
            </span>
            <span className="hidden sm:inline">検索</span>
            <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 md:inline">
              ⌘K
            </kbd>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((open) => !open);
                setMenuOpen(false);
                setSearchOpen(false);
              }}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/90 bg-white text-slate-500 transition hover:bg-slate-50"
              aria-label="通知センター"
              aria-expanded={notificationsOpen}
            >
              <span aria-hidden className="text-[15px]">
                ●
              </span>
            </button>
            {notificationsOpen ? (
              <OsNotificationCenter
                onClose={() => setNotificationsOpen(false)}
              />
            ) : null}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((open) => !open);
                setNotificationsOpen(false);
              }}
              className="inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border border-slate-200/90 bg-white px-3 text-[12px] font-semibold transition hover:bg-slate-50"
              style={{ color: NAVY }}
              aria-label="アカウントメニュー"
              aria-expanded={menuOpen}
            >
              {isDemoMode ? "Demo" : email?.slice(0, 1).toUpperCase() || "SW"}
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-slate-200/90 bg-white py-2 shadow-[0_24px_60px_-40px_rgba(7,20,38,0.45)]">
                <p className="px-4 py-2 text-[11px] text-slate-400">
                  {isDemoMode ? "デモセッション" : email || "アカウント"}
                </p>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2.5 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  設定
                </Link>
                {showAuth ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      void signOut().then(() => {
                        window.location.href = "/login";
                      });
                    }}
                    className="block w-full px-4 py-2.5 text-left text-[13px] font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    ログアウト
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {searchOpen ? (
        <OsGlobalSearch onClose={() => setSearchOpen(false)} />
      ) : null}
    </>
  );
}

export function useResolvedOsRole(fallback: OsRole = "instructor"): OsRole {
  const { isDemoMode } = useAuth();
  const [role, setRole] = useState<OsRole>(
    isDemoMode ? fallback : fallback,
  );

  useEffect(() => {
    if (isDemoMode) {
      setRole(fallback);
      return;
    }
    let cancelled = false;
    void fetch("/api/platform/me", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((json: { profile?: { role?: string } } | null) => {
        if (cancelled) return;
        setRole(normalizeOsRole(json?.profile?.role ?? fallback));
      })
      .catch(() => {
        if (!cancelled) setRole(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [fallback, isDemoMode]);

  return role;
}
