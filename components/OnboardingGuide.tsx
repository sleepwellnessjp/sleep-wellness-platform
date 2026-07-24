"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { GOLD, GOLD_LIGHT, NAVY } from "@/components/ui/tokens";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/first-visit";

type Slide = {
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
};

/** Version 2.7 — 認定講師向け初回オンボーディング（約3分） */
const SLIDES: Slide[] = [
  {
    eyebrow: "STEP 1 · PLATFORM",
    title: "プラットフォーム紹介",
    body: "Sleep Wellness Platform は、認定講師がクライアントの睡眠改善を伴走するための OS です。分析・宿題・Journey・フィードバックが一つの流れにつながっています。",
    accent: "01",
  },
  {
    eyebrow: "STEP 2 · CLIENTS",
    title: "クライアント追加方法",
    body: "「クライアント」から新規登録するか、招待コードでポータル連携できます。プロフィールを整えてから分析に進むと、その後の提案がより正確になります。",
    accent: "02",
  },
  {
    eyebrow: "STEP 3 · ANALYSIS",
    title: "分析方法",
    body: "測定データを取り込み → 確認 → AI 分析 → 結果保存の順です。結果画面でスコアとコメントを確認し、必要ならレポートや宿題へ進めます。",
    accent: "03",
  },
  {
    eyebrow: "STEP 4 · HOMEWORK",
    title: "Homework",
    body: "分析結果に基づき、次回までの小さな行動を宿題として設定します。クライアントはポータルで確認・完了でき、講師側で実施状況を追えます。",
    accent: "04",
  },
  {
    eyebrow: "STEP 5 · FEEDBACK",
    title: "フィードバック送信",
    body: "不具合や改善要望は右下の「フィードバックを送る」から送信できます。Closed Beta では Critical〜Low の優先度で本部が対応します。安心して使いながら声を届けてください。",
    accent: "05",
  },
];

type Props = {
  /** When true, evaluate and possibly show onboarding. */
  enabled?: boolean;
};

export default function OnboardingGuide({ enabled = true }: Props) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    if (hasSeenOnboarding()) return;
    setOpen(true);
  }, [enabled]);

  const close = () => {
    markOnboardingSeen();
    setOpen(false);
  };

  if (!open) return null;

  const slide = SLIDES[index]!;
  const isLast = index === SLIDES.length - 1;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center overflow-x-hidden bg-[#071426]/45 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-16 backdrop-blur-[2px] sm:items-center sm:pb-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-[28px] border border-[#8a6a2d]/25 bg-white shadow-[0_30px_80px_-40px_rgba(7,20,38,0.55)] animate-fade-up">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(216,179,106,0.9), transparent)",
          }}
        />
        <div
          className="absolute -right-10 -top-12 h-36 w-36 rounded-full opacity-50"
          style={{
            background: `radial-gradient(circle, ${GOLD_LIGHT}55, transparent 70%)`,
          }}
          aria-hidden
        />

        <div className="relative px-5 pb-6 pt-7 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between gap-3">
            <p
              className="text-[10px] font-semibold tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              {slide.eyebrow}
            </p>
            <span className="text-[11px] font-semibold tabular-nums tracking-[0.08em] text-slate-400">
              {slide.accent} / 0{SLIDES.length}
            </span>
          </div>

          <h2
            id="onboarding-title"
            className="mt-4 break-words text-[1.35rem] font-semibold tracking-[-0.04em] sm:text-[1.5rem]"
            style={{ color: NAVY }}
          >
            {slide.title}
          </h2>
          <p className="mt-3 text-[14px] leading-7 text-slate-600 sm:text-[15px]">
            {slide.body}
          </p>
          <p className="mt-2 text-[12px] text-slate-400">約3分で完了します</p>

          <div className="mt-7 flex items-center justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 18 : 6,
                  background:
                    i === index
                      ? `linear-gradient(90deg, ${GOLD_LIGHT}, ${GOLD})`
                      : "rgba(7,20,38,0.12)",
                }}
                aria-hidden
              />
            ))}
          </div>

          <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={close}
              className="inline-flex min-h-11 items-center justify-center px-2 text-[13px] font-medium text-slate-400 transition active:text-slate-600 sm:min-h-10 sm:justify-start sm:hover:text-slate-600 sm:active:text-slate-400"
            >
              スキップ
            </button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {index > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => setIndex((v) => Math.max(0, v - 1))}
                >
                  戻る
                </Button>
              ) : null}
              {isLast ? (
                <Button size="sm" className="w-full sm:w-auto" onClick={close}>
                  はじめる
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() =>
                    setIndex((v) => Math.min(SLIDES.length - 1, v + 1))
                  }
                >
                  次へ
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
