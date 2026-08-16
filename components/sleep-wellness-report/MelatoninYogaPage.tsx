"use client";

import { GOLD, NAVY, TEAL } from "@/components/ui/tokens";
import type { YogaPracticeCard } from "@/lib/sleep-analysis/counseling-script";
import type { CounselingHomeworkItem } from "@/lib/sleep-analysis/counseling-script";

function YogaCard({ card }: { card: YogaPracticeCard }) {
  const accent = card.id === "day" ? TEAL : NAVY;
  return (
    <article className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p
            className="text-[10px] font-semibold tracking-[0.18em]"
            style={{ color: accent }}
          >
            {card.brandTitle}
          </p>
          <h2
            className="mt-1 text-[1.2rem] font-semibold tracking-[-0.02em]"
            style={{ color: NAVY }}
          >
            {card.label}
          </h2>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{
            color: accent,
            background: `${accent}14`,
          }}
        >
          推奨 {card.phase}
        </span>
      </div>

      <dl className="mt-5 space-y-3 text-[13px] leading-6">
        <div className="rounded-2xl bg-[#f8f8f7] px-4 py-3">
          <dt className="text-[11px] font-semibold text-slate-500">実施時間</dt>
          <dd className="mt-1 font-medium" style={{ color: NAVY }}>
            {card.duration}
          </dd>
        </div>
        <div className="rounded-2xl bg-[#f8f8f7] px-4 py-3">
          <dt className="text-[11px] font-semibold text-slate-500">目的</dt>
          <dd className="mt-1" style={{ color: NAVY }}>
            {card.purpose}
          </dd>
        </div>
        <div className="rounded-2xl bg-[#f8f8f7] px-4 py-3">
          <dt className="text-[11px] font-semibold text-slate-500">
            推奨呼吸法
          </dt>
          <dd className="mt-1" style={{ color: NAVY }}>
            {card.breathing}
          </dd>
        </div>
        <div className="rounded-2xl bg-[#fffdf8] px-4 py-3">
          <dt
            className="text-[11px] font-semibold"
            style={{ color: GOLD }}
          >
            期待される効果
          </dt>
          <dd className="mt-1" style={{ color: NAVY }}>
            {card.expectedEffect}
          </dd>
        </div>
      </dl>
    </article>
  );
}

export default function MelatoninYogaPage({
  yogaCards,
  conversationScript,
  homework,
  clientName,
}: {
  yogaCards: YogaPracticeCard[];
  conversationScript: string;
  homework: CounselingHomeworkItem[];
  clientName?: string | null;
}) {
  return (
    <section className="swr-print-page swr-print-page-2 space-y-5">
      <header className="swr-print-avoid rounded-[24px] border border-[rgba(138,106,45,0.25)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          PAGE 2 · PRACTICE
        </p>
        <h1
          className="mt-1 text-[1.45rem] font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          Melatonin Yoga™
        </h1>
        <p className="mt-1.5 text-[13px] text-slate-500">
          {clientName ? `${clientName} 様向け · ` : ""}
          間のヨガ™ / メラトニンヨガ™
        </p>
      </header>

      <div className="space-y-4">
        {yogaCards.map((card) => (
          <YogaCard key={card.id} card={card} />
        ))}
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Conversation Guide
        </p>
        <p className="mt-2 text-[12px] text-slate-500">
          認定講師がそのまま読める説明
        </p>
        <p
          className="mt-4 whitespace-pre-line text-[15px] font-medium leading-8"
          style={{ color: NAVY }}
        >
          {conversationScript}
        </p>
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Homework
        </p>
        <h2
          className="mt-1 text-[1.15rem] font-semibold"
          style={{ color: NAVY }}
        >
          次回までの宿題
        </h2>
        <ul className="mt-4 space-y-2.5">
          {homework.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-2xl bg-[#f8f8f7] px-4 py-3.5 text-[14px] leading-6"
              style={{ color: NAVY }}
            >
              <span className="text-slate-400">□</span>
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
