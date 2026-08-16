"use client";

import type { ConversationGuideBlock } from "@/lib/sleep-analysis/session-guide";

export default function ConversationGuide({
  guide,
}: {
  guide: ConversationGuideBlock;
}) {
  return (
    <div className="swr-conversation-guide swr-print-avoid mt-6 rounded-2xl bg-[#f3f4f6] px-4 py-4 sm:px-5 sm:py-5">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-slate-500">
        インストラクターへの進め方
      </p>
      <p className="mt-2 text-[13px] font-semibold text-slate-700">
        {guide.title}
      </p>
      <ul className="mt-3 space-y-2">
        {guide.checks.map((check) => (
          <li
            key={check}
            className="flex gap-2.5 text-[13px] leading-6 text-slate-600"
          >
            <span className="mt-0.5 shrink-0 text-slate-400">□</span>
            <span>{check}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
