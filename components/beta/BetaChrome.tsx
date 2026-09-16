"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { FOCUS_RING, GOLD } from "@/components/ui/tokens";
import {
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

const FROST_TEXT = "#F5F2EA";
const FROST_STYLE: CSSProperties = {
  color: FROST_TEXT,
  background: "rgba(16, 28, 54, 0.45)",
  borderColor: "rgba(198, 168, 106, 0.3)",
  backdropFilter: "blur(12px) saturate(1.2)",
  WebkitBackdropFilter: "blur(12px) saturate(1.2)",
  boxShadow: "0 6px 18px rgba(10, 18, 36, 0.2)",
};

function feedbackHref(pathname: string): string {
  const params = new URLSearchParams();
  params.set("from", pathname || "/");
  return `/feedback?${params.toString()}`;
}

function BetaBadgeLabel() {
  return (
    <>
      <span
        className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-[0.16em] text-white"
        style={{ backgroundColor: GOLD }}
      >
        BETA
      </span>
      <span
        className="text-[10px] font-semibold tabular-nums tracking-[-0.01em]"
        style={{ color: FROST_TEXT }}
      >
        {`v${APP_VERSION_LABEL}`}
      </span>
    </>
  );
}

function frostClass(extra: string): string {
  return `pointer-events-auto items-center rounded-full border border-white/40 backdrop-blur-md backdrop-saturate-150 ${extra}`;
}

/**
 * Version 1.0 Beta 運用用の固定 UI
 * BETA バッジ · Version · フィードバック導線
 *
 * 通常は右下（タブバーより上、余白は globals.css）。
 * /sleep/* ではサイトヘッダー右に置く。
 *
 * カード文言を隠さないため:
 * - 常時やや透過
 * - スクロール中はさらに薄く＋クリック透過
 * - フィードバックボタンはホバー時のみ（占有面積を最小化）
 */
export default function BetaChrome() {
  const pathname = usePathname() || "/";
  const [scrolling, setScrolling] = useState(false);
  const onFeedback =
    pathname === "/feedback" || pathname.startsWith("/feedback/");
  const sleepSurface =
    pathname === "/sleep" ||
    pathname.startsWith("/sleep/") ||
    pathname === "/melatonin-yoga/vision" ||
    pathname === "/academy/certified-instructor";

  useEffect(() => {
    if (sleepSurface) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastY = window.scrollY;

    const markScrolling = () => {
      setScrolling(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), 220);
    };

    const onScroll = () => {
      const y = window.scrollY;
      if (y !== lastY) {
        lastY = y;
        markScrolling();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    document.addEventListener("scroll", onScroll, { passive: true, capture: true });
    const interval = window.setInterval(onScroll, 80);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("scroll", onScroll, true);
      window.clearInterval(interval);
      if (timer) clearTimeout(timer);
    };
  }, [sleepSurface]);

  let badge: ReactNode;
  if (!onFeedback) {
    badge = (
      <Link
        href={feedbackHref(pathname)}
        className={frostClass(`flex gap-1.5 px-2.5 py-1 ${FOCUS_RING}`)}
        style={FROST_STYLE}
        aria-label="フィードバックを送る"
        tabIndex={scrolling && !sleepSurface ? -1 : undefined}
      >
        <BetaBadgeLabel />
      </Link>
    );
  } else {
    badge = (
      <div
        className={frostClass("flex gap-1.5 px-2.5 py-1")}
        style={FROST_STYLE}
        aria-label="Beta"
      >
        <BetaBadgeLabel />
      </div>
    );
  }

  return (
    <div
      className={
        sleepSurface
          ? "pointer-events-none fixed right-0 top-0 z-40 flex flex-col items-end gap-2 px-3 pt-[calc(env(safe-area-inset-top,0px)+1.15rem)] pr-[max(3.75rem,calc(env(safe-area-inset-right)+3.25rem))] sm:z-[70] sm:pt-3.5 sm:pr-[5.5rem]"
          : "group/beta pointer-events-none fixed right-0 bottom-0 z-40 flex flex-col items-end gap-1.5 px-2.5 pt-2 pr-[max(0.5rem,env(safe-area-inset-right))] sm:z-[70] sm:gap-1.5 sm:px-3 sm:pt-2"
      }
      data-beta-chrome
      data-beta-chrome-placement={
        sleepSurface ? "sleep-header-right" : "default"
      }
      data-beta-chrome-scrolling={scrolling && !sleepSurface ? "1" : "0"}
      aria-label="Version 1.0 Beta 情報"
    >
      {badge}

      {/* PC: ホバー時のみ広いフィードバックを出し、常時の占有を避ける */}
      {!onFeedback && !sleepSurface ? (
        <Link
          href={feedbackHref(pathname)}
          className={frostClass(
            `hidden min-h-9 justify-center px-3.5 text-[11px] font-semibold transition active:scale-[0.98] sm:inline-flex sm:min-h-9 sm:px-4 sm:text-[12px] sm:opacity-0 sm:pointer-events-none sm:group-hover/beta:opacity-100 sm:group-hover/beta:pointer-events-auto sm:hover:opacity-90 ${FOCUS_RING}`,
          )}
          style={FROST_STYLE}
          tabIndex={scrolling ? -1 : undefined}
        >
          フィードバックを送る
        </Link>
      ) : null}
    </div>
  );
}
