"use client";

import type { PreviousHomeworkComparison } from "@/lib/previous-comparison";
import { formatDisplayDate } from "@/lib/repositories/client-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

type Props = {
  comparison: PreviousHomeworkComparison;
};

/**
 * 次回分析結果に表示する「前回のAI宿題」達成比較パネル。
 */
export default function PreviousHomeworkCard({ comparison }: Props) {
  const { goals, achievement, previousDate } = comparison;

  return (
    <section className="report-panel mt-5 rounded-xl border border-[#8a6a2d]/25 bg-gradient-to-br from-[#faf7f1] via-white to-[#f8f6f1] px-4 py-4 sm:mt-6 sm:px-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2
            className="text-base font-semibold tracking-[-0.02em] sm:text-[1.05rem]"
            style={{ color: NAVY }}
          >
            前回のAI宿題 · 達成比較
          </h2>
          {previousDate ? (
            <p className="mt-1 text-[12px] text-slate-500">
              {formatDisplayDate(previousDate)} の宿題
            </p>
          ) : null}
        </div>
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          PREVIOUS HOMEWORK
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 rounded-xl border border-[#071426]/08 bg-white/80 px-3.5 py-3 sm:px-4">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.08em] text-slate-400">
            達成率
          </p>
          <p
            className="mt-0.5 text-[1.35rem] font-semibold tracking-[-0.03em] tabular-nums"
            style={{
              color:
                achievement.rate >= 100
                  ? "#0f6b5c"
                  : achievement.rate >= 50
                    ? GOLD
                    : "#a33a3a",
            }}
          >
            {achievement.rate}%
          </p>
        </div>
        <p className="text-[13px] font-medium tabular-nums text-slate-600">
          {achievement.checked} / {achievement.total} 達成
        </p>
      </div>

      <ul className="space-y-2">
        {goals.map((goal, index) => (
          <li
            key={goal.id}
            className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 sm:px-4 ${
              goal.checked
                ? "border-[#0f6b5c]/20 bg-[#f3f8f7]"
                : "border-[#071426]/08 bg-[#fafaf8]"
            }`}
          >
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-[11px] font-semibold"
              style={{
                borderColor: goal.checked
                  ? "rgba(15,107,92,0.45)"
                  : "rgba(148,163,184,0.7)",
                backgroundColor: goal.checked ? "#0f6b5c" : "white",
                color: goal.checked ? "white" : "#94a3b8",
              }}
              aria-hidden
            >
              {goal.checked ? "✓" : index + 1}
            </span>
            <span
              className={`min-w-0 flex-1 text-[14px] leading-6 sm:text-[15px] sm:leading-7 ${
                goal.checked ? "text-slate-500 line-through" : ""
              }`}
              style={goal.checked ? undefined : { color: NAVY }}
            >
              {goal.text}
            </span>
            <span
              className="shrink-0 text-[11px] font-semibold"
              style={{ color: goal.checked ? "#0f6b5c" : "#a33a3a" }}
            >
              {goal.checked ? "達成" : "未達"}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
