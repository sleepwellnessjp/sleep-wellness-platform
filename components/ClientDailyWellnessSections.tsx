"use client";

import Image from "next/image";
import { useState } from "react";
import type { AnalysisResult } from "@/lib/analysis-session";
import {
  pickDailyAdvice,
  pickDailyBreathing,
  pickDailyMelatoninYoga,
  pickDailyTrivia,
} from "@/lib/client-daily-content";

const NAVY = "#071426";
const GOLD = "#8a6a2d";
const GOLD_LIGHT = "#d8b36a";

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M8.5 6.8v10.4c0 .7.75 1.1 1.35.7l8.1-5.2c.55-.35.55-1.15 0-1.5l-8.1-5.2c-.6-.4-1.35 0-1.35.8Z" />
    </svg>
  );
}

function MediaPlayOverlay() {
  return (
    <span
      className="absolute inset-0 flex items-center justify-center"
      aria-hidden
    >
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_12px_40px_-12px_rgba(7,20,38,0.55)] ring-1 ring-white/40 backdrop-blur-[2px] transition group-hover:scale-105"
        style={{
          background: `linear-gradient(145deg, ${NAVY}ee, ${NAVY})`,
        }}
      >
        <PlayIcon className="ml-0.5 h-6 w-6" />
      </span>
    </span>
  );
}

/** ① 今日の睡眠ウェルネスアドバイス */
export function ClientDailyAdviceCard({
  result,
}: {
  result?: AnalysisResult | null;
}) {
  const advice = pickDailyAdvice(result);

  return (
    <div className="rounded-[22px] border border-[#8a6a2d]/25 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-6 sm:px-7 sm:py-7">
      <p
        className="text-[10px] font-semibold tracking-[0.2em]"
        style={{ color: GOLD }}
      >
        TODAY · ONCE A DAY
      </p>
      <p className="mt-4 whitespace-pre-wrap text-[15px] leading-8 text-slate-700 sm:text-[16px] sm:leading-[1.85]">
        {advice}
      </p>
    </div>
  );
}

/** ② 今日のメラトニンヨガ™ */
export function ClientDailyYogaCard() {
  const [card] = useState(() => pickDailyMelatoninYoga());
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#071426]/08 bg-[#fafaf8]">
      <button
        type="button"
        className="group w-full text-left transition hover:bg-white"
        onClick={() => {
          setNotice(
            `「${card.title}」（${card.durationLabel}）の再生は準備中です。`,
          );
        }}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-100 sm:aspect-[16/9]">
          <Image
            src={card.thumbnailSrc}
            alt={card.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.02]"
            sizes="(max-width: 768px) 100vw, 720px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071426]/55 via-[#071426]/10 to-transparent" />
          <MediaPlayOverlay />
          <span
            className="absolute bottom-3 left-3 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.04em] text-white backdrop-blur-sm"
            style={{ backgroundColor: "rgba(7,20,38,0.55)" }}
          >
            {card.durationLabel}
          </span>
        </div>
        <div className="px-5 py-5 sm:px-6">
          <p
            className="text-[10px] font-semibold tracking-[0.18em]"
            style={{ color: GOLD }}
          >
            MELATONIN YOGA™
          </p>
          <h3
            className="mt-2 text-[1.05rem] font-semibold tracking-[-0.03em] sm:text-lg"
            style={{ color: NAVY }}
          >
            {card.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-6 text-slate-500 sm:text-[14px]">
            {card.subtitle}
          </p>
        </div>
      </button>
      {notice ? (
        <p className="border-t border-[#071426]/06 px-5 py-3 text-[13px] leading-6 text-slate-500 sm:px-6">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

/** ③ 今日の呼吸法 */
export function ClientDailyBreathingCard() {
  const [card] = useState(() => pickDailyBreathing());
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="overflow-hidden rounded-[22px] border border-[#071426]/08 bg-white">
      <button
        type="button"
        className="group flex w-full text-left transition hover:border-[#8a6a2d]/25"
        onClick={() => {
          setNotice(
            `「${card.title}」（${card.durationLabel}）のガイドは準備中です。`,
          );
        }}
      >
        <div className="relative w-[38%] shrink-0 self-stretch min-h-[9.5rem] overflow-hidden bg-slate-100 sm:w-[42%] sm:min-h-[11rem]">
          <Image
            src={card.thumbnailSrc}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="180px"
          />
          <MediaPlayOverlay />
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-5 sm:px-6 sm:py-6">
          <p
            className="text-[10px] font-semibold tracking-[0.18em]"
            style={{ color: GOLD }}
          >
            BREATHING
          </p>
          <h3
            className="mt-2 text-[1.15rem] font-semibold tracking-[-0.03em] sm:text-xl"
            style={{ color: NAVY }}
          >
            {card.title}
          </h3>
          <p className="mt-1.5 text-[13px] leading-6 text-slate-500">
            {card.method}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span
              className="inline-flex min-h-8 items-center rounded-full px-3 text-[12px] font-semibold tabular-nums text-white"
              style={{
                background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
              }}
            >
              {card.durationLabel}
            </span>
            <span className="text-[12px] text-slate-400">準備中</span>
          </div>
        </div>
      </button>
      {notice ? (
        <p className="border-t border-[#071426]/06 px-4 py-3 text-[13px] leading-6 text-slate-500 sm:px-6">
          {notice}
        </p>
      ) : null}
    </div>
  );
}

/** ④ 今日の豆知識 */
export function ClientDailyTriviaCard() {
  const [card] = useState(() => pickDailyTrivia());

  return (
    <div className="rounded-[22px] border border-[#071426]/06 bg-[#fafaf8] px-5 py-6 sm:px-7 sm:py-7">
      <p
        className="text-[10px] font-semibold tracking-[0.18em]"
        style={{ color: GOLD }}
      >
        {card.category.toUpperCase()}
      </p>
      <h3
        className="mt-3 text-[1.1rem] font-semibold tracking-[-0.03em] sm:text-lg"
        style={{ color: NAVY }}
      >
        {card.title}
      </h3>
      <p className="mt-3 text-[14px] leading-7 text-slate-600 sm:text-[15px] sm:leading-8">
        {card.body}
      </p>
    </div>
  );
}

/** ⑤ 継続日数・宿題達成率（認定講師設定の宿題ベース） */
export function ClientStreakPanel({
  streakDays,
  homeworkRate,
}: {
  streakDays: number;
  /** null = 直近30日に期限到来の宿題なし */
  homeworkRate: number | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4">
      <div className="rounded-[22px] border border-[#8a6a2d]/20 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-4 py-6 text-center sm:px-6 sm:py-8">
        <p
          className="text-[10px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          STREAK
        </p>
        <p
          className="mt-3 text-[2.75rem] leading-none font-semibold tracking-[-0.06em] tabular-nums sm:text-[3.25rem]"
          style={{ color: NAVY }}
        >
          {streakDays}
        </p>
        <p className="mt-2 text-[13px] text-slate-500 sm:text-[14px]">
          日連続
        </p>
      </div>
      <div className="rounded-[22px] border border-[#071426]/06 bg-white px-4 py-6 text-center sm:px-6 sm:py-8">
        <p
          className="text-[10px] font-semibold tracking-[0.18em]"
          style={{ color: GOLD }}
        >
          HOMEWORK
        </p>
        {homeworkRate == null ? (
          <>
            <p className="mt-4 text-[13px] leading-6 text-slate-500 sm:mt-5 sm:text-[14px] sm:leading-7">
              まだ記録が
              <br />
              ありません
            </p>
            <p className="mt-2 text-[12px] text-slate-400 sm:text-[13px]">
              宿題達成率
            </p>
          </>
        ) : (
          <>
            <p
              className="mt-3 text-[2.75rem] leading-none font-semibold tracking-[-0.06em] tabular-nums sm:text-[3.25rem]"
              style={{ color: NAVY }}
            >
              {homeworkRate}
              <span className="ml-0.5 text-[1.35rem] font-semibold tracking-normal text-slate-400 sm:text-[1.5rem]">
                %
              </span>
            </p>
            <p className="mt-2 text-[13px] text-slate-500 sm:text-[14px]">
              宿題達成率
            </p>
          </>
        )}
      </div>
    </div>
  );
}
