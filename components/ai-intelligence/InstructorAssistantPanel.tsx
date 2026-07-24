"use client";

import type { ReactNode } from "react";
import AiSourceBadge from "@/components/ai-intelligence/AiSourceBadge";
import { GOLD, GOLD_LIGHT, NAVY, TEAL } from "@/components/ui/tokens";
import type { InstructorAssistantBriefing } from "@/lib/ai-intelligence";

const HOMEWORK_LABEL: Record<
  InstructorAssistantBriefing["homeworkSuggestions"][number]["category"],
  string
> = {
  homework: "宿題",
  breathing: "呼吸法",
  yoga: "メラトニンヨガ™",
  lifestyle: "生活習慣",
};

export default function InstructorAssistantPanel({
  briefing,
}: {
  briefing: InstructorAssistantBriefing;
}) {
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
        分析結果に基づく改善点・質問候補・Homework提案です。
      </p>

      <div className="mt-5 columns-1 gap-4 md:columns-2">
        <AssistBlock step="1" title="改善点">
          <BulletList items={briefing.improvementPoints} tone="improve" />
        </AssistBlock>
        <AssistBlock step="2" title="悪化原因">
          <BulletList items={briefing.worseningCauses} tone="worsen" />
        </AssistBlock>
        <AssistBlock step="3" title="質問候補">
          <BulletList items={briefing.questionCandidates} tone="neutral" />
        </AssistBlock>
        <AssistBlock step="4" title="今日のカウンセリング内容">
          <ol className="list-decimal space-y-2 pl-4">
            {briefing.counselingAgenda.map((item) => (
              <li
                key={item}
                className="text-[14px] leading-7 font-medium"
                style={{ color: NAVY }}
              >
                {item}
              </li>
            ))}
          </ol>
        </AssistBlock>
        <AssistBlock step="5" title="Homework提案">
          <ul className="space-y-3">
            {briefing.homeworkSuggestions.map((hw) => (
              <li
                key={hw.title}
                className="rounded-xl border border-[#071426]/06 bg-white/90 px-3 py-3"
              >
                <p className="text-[11px] font-semibold tracking-[0.1em] text-slate-400">
                  {HOMEWORK_LABEL[hw.category]}
                </p>
                <p
                  className="mt-1 text-[14px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {hw.title}
                </p>
                <p className="mt-1 text-[13px] leading-6 text-slate-600">
                  {hw.reason}
                </p>
              </li>
            ))}
          </ul>
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
