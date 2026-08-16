"use client";

import { GOLD, NAVY } from "@/components/ui/tokens";
import ConversationGuide from "@/components/sleep-wellness-report/ConversationGuide";
import InstructorNotes from "@/components/sleep-wellness-report/InstructorNotes";
import type { CounselingPriorityCard } from "@/lib/sleep-analysis/counseling-view-model";
import { guideForSection } from "@/lib/sleep-analysis/session-guide";

export type DemoPageInstructorProps = {
  insightOverview: string;
  insightCauses: Array<{ title: string; description: string }>;
  priorities: CounselingPriorityCard[];
  followUp: string[];
  storageKey: string;
  systemBullets: string[];
  systemCaution: string | null;
  clientName?: string | null;
  measurementDate?: string | null;
  device: string;
  generatedAt: string;
};

export default function DemoPageInstructor({
  insightOverview,
  insightCauses,
  priorities,
  followUp,
  storageKey,
  systemBullets,
  systemCaution,
  clientName,
  measurementDate,
  device,
  generatedAt,
}: DemoPageInstructorProps) {
  return (
    <section className="swr-print-page swr-print-page-3 space-y-5">
      <header className="swr-print-avoid rounded-[24px] border border-[rgba(138,106,45,0.25)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          PAGE 3 · INSTRUCTOR
        </p>
        <h1
          className="mt-1 text-[1.45rem] font-semibold tracking-[-0.03em] sm:text-[1.65rem]"
          style={{ color: NAVY }}
        >
          Instructor Report
        </h1>
        <p className="mt-2 text-[13px] text-slate-500">
          認定講師用 · カウンセリング進行メモ
        </p>
      </header>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Insight
        </p>
        <p className="mt-3 text-[14px] leading-7 text-slate-700">
          {insightOverview}
        </p>
        {insightCauses.slice(0, 2).map((c) => (
          <div
            key={c.title}
            className="mt-3 rounded-2xl bg-[#f8f8f7] px-4 py-3"
          >
            <p className="text-[13px] font-semibold" style={{ color: NAVY }}>
              {c.title}
            </p>
            <p className="mt-1 text-[12px] leading-6 text-slate-600">
              {c.description.length > 140
                ? `${c.description.slice(0, 138)}…`
                : c.description}
            </p>
          </div>
        ))}
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Priority 理由
        </p>
        <ul className="mt-4 space-y-3">
          {priorities.slice(0, 3).map((p) => (
            <li key={p.key} className="rounded-2xl bg-[#fafafa] px-4 py-3">
              <p className="text-[14px] font-semibold" style={{ color: NAVY }}>
                {p.rankLabel} {p.label}
              </p>
              <p className="mt-1 text-[12px] text-slate-500">{p.relatedValue}</p>
              <p className="mt-1.5 text-[13px] leading-6 text-slate-600">
                {p.reason.length > 110
                  ? `${p.reason.slice(0, 108)}…`
                  : p.reason}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Conversation Guide
        </p>
        <ConversationGuide guide={guideForSection("summary")} />
      </div>

      <InstructorNotes
        storageKey={storageKey}
        systemBullets={systemBullets}
        systemCaution={systemCaution}
      />

      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.06)] bg-white px-5 py-5 sm:px-6">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Next Session
        </p>
        <ul className="mt-4 space-y-2">
          {followUp.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-[14px] leading-7"
              style={{ color: NAVY }}
            >
              <span className="text-slate-400">・</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <footer className="swr-print-avoid px-1 pb-1 text-center text-[11px] leading-5 text-slate-400">
        Sleep Wellness Institute Japan
        {clientName ? ` · ${clientName} 様` : ""}
        {measurementDate ? ` · 測定日 ${measurementDate}` : ""}
        {` · ${device}`}
        {` · ${generatedAt}`}
        <br />
        本レポートは医療行為・診断ではありません。
      </footer>
    </section>
  );
}
