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

const SLIDES: Slide[] = [
  {
    eyebrow: "WELCOME",
    title: "Sleep Wellness Platformへようこそ",
    body: "睡眠科学とウェルネスの知見をもとに、あなたの眠りの質を一緒に整えていく製品です。",
    accent: "01",
  },
  {
    eyebrow: "ANALYSIS",
    title: "睡眠分析の流れ",
    body: "測定データを取り込み、AIと認定講師が結果を読み解きます。スコア・コメント・宿題が一画面にまとまります。",
    accent: "02",
  },
  {
    eyebrow: "SLEEP COACH",
    title: "Sleep Coachとは",
    body: "その日の状態に合わせた短いコーチングです。朝・昼・夜の行動ヒントを、無理のない一歩で提案します。",
    accent: "03",
  },
  {
    eyebrow: "JOURNEY",
    title: "Journeyとは",
    body: "分析の積み重ねを物語として可視化します。スコアの変化と継続の証が、あなたの改善ストーリーになります。",
    accent: "04",
  },
  {
    eyebrow: "TOGETHER",
    title: "担当講師と一緒に改善していきましょう",
    body: "宿題や次回までの目標は、認定講師があなたに合わせて設定します。一人で抱え込まず、伴走しながら進めましょう。",
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
      className="fixed inset-0 z-[90] flex items-end justify-center bg-[#071426]/45 px-4 pb-6 pt-16 backdrop-blur-[2px] sm:items-center sm:pb-8"
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

        <div className="relative px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between gap-3">
            <p
              className="text-[10px] font-semibold tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              {slide.eyebrow}
            </p>
            <span
              className="text-[11px] font-semibold tabular-nums tracking-[0.08em] text-slate-400"
            >
              {slide.accent} / 0{SLIDES.length}
            </span>
          </div>

          <h2
            id="onboarding-title"
            className="mt-4 text-[1.35rem] font-semibold tracking-[-0.04em] sm:text-[1.5rem]"
            style={{ color: NAVY }}
          >
            {slide.title}
          </h2>
          <p className="mt-3 text-[14px] leading-7 text-slate-600 sm:text-[15px]">
            {slide.body}
          </p>

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

          <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={close}
              className="min-h-10 px-2 text-[13px] font-medium text-slate-400 transition hover:text-slate-600"
            >
              スキップ
            </button>
            <div className="flex gap-2">
              {index > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setIndex((v) => Math.max(0, v - 1))}
                >
                  戻る
                </Button>
              ) : null}
              {isLast ? (
                <Button size="sm" onClick={close}>
                  はじめる
                </Button>
              ) : (
                <Button
                  size="sm"
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
