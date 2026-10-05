import Link from "next/link";
import { FOCUS_RING, GOLD_LIGHT } from "@/components/ui/tokens";

/**
 * トップ「睡眠のための言葉」直下。SleepWordsBanner と同系統の横長カード（金アクセント強め）。
 */
export default function YogaFestSoxaiHomeBanner() {
  return (
    <Link
      href="/yoga-fest-2026/soxai"
      aria-label="ヨガフェスタ横浜2026 スマートリング検証実験 参加登録"
      className={`group mx-auto mt-4 flex w-full max-w-md flex-col gap-1 rounded-[22px] border px-4 py-3.5 text-left transition duration-300 hover:-translate-y-0.5 sm:max-w-lg sm:rounded-[24px] sm:px-5 sm:py-4 ${FOCUS_RING}`}
      style={{
        borderColor: "rgba(216,179,106,0.55)",
        background:
          "linear-gradient(135deg, rgba(12,30,55,0.92) 0%, rgba(7,20,38,0.96) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(216,179,106,0.15), 0 16px 40px -32px rgba(0,0,0,0.5)",
      }}
    >
      <p
        className="text-[10px] font-semibold tracking-[0.24em] sm:text-[11px]"
        style={{ color: GOLD_LIGHT }}
      >
        YOGA FEST YOKOHAMA 2026
      </p>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-semibold leading-snug tracking-[-0.02em] text-white sm:text-base">
            ヨガを、見える化する。
          </h2>
          <p className="mt-1 text-[11px] leading-4 text-white/70 sm:text-[12px] sm:leading-5">
            スマートリング検証実験の参加登録はこちら
          </p>
        </div>
        <span
          aria-hidden
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#d8b36a]/35 text-[#d8b36a] transition group-hover:border-[#d8b36a]/60 group-hover:bg-[#d8b36a]/10"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path
              d="M6 3.5L11 8L6 12.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </div>
    </Link>
  );
}
