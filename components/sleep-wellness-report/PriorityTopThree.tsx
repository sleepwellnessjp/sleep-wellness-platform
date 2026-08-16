"use client";

import { GOLD, GOLD_MID, NAVY, TEAL } from "@/components/ui/tokens";
import {
  SwrCard,
  SwrEyebrow,
  SwrTitle,
} from "@/components/sleep-wellness-report/report-ui";
import ClientFeedback from "@/components/sleep-wellness-report/ClientFeedback";
import ConversationGuide from "@/components/sleep-wellness-report/ConversationGuide";
import { guideChecksForPriority } from "@/lib/sleep-analysis/session-guide";
import type { CounselingPriorityCard } from "@/lib/sleep-analysis/counseling-view-model";

function RankBadge({ rank }: { rank: 1 | 2 | 3 }) {
  const bg =
    rank === 1 ? GOLD_MID : rank === 2 ? TEAL : "rgba(7,20,38,0.45)";
  return (
    <span
      className="inline-flex h-8 min-w-8 items-center justify-center rounded-full px-2.5 text-[12px] font-semibold text-white"
      style={{ backgroundColor: bg }}
    >
      {rank}
    </span>
  );
}

export default function PriorityTopThree({
  items,
  sessionKey,
}: {
  items: CounselingPriorityCard[];
  sessionKey: string;
}) {
  return (
    <SwrCard>
      <SwrEyebrow>Priority</SwrEyebrow>
      <SwrTitle>改善優先順位 TOP3</SwrTitle>

      {items.length === 0 ? (
        <p className="mt-5 text-[14px] text-slate-500">
          明確な優先項目はありません。リズム維持を中心に進めます。
        </p>
      ) : (
        <ol className="mt-6 space-y-4">
          {items.map((item) => (
            <li
              key={item.key}
              className="swr-print-avoid rounded-2xl border border-[rgba(7,20,38,0.06)] bg-[#fafafa] p-5"
            >
              <div className="flex items-start gap-3">
                <RankBadge rank={item.rank} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="text-[16px] font-semibold tracking-[-0.02em]"
                      style={{ color: NAVY }}
                    >
                      {item.rankLabel}　{item.label}
                    </p>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                      style={{
                        color: item.level === "高" ? "#a33a3a" : GOLD,
                        background:
                          item.level === "高"
                            ? "rgba(163,58,58,0.08)"
                            : "rgba(138,106,45,0.1)",
                      }}
                    >
                      優先度：{item.level} {item.levelStars}
                    </span>
                  </div>
                  <p className="mt-2 text-[13px] text-slate-500">
                    {item.relatedValue}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-600">
                    {item.reason.length > 120
                      ? `${item.reason.slice(0, 118)}…`
                      : item.reason}
                  </p>
                  <p className="mt-2 text-[13px]" style={{ color: NAVY }}>
                    {item.shortPolicy}
                  </p>
                  <ClientFeedback
                    sessionKey={sessionKey}
                    itemKey={item.key}
                  />
                  <ConversationGuide
                    guide={{
                      title: "確認してください",
                      checks: guideChecksForPriority(item.key),
                    }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SwrCard>
  );
}
