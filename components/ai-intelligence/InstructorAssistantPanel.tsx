"use client";

import type { ReactNode } from "react";
import AiSourceBadge from "@/components/ai-intelligence/AiSourceBadge";
import { GOLD, GOLD_LIGHT, NAVY, TEAL } from "@/components/ui/tokens";
import type { InstructorAssistantBriefing } from "@/lib/ai-intelligence";

export default function InstructorAssistantPanel({
  briefing,
}: {
  briefing: InstructorAssistantBriefing;
}) {
  const goodPoints =
    briefing.goodPoints?.length > 0
      ? briefing.goodPoints
      : (briefing.improvementPoints ?? []);
  const needsImprovement = briefing.needsImprovement ?? [];
  const possibleFactors =
    briefing.possibleFactors?.length > 0
      ? briefing.possibleFactors
      : (briefing.worseningCauses ?? []);
  const questions = briefing.questionCandidates ?? [];

  return (
    <section className="rounded-[24px] border border-[#8a6a2d]/28 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-4 py-5 sm:px-6 sm:py-6">
      <p
        className="text-[10px] font-semibold tracking-[0.22em]"
        style={{ color: GOLD }}
      >
        INSTRUCTOR ASSISTANT
      </p>
      <h3
        className="mt-1.5 text-[1.1rem] font-semibold tracking-[-0.03em]"
        style={{ color: NAVY }}
      >
        AI カウンセリング支援 · {briefing.clientName}
      </h3>
      <p className="mt-1 text-[13px] text-slate-500">
        分析結果に基づく良好な点・改善が必要な点・考えられる要因・質問候補です。
      </p>

      <div className="mt-5 columns-1 gap-4 md:columns-2">
        <AssistBlock step="1" title="良好な点">
          <BulletList items={goodPoints} tone="improve" />
        </AssistBlock>
        <AssistBlock step="2" title="改善が必要な点">
          <BulletList items={needsImprovement} tone="worsen" />
        </AssistBlock>
        <AssistBlock step="3" title="考えられる要因">
          <BulletList items={possibleFactors} tone="neutral" />
        </AssistBlock>
        <AssistBlock step="4" title="質問候補">
          <BulletList items={questions} tone="neutral" />
        </AssistBlock>
      </div>

      <div className="mt-5">
        <AiSourceBadge source={briefing.source} />
      </div>
    </section>
  );
}

function AssistBlock({
  step,
  title,
  children,
}: {
  step: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-4 break-inside-avoid rounded-[18px] border border-[#071426]/06 bg-white/85 px-4 py-4">
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-6 min-w-6 items-center justify-center rounded-full text-[11px] font-semibold text-white"
          style={{
            background: `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`,
          }}
        >
          {step}
        </span>
        <p
          className="text-[11px] font-semibold tracking-[0.14em]"
          style={{ color: GOLD }}
        >
          {title}
        </p>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function BulletList({
  items,
  tone,
}: {
  items: string[];
  tone: "improve" | "worsen" | "neutral";
}) {
  const color =
    tone === "improve" ? TEAL : tone === "worsen" ? "#B45309" : GOLD;
  if (items.length === 0) {
    return (
      <p className="text-[13px] leading-6 text-slate-500">
        該当する項目は今回のデータからは確認できませんでした。
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5">
          <span
            className="mt-[0.65em] h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
            aria-hidden
          />
          <span
            className="text-[14px] leading-7 font-medium"
            style={{ color: NAVY }}
          >
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}
