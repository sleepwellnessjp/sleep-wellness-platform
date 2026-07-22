"use client";

import { useMemo, type ReactNode } from "react";
import { GOLD, NAVY } from "@/components/client-profile/form-ui";
import {
  buildProfileAiSummaryStructured,
  renderFocusStars,
  type ProfileAiSummaryStructured,
} from "@/lib/client-profiles/ai-input";
import type { ClientProfileSections } from "@/lib/client-profiles/types";

type Props = {
  sections: ClientProfileSections;
  /** 右上に寄せるコンパクト表示 */
  compact?: boolean;
};

/** AI分析で統合利用される情報ソース */
const ANALYSIS_SOURCE_ITEMS = [
  "睡眠データ",
  "固定プロフィール",
  "SOXAIデータ",
  "睡眠習慣",
  "飲酒習慣",
  "運動習慣",
  "勤務状況",
  "睡眠環境",
] as const;

function AnalysisSourcesBlock() {
  return (
    <div className="rounded-2xl border border-[#8a6a2d]/18 bg-gradient-to-br from-[#faf8f4] via-white to-[#f7f5f0] px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-center gap-2">
        <span
          className="h-px w-4 bg-[#8a6a2d]/50"
          aria-hidden
        />
        <p
          className="text-[10px] font-semibold tracking-[0.2em] sm:text-[11px]"
          style={{ color: GOLD }}
        >
          ANALYSIS INPUTS
        </p>
      </div>
      <h3
        className="mt-2 text-[13px] font-semibold tracking-[-0.02em] sm:text-[14px]"
        style={{ color: NAVY }}
      >
        AI分析で利用される情報
      </h3>

      <ul className="mt-3.5 grid grid-cols-2 gap-x-3 gap-y-2">
        {ANALYSIS_SOURCE_ITEMS.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-[13px] leading-5 tracking-[-0.01em] text-slate-600 sm:text-[14px] sm:leading-6"
          >
            <span
              className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#8a6a2d]/35 bg-white text-[9px] font-semibold"
              style={{ color: GOLD }}
              aria-hidden
            >
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 border-t border-[#8a6a2d]/12 pt-3 text-[12px] leading-6 text-slate-500 sm:text-[13px] sm:leading-7">
        この情報を統合して
        <br className="sm:hidden" />
        パーソナライズ分析を行います。
      </p>
    </div>
  );
}

function BulletBlock({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <h3
        className="text-[12px] font-semibold tracking-[0.04em] sm:text-[13px]"
        style={{ color: NAVY }}
      >
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-[14px] leading-6 tracking-[-0.01em] text-slate-600 sm:text-[15px] sm:leading-7"
          >
            <span className="shrink-0 text-[#8a6a2d]" aria-hidden>
              ・
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function FocusBlock({ summary }: { summary: ProfileAiSummaryStructured }) {
  if (summary.focusItems.length === 0) return null;

  return (
    <div>
      <h3
        className="text-[12px] font-semibold tracking-[0.04em] sm:text-[13px]"
        style={{ color: NAVY }}
      >
        【AIが分析時に重視する項目】
      </h3>
      <ul className="mt-2 space-y-1.5">
        {summary.focusItems.map((item) => (
          <li
            key={item.label}
            className="flex items-baseline gap-2.5 text-[14px] leading-6 tracking-[-0.01em] text-slate-600 sm:text-[15px] sm:leading-7"
          >
            <span
              className="shrink-0 tracking-[0.08em]"
              style={{ color: GOLD }}
              aria-label={`${item.stars} / 5`}
            >
              {renderFocusStars(item.stars)}
            </span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardShell({
  compact,
  children,
}: {
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`relative overflow-hidden rounded-[24px] border border-[#8a6a2d]/20 bg-white shadow-[0_16px_48px_-40px_rgba(15,23,42,0.28)] ${
        compact ? "sm:ml-auto sm:max-w-md" : ""
      }`}
      aria-label="AIプロフィール要約"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(216,179,106,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8a6a2d]/45 to-transparent"
        aria-hidden
      />
      <div className="relative px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

export default function ProfileAiSummaryCard({ sections, compact }: Props) {
  const summary = useMemo(
    () => buildProfileAiSummaryStructured(sections),
    [sections],
  );

  if (!summary) {
    return (
      <CardShell compact={compact}>
        <p
          className="text-[11px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          AI COMMENT
        </p>
        <h2
          className="mt-1.5 text-base font-semibold tracking-[-0.02em] sm:text-lg"
          style={{ color: NAVY }}
        >
          AIプロフィール要約
        </h2>
        <p className="mt-4 text-[14px] leading-7 text-slate-500">
          固定プロフィールの入力が少なく、要約できる特徴はまだ少ない
        </p>
        <div className="mt-5">
          <AnalysisSourcesBlock />
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell compact={compact}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[11px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            AI COMMENT
          </p>
          <h2
            className="mt-1.5 text-base font-semibold tracking-[-0.02em] sm:text-lg"
            style={{ color: NAVY }}
          >
            AIプロフィール要約
          </h2>
        </div>
        <span
          className="shrink-0 rounded-full border border-[#8a6a2d]/25 bg-[#faf7f0] px-2.5 py-1 text-[10px] font-semibold tracking-[0.12em]"
          style={{ color: GOLD }}
        >
          FOR ANALYSIS
        </span>
      </div>

      <div className="mt-4 space-y-4 border-t border-[#8a6a2d]/12 pt-4">
        <BulletBlock title="【生活スタイル】" items={summary.lifestyle} />
        <BulletBlock
          title="【睡眠へ影響しそうな要素】"
          items={summary.sleepFactors}
        />
        <FocusBlock summary={summary} />
      </div>

      <div className="mt-5">
        <AnalysisSourcesBlock />
      </div>

      <p className="mt-4 text-[12px] leading-6 text-slate-400 sm:text-[13px]">
        診断ではなく、AIが分析時に参照するプロフィール要約です。
      </p>
    </CardShell>
  );
}
