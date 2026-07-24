"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { APP_VERSION_LABEL } from "@/lib/app-version";
import { FOCUS_RING, GOLD, NAVY } from "@/components/ui/tokens";

function feedbackHref(pathname: string): string {
  const params = new URLSearchParams();
  params.set("from", pathname || "/");
  return `/feedback?${params.toString()}`;
}

/**
 * Version 1.0 Beta 運用用の固定 UI（全画面右下）
 * BETA バッジ · Version · フィードバック導線
 */
export default function BetaChrome() {
  const pathname = usePathname() || "/";
  const onFeedback = pathname === "/feedback" || pathname.startsWith("/feedback/");

  return (
    <div
      className="pointer-events-none fixed bottom-0 right-0 z-[70] flex flex-col items-end gap-2 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:p-4 sm:pb-[max(1rem,env(safe-area-inset-bottom))]"
      data-beta-chrome
      aria-label="Version 1.0 Beta 情報"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-[color:var(--sw-border)] bg-white/95 px-3 py-1.5 shadow-[0_8px_28px_-18px_rgba(7,20,38,0.45)] backdrop-blur-md">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.18em] text-white"
          style={{ backgroundColor: GOLD }}
          aria-label="Beta"
        >
          BETA
        </span>
        <span
          className="text-[11px] font-semibold tabular-nums tracking-[-0.01em]"
          style={{ color: NAVY }}
        >
          v{APP_VERSION_LABEL}
        </span>
      </div>

      {!onFeedback ? (
        <Link
          href={feedbackHref(pathname)}
          className={`pointer-events-auto inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[12px] font-semibold text-white shadow-[0_10px_32px_-18px_rgba(7,20,38,0.55)] transition active:scale-[0.98] sm:min-h-10 sm:px-5 sm:text-[13px] sm:hover:opacity-92 ${FOCUS_RING}`}
          style={{ backgroundColor: NAVY }}
        >
          フィードバックを送る
        </Link>
      ) : null}
    </div>
  );
}
