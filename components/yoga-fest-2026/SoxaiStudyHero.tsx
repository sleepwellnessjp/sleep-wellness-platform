"use client";

import { GOLD_LIGHT } from "@/components/ui/tokens";

export default function SoxaiStudyHero() {
  return (
    <header className="relative -mx-4 overflow-hidden rounded-[1.75rem] sm:-mx-6">
      <div
        className="relative px-5 py-10 sm:px-8 sm:py-12"
        style={{
          background: [
            "linear-gradient(145deg,",
            "#070f1c 0%,",
            "#0c1628 35%,",
            "#121e34 65%,",
            "#1a2740 100%)",
          ].join(" "),
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            background: `radial-gradient(ellipse 80% 60% at 100% 0%, ${GOLD_LIGHT}33 0%, transparent 55%)`,
          }}
        />
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#8a6a2d]/60 to-transparent"
          aria-hidden
        />

        <div className="relative space-y-5">
          <p className="text-xs font-semibold tracking-[0.22em] text-[#d8b36a]">
            YOGA FEST YOKOHAMA 2026
          </p>
          <h1 className="text-3xl font-semibold leading-tight tracking-[-0.04em] text-[#f5f2ea] sm:text-4xl">
            ヨガを、見える化する。
          </h1>
          <p className="text-base font-semibold leading-relaxed text-[#e8dcc8] sm:text-lg">
            ヨガフェスタ横浜2026 スマートリング検証実験 参加登録
          </p>
          <p className="max-w-xl text-sm leading-7 text-[#c8c0b4] sm:text-base sm:leading-8">
            クラスの間、指にリングを着けるだけ。あなたのヨガの時間が、ヨガの価値を伝える新しいデータになります。
          </p>
        </div>
      </div>
    </header>
  );
}
