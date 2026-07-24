"use client";

import Link from "next/link";
import { GOLD, MUTED, NAVY, TEAL } from "@/components/ui/tokens";
import type { InstructorJourneyRosterItem } from "@/lib/journey";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`;
  }
  return name.slice(0, 2) || "SW";
}

export default function InstructorJourneyRoster({
  items,
}: {
  items: InstructorJourneyRosterItem[];
}) {
  if (items.length === 0) {
    return (
      <p className="text-[14px] leading-7 text-slate-500">
        表示できるクライアントがいません。
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.clientId}>
          <Link
            href={`/journey?clientId=${encodeURIComponent(item.clientId)}`}
            className="flex flex-col gap-3 rounded-[24px] border border-[#071426]/08 bg-white px-4 py-4 transition hover:border-[#8a6a2d]/30 hover:bg-[#faf7f1]/40 sm:flex-row sm:items-center sm:gap-4 sm:px-5"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
              style={{ backgroundColor: NAVY }}
              aria-hidden
            >
              {initials(item.clientName)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className="truncate text-[15px] font-semibold tracking-[-0.02em]"
                  style={{ color: NAVY }}
                >
                  {item.clientName}
                </p>
                <span
                  className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.06em]"
                  style={{
                    color: TEAL,
                    background: "rgba(49, 95, 104, 0.12)",
                  }}
                >
                  Stage {item.stageNumber}
                </span>
              </div>
              <p className="mt-1 text-[13px] text-slate-500">
                {item.currentStageTitle} · {item.currentStageSubtitle}
              </p>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px]" style={{ color: MUTED }}>
                <span>
                  達成率{" "}
                  <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
                    {item.achievementRate}%
                  </span>
                </span>
                <span>
                  改善率{" "}
                  <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
                    {item.improvementRate == null ? "—" : `${item.improvementRate}%`}
                  </span>
                </span>
                <span>
                  継続{" "}
                  <span className="font-semibold tabular-nums" style={{ color: NAVY }}>
                    {item.streakDays}日
                  </span>
                </span>
                <span>
                  バッジ{" "}
                  <span className="font-semibold tabular-nums" style={{ color: GOLD }}>
                    {item.unlockedAchievementCount}
                  </span>
                </span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[11px] tracking-[0.08em] text-slate-400">
                SCORE
              </p>
              <p
                className="text-[1.35rem] font-semibold tabular-nums tracking-[-0.04em]"
                style={{ color: NAVY }}
              >
                {item.sleepScore ?? "—"}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
