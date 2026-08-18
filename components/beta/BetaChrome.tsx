"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { FOCUS_RING, GOLD } from "@/components/ui/tokens";

const FROST_TEXT = "#F5F2EA";
const FROST_BG = "rgba(16, 28, 54, 0.62)";
const FROST_BORDER = "rgba(198, 168, 106, 0.28)";
const FROST_SHADOW = "0 8px 28px rgba(10, 18, 36, 0.28)";
const FROST_FILTER = "blur(16px) saturate(1.3)";

function feedbackHref(pathname: string): string {
  const params = new URLSearchParams();
  params.set("from", pathname || "/");
  return `/feedback?${params.toString()}`;
}

/** /sleep/* 配下かどうか（モバイルタブバーが表示されるページ） */
function isSleepPage(pathname: string): boolean {
  return pathname === "/sleep" || pathname.startsWith("/sleep/");
}

/**
 * Version 1.0 Beta 運用用の固定 UI（全画面右下）
 * BETA バッジ · Version · フィードバック導線
 *
 * /sleep/* ではモバイルタブバー（高さ約74px）の上に積む。
 * バッジ・ボタンともにすりガラス台座スタイルを適用。
 */
export default function BetaChrome() {
  const pathname = usePathname() || "/";
  const onFeedback = pathname === "/feedback" || pathname.startsWith("/feedback/");
  const sleep = isSleepPage(pathname);

  return (
    <div
      className={[
        "pointer-events-none fixed right-0 z-[70] flex flex-col items-end gap-2 p-3",
        "pr-[max(0.75rem,env(safe-area-inset-right))]",
        "sm:p-4",
        // /sleep/* のモバイルのみタブバー（≈74px）＋余白分を上に積む
        sleep
          ? "pb-[max(92px,calc(env(safe-area-inset-bottom)+92px))] sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
          : "pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-[max(1rem,env(safe-area-inset-bottom))]",
        "bottom-0",
      ].join(" ")}
      data-beta-chrome
      aria-label="Version 1.0 Beta 情報"
    >
      {/* BETA バッジ */}
      <div
        className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/50 px-3 py-1.5 backdrop-blur-md backdrop-saturate-150"
        style={{
          color: FROST_TEXT,
          background: FROST_BG,
          borderColor: FROST_BORDER,
          backdropFilter: FROST_FILTER,
          WebkitBackdropFilter: FROST_FILTER,
          boxShadow: FROST_SHADOW,
        }}
      >
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-white"
          style={{ backgroundColor: GOLD }}
          aria-label="Beta"
        >
          BETA
        </span>
        <span
          className="text-[11px] font-semibold tabular-nums tracking-[-0.01em]"
          style={{ color: FROST_TEXT }}
        >
          {`v${APP_VERSION_LABEL}`}
        </span>
      </div>

      {/* フィードバックボタン */}
      {!onFeedback ? (
        <Link
          href={feedbackHref(pathname)}
          className={`pointer-events-auto inline-flex min-h-11 items-center justify-center rounded-full border border-white/50 px-4 text-[12px] font-semibold transition active:scale-[0.98] sm:min-h-10 sm:px-5 sm:text-[13px] sm:hover:opacity-90 ${FOCUS_RING}`}
          style={{
            color: FROST_TEXT,
            background: FROST_BG,
            borderColor: FROST_BORDER,
            backdropFilter: FROST_FILTER,
            WebkitBackdropFilter: FROST_FILTER,
            boxShadow: FROST_SHADOW,
          }}
        >
          フィードバックを送る
        </Link>
      ) : null}
    </div>
  );
}
