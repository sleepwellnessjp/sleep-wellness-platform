"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { FOCUS_RING, GOLD } from "@/components/ui/tokens";
import type { CSSProperties, ReactNode } from "react";

const FROST_TEXT = "#F5F2EA";
const FROST_STYLE: CSSProperties = {
  color: FROST_TEXT,
  background: "rgba(16, 28, 54, 0.62)",
  borderColor: "rgba(198, 168, 106, 0.38)",
  backdropFilter: "blur(16px) saturate(1.3)",
  WebkitBackdropFilter: "blur(16px) saturate(1.3)",
  boxShadow: "0 8px 28px rgba(10, 18, 36, 0.28)",
};

function feedbackHref(pathname: string): string {
  const params = new URLSearchParams();
  params.set("from", pathname || "/");
  return `/feedback?${params.toString()}`;
}

/** /sleep/* 配下かどうか（モバイルタブバーが表示されるページ） */
function isSleepPage(pathname: string): boolean {
  return pathname === "/sleep" || pathname.startsWith("/sleep/");
}

function BetaBadgeLabel() {
  return (
    <>
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-white"
        style={{ backgroundColor: GOLD }}
      >
        BETA
      </span>
      <span
        className="text-[11px] font-semibold tabular-nums tracking-[-0.01em]"
        style={{ color: FROST_TEXT }}
      >
        {`v${APP_VERSION_LABEL}`}
      </span>
    </>
  );
}

function frostClass(extra: string): string {
  return `pointer-events-auto items-center rounded-full border border-white/50 backdrop-blur-md backdrop-saturate-150 ${extra}`;
}

/**
 * Version 1.0 Beta 運用用の固定 UI（全画面右下）
 * BETA バッジ · Version · フィードバック導線
 *
 * /sleep/* モバイルではタブバーより下の z-index にし、
 * 余白は globals.css の [data-sleep-page] でタブバーの上へ積む。
 * 幅広のフィードバックボタンはプレーヤーを隠すためモバイルでは出さない。
 */
export default function BetaChrome() {
  const pathname = usePathname() || "/";
  const onFeedback = pathname === "/feedback" || pathname.startsWith("/feedback/");
  const sleep = isSleepPage(pathname);

  let badge: ReactNode;
  if (sleep && !onFeedback) {
    badge = (
      <Link
        href={feedbackHref(pathname)}
        className={frostClass(`flex gap-2 px-3 py-1.5 ${FOCUS_RING}`)}
        style={FROST_STYLE}
        aria-label="フィードバックを送る"
      >
        <BetaBadgeLabel />
      </Link>
    );
  } else {
    badge = (
      <div
        className={frostClass("flex gap-2 px-3 py-1.5")}
        style={FROST_STYLE}
        aria-label="Beta"
      >
        <BetaBadgeLabel />
      </div>
    );
  }

  return (
    <div
      className={[
        "pointer-events-none fixed right-0 bottom-0 flex flex-col items-end gap-2",
        "px-3 pt-3",
        "pr-[max(0.75rem,env(safe-area-inset-right))]",
        "sm:px-4 sm:pt-4",
        sleep
          ? "z-40"
          : "z-[70] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
      ].join(" ")}
      data-beta-chrome
      data-sleep-page={sleep ? "" : undefined}
      aria-label="Version 1.0 Beta 情報"
    >
      {badge}

      {!onFeedback ? (
        <Link
          href={feedbackHref(pathname)}
          className={frostClass(
            `min-h-11 justify-center px-4 text-[12px] font-semibold transition active:scale-[0.98] sm:min-h-10 sm:px-5 sm:text-[13px] sm:hover:opacity-90 ${FOCUS_RING} ${
              sleep ? "hidden sm:inline-flex" : "inline-flex"
            }`,
          )}
          style={FROST_STYLE}
        >
          フィードバックを送る
        </Link>
      ) : null}
    </div>
  );
}
