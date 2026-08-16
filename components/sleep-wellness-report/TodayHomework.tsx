"use client";

import { useEffect, useState } from "react";
import { NAVY } from "@/components/ui/tokens";
import {
  SwrCard,
  SwrEyebrow,
  SwrTitle,
} from "@/components/sleep-wellness-report/report-ui";
import ConversationGuide from "@/components/sleep-wellness-report/ConversationGuide";
import type { HomeworkItem } from "@/lib/sleep-analysis/session-guide";

function hwKey(sessionKey: string) {
  return `swij-swr-homework-check-v1:${sessionKey}`;
}

export default function TodayHomework({
  items,
  sessionKey,
}: {
  items: HomeworkItem[];
  sessionKey: string;
}) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(hwKey(sessionKey));
      if (raw) setChecked(JSON.parse(raw) as Record<string, boolean>);
      else setChecked({});
    } catch {
      setChecked({});
    }
  }, [sessionKey]);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(hwKey(sessionKey), JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <SwrCard tone="teal">
      <SwrEyebrow>Today&apos;s Homework</SwrEyebrow>
      <SwrTitle>次回までの宿題</SwrTitle>
      <ul className="mt-5 space-y-3">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => toggle(item.id)}
              className="no-print flex w-full items-center gap-3 rounded-2xl border border-[rgba(7,20,38,0.06)] bg-white/90 px-4 py-3.5 text-left transition hover:bg-white"
            >
              <span className="text-[16px] text-slate-400">
                {checked[item.id] ? "☑" : "□"}
              </span>
              <span
                className="text-[15px] font-medium tracking-[-0.02em]"
                style={{ color: NAVY }}
              >
                {item.label}
              </span>
            </button>
            <p className="hidden print:flex print:items-center print:gap-3 print:px-1 print:py-1 print:text-[13px]">
              <span>□</span>
              <span>{item.label}</span>
            </p>
          </li>
        ))}
      </ul>
      <ConversationGuide
        guide={{
          title: "確認してください",
          checks: [
            "この3つは今週実行できそうですか？",
            "いちばん簡単なものはどれですか？",
            "邪魔になりそうな習慣はありますか？",
          ],
        }}
      />
    </SwrCard>
  );
}
