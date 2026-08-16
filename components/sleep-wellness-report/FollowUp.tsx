"use client";

import { NAVY } from "@/components/ui/tokens";
import {
  SwrCard,
  SwrEyebrow,
  SwrTitle,
} from "@/components/sleep-wellness-report/report-ui";
import ConversationGuide from "@/components/sleep-wellness-report/ConversationGuide";

export default function FollowUp({ items }: { items: string[] }) {
  return (
    <SwrCard>
      <SwrEyebrow>Follow-up</SwrEyebrow>
      <SwrTitle>次回確認する内容</SwrTitle>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-3 rounded-2xl bg-[#f8f8f7] px-4 py-3 text-[14px] leading-6"
            style={{ color: NAVY }}
          >
            <span className="text-slate-400">・</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <ConversationGuide
        guide={{
          title: "確認してください",
          checks: [
            "次回までに観察したい体感は何ですか？",
            "数字と体感のどちらを優先して振り返りますか？",
            "次回セッションの日程は決まりましたか？",
          ],
        }}
      />
    </SwrCard>
  );
}
