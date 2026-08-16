"use client";

import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  SwrCard,
  SwrEyebrow,
  SwrTitle,
} from "@/components/sleep-wellness-report/report-ui";

export default function NextCheckpoints({
  items,
}: {
  items: string[];
}) {
  return (
    <SwrCard>
      <SwrEyebrow>Next Session</SwrEyebrow>
      <SwrTitle>次回の確認ポイント</SwrTitle>
      <p className="mt-2 text-[13px] leading-6 text-slate-500">
        数値の将来予測ではなく、次回に観察する項目です。
      </p>
      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="flex gap-2 text-[14px] leading-7"
            style={{ color: NAVY }}
          >
            <span
              className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: GOLD }}
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </SwrCard>
  );
}
