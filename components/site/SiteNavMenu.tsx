"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FOCUS_RING, GOLD, GOLD_MID, NAVY } from "@/components/ui/tokens";
import { useAuth } from "@/lib/auth/use-auth";
import { HOME_TOP_HREF } from "@/lib/home-intro";

const ANALYSIS_HREF = "/analysis/new";
const ANALYSIS_LOGIN_HREF = `/login?redirect=${encodeURIComponent(ANALYSIS_HREF)}`;

export const SITE_NAV_ITEMS = [
  { label: "トップ", href: HOME_TOP_HREF },
  { label: "Sleep Wellness Method™", href: "/#about" },
  { label: "私たちについて", href: "/about" },
  { label: "睡眠ウェルネス・プログラム", href: "/pricing" },
  { label: "認定校・講座", href: "/school" },
  { label: "メラトニンヨガ™認定講師", href: "/instructors" },
  { label: "認定インストラクターの活動", href: "/instructor-activities" },
  { label: "ワークショップ・リトリート", href: "/retreat" },
  { label: "研究・実証", href: "/research" },
  { label: "エビデンス", href: "/evidence" },
  { label: "睡眠学", href: "/sleep/science" },
  {
    label: "クライアントの分析",
    href: ANALYSIS_HREF,
    badge: "認定講師専用",
    requiresAuth: true,
  },
  { label: "認定講師専用ページ", href: "/login" },
  { label: "お問い合わせ", href: "/contact" },
] as const;

type SiteNavMenuProps = {
  /** Hero など暗い背景向け */
  tone?: "dark" | "light";
  className?: string;
};

function isActivePath(
  pathname: string,
  href: string,
  hash: string,
): boolean {
  if (href === "/" || href === HOME_TOP_HREF) {
    return pathname === "/" && (hash === "" || hash === "#top");
  }
  if (href.startsWith("/#")) {
    return pathname === "/" && hash === href.slice(1);
  }
  const base = href.split("?")[0]?.split("#")[0] ?? href;
  if (base === "/pricing") {
    return pathname === "/pricing" || pathname.startsWith("/pricing/");
  }
  if (base === "/analysis/new") {
    return pathname === "/analysis/new" || pathname.startsWith("/analysis/");
  }
  if (base === "/school") {
    return pathname === "/school" || pathname.startsWith("/school/");
  }
  if (base === "/retreat") {
    return pathname === "/retreat" || pathname.startsWith("/retreat/");
  }
  if (base === "/research") {
    return pathname === "/research" || pathname.startsWith("/research/");
  }
  if (base === "/instructors") {
    return pathname === "/instructors" || pathname.startsWith("/instructors/");
  }
  if (base === "/instructor-activities") {
    return (
      pathname === "/instructor-activities" ||
      pathname.startsWith("/instructor-activities/")
    );
  }
  if (base === "/contact") {
    return pathname === "/contact" || pathname.startsWith("/contact/");
  }
  if (base === "/login") {
    return pathname === "/login" || pathname.startsWith("/login/");
  }
  return pathname === base || pathname.startsWith(`${base}/`);
}

/**
 * サイト共通ハンバーガーメニュー。
 * スマホはフルスクリーン、sm以上は右ドロワー。
 * 既存ページ内容は変更せず、ヘッダーに載せて使う。
 */
export default function SiteNavMenu({
  tone = "dark",
  className = "",
}: SiteNavMenuProps) {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [hash, setHash] = useState("");
  const [mounted, setMounted] = useState(false);
  const scrollLockY = useRef(0);
  const titleId = useId();
  const lightIcon = tone === "light";
  const { loading, isAuthenticated } = useAuth();
  const canOpenAnalysis = !loading && isAuthenticated;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);
    syncHash();
    window.addEventListener("hashchange", syncHash);
    return () => window.removeEventListener("hashchange", syncHash);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const { body, documentElement } = document;
    const scrollY = scrollLockY.current;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: documentElement.style.overflow,
    };
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      documentElement.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    };
  }, [open]);

  const menuPanel =
    mounted && open
      ? createPortal(
          <div className="fixed inset-0 z-[300]" role="presentation">
            {/* PC: ドロワー背後のスクリム。スマホはフルスクリーンのため非表示 */}
            <button
              type="button"
              aria-label="メニューを閉じる"
              className="absolute inset-0 hidden bg-black/50 sm:block"
              onClick={() => setOpen(false)}
            />

            <aside
              id={titleId}
              role="dialog"
              aria-modal="true"
              aria-label="サイトメニュー"
              className="absolute inset-0 flex h-[100dvh] max-h-[100dvh] w-full max-w-none flex-col overflow-hidden bg-white sm:inset-y-0 sm:left-auto sm:right-0 sm:w-[380px] sm:max-w-[420px] sm:shadow-[-12px_0_40px_rgba(7,20,38,0.18)]"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[rgba(7,20,38,0.08)] px-4 pb-1.5 pt-[calc(env(safe-area-inset-top,0px)+16px)] sm:px-5 sm:pb-2 sm:pt-3">
                <p
                  className="text-[10px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  MENU
                </p>
                <button
                  type="button"
                  aria-label="閉じる"
                  onClick={() => setOpen(false)}
                  className={`inline-flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-full text-[#071426] transition hover:bg-[#071426]/05 ${FOCUS_RING}`}
                >
                  <span className="relative block h-3.5 w-3.5" aria-hidden>
                    <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 rotate-45 rounded-full bg-[#071426]" />
                    <span className="absolute left-0 top-1/2 h-[1.5px] w-full -translate-y-1/2 -rotate-45 rounded-full bg-[#071426]" />
                  </span>
                </button>
              </div>

              {/* 短い画面ではナビ領域のみ縦スクロール（ページ本体は固定） */}
              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-0.5 [-webkit-overflow-scrolling:touch] sm:px-4 sm:py-1.5">
                <ul className="flex flex-col gap-0">
                  {SITE_NAV_ITEMS.map((item) => {
                    const active = isActivePath(pathname, item.href, hash);
                    const href =
                      "requiresAuth" in item && item.requiresAuth
                        ? canOpenAnalysis
                          ? item.href
                          : ANALYSIS_LOGIN_HREF
                        : item.href;
                    const badge = "badge" in item ? item.badge : null;
                    const hashId = href.startsWith("/#")
                      ? href.slice(2)
                      : null;
                    return (
                      <li key={item.label}>
                        <Link
                          href={href}
                          onClick={(event) => {
                            if (!hashId) {
                              setOpen(false);
                              return;
                            }
                            event.preventDefault();
                            const el = document.getElementById(hashId);
                            if (pathname === "/" && el) {
                              // メニュー閉じ時の scroll 復元先を Method セクションへ上書き
                              const y =
                                el.getBoundingClientRect().top +
                                scrollLockY.current;
                              scrollLockY.current = Math.max(0, y);
                              setOpen(false);
                              window.history.pushState(null, "", `/#${hashId}`);
                              setHash(`#${hashId}`);
                              window.setTimeout(() => {
                                document
                                  .getElementById(hashId)
                                  ?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                              }, 40);
                              return;
                            }
                            setOpen(false);
                            window.setTimeout(() => {
                              window.location.assign(`/#${hashId}`);
                            }, 40);
                          }}
                          className={`flex min-h-9 flex-col justify-center rounded-lg px-2.5 py-0.5 transition sm:min-h-[36px] sm:rounded-lg sm:px-3 sm:py-1 ${FOCUS_RING} ${
                            active
                              ? "bg-[rgba(138,106,45,0.08)]"
                              : "hover:bg-[#f7f7f5]"
                          }`}
                          style={{ color: active ? GOLD_MID : NAVY }}
                        >
                          <span className="block text-[14px] font-semibold leading-snug tracking-[-0.02em] sm:text-[15px] sm:leading-tight">
                            {item.label}
                          </span>
                          {badge ? (
                            <span
                              className="mt-0 block text-[10px] font-medium leading-tight tracking-[0.04em] sm:text-[10.5px]"
                              style={{ color: GOLD }}
                            >
                              {badge}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-1 border-t border-[rgba(7,20,38,0.08)] pt-1 sm:mt-2 sm:pt-2">
                  <p
                    className="text-[12px] font-semibold leading-tight tracking-[0.02em] sm:text-[12.5px]"
                    style={{ color: NAVY }}
                  >
                    間の書
                  </p>
                  <p className="mt-0.5 text-[10.5px] leading-snug tracking-[0.01em] text-[rgba(7,20,38,0.62)] sm:text-[11px]">
                    日本の「間」の思想を、もう少し深く知りたい方へ。
                    <br />
                    『間の書』要約版をご覧いただけます。
                  </p>
                  <Link
                    href="/ma-no-sho"
                    onClick={() => setOpen(false)}
                    className={`mt-0.5 inline-flex min-h-8 items-center gap-1 rounded-full text-[11.5px] font-medium tracking-[0.01em] transition hover:opacity-80 sm:mt-1 sm:text-[12px] ${FOCUS_RING}`}
                    style={{ color: GOLD_MID }}
                  >
                    <span aria-hidden>→</span>
                    <span>間の書 要約版を読む</span>
                  </Link>
                </div>
              </nav>

              <div className="shrink-0 border-t border-[rgba(7,20,38,0.08)] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+20px)] pt-2 sm:px-4 sm:pb-2.5 sm:pt-2.5">
                <Link
                  href="/contact"
                  onClick={() => setOpen(false)}
                  className={`inline-flex min-h-9 w-full items-center justify-center rounded-full text-[13px] font-semibold text-white transition hover:opacity-90 sm:min-h-10 sm:text-sm ${FOCUS_RING}`}
                  style={{ background: NAVY }}
                >
                  お問い合わせ
                </Link>
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        aria-label="メニューを開く"
        aria-expanded={open}
        aria-controls={titleId}
        onClick={() => {
          scrollLockY.current = window.scrollY;
          setOpen(true);
        }}
        className={`inline-flex h-12 w-12 min-h-11 min-w-11 items-center justify-center rounded-full transition sm:h-11 sm:w-11 ${FOCUS_RING} ${
          lightIcon
            ? "text-white hover:bg-white/10"
            : "text-[#071426] hover:bg-[#071426]/05"
        }`}
      >
        <span className="flex w-[18px] flex-col gap-[5px]" aria-hidden>
          <span
            className={`h-[1.5px] w-full rounded-full ${
              lightIcon ? "bg-white" : "bg-[#071426]"
            }`}
          />
          <span
            className={`h-[1.5px] w-full rounded-full ${
              lightIcon ? "bg-white" : "bg-[#071426]"
            }`}
          />
          <span
            className={`h-[1.5px] w-full rounded-full ${
              lightIcon ? "bg-white" : "bg-[#071426]"
            }`}
          />
        </span>
      </button>

      {menuPanel}
    </div>
  );
}
