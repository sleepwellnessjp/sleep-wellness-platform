"use client";

import { scrollToYogaFestSoxaiRegisterSection } from "@/lib/yoga-fest-2026-soxai/scroll-to-register";

export default function SoxaiStudyRegisterBanner() {
  return (
    <button
      type="button"
      onClick={() => scrollToYogaFestSoxaiRegisterSection()}
      className="flex min-h-14 w-full flex-col items-center justify-center gap-0.5 rounded-2xl px-5 py-4 text-center shadow-md shadow-[#071426]/10 transition active:scale-[0.99] sm:min-h-[3.75rem]"
      style={{
        background:
          "linear-gradient(135deg, #e8c878 0%, #d8b36a 45%, #b89242 100%)",
      }}
    >
      <span className="text-lg font-semibold leading-snug tracking-[-0.02em] text-[#071426] sm:text-xl">
        参加登録へ進む →
      </span>
      <span className="text-xs font-medium leading-snug text-[#071426]/75 sm:text-[13px]">
        クラスの後でも登録できます・約1分
      </span>
    </button>
  );
}
