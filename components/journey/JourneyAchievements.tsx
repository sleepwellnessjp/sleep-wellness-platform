"use client";

import { GOLD, MUTED, NAVY } from "@/components/ui/tokens";
import type {
  AchievementIconKey,
  ClientAchievementView,
} from "@/lib/journey";

function iconGlyph(iconKey: AchievementIconKey): string {
  switch (iconKey) {
    case "spark":
      return "✦";
    case "flame":
      return "◇";
    case "moon":
      return "☽";
    case "pulse":
      return "♡";
    case "leaf":
      return "❋";
    case "lotus":
      return "✿";
    default:
      return "★";
  }
}

export default function JourneyAchievements({
  achievements,
}: {
  achievements: ClientAchievementView[];
}) {
  const unlocked = achievements.filter((item) => item.unlocked).length;

  return (
    <div>
      <p className="mb-4 text-[13px] text-slate-500">
        {unlocked} / {achievements.length} バッジ解除
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {achievements.map((item) => {
          const active = item.unlocked;
          return (
            <li
              key={item.id}
              className={`rounded-[22px] border px-4 py-4 transition ${
                active
                  ? "border-[#8a6a2d]/25 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4]"
                  : "border-[#071426]/06 bg-[#fafaf8] opacity-70"
              }`}
            >
              <div className="flex gap-3">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[1.05rem]"
                  style={{
                    color: active ? GOLD : MUTED,
                    background: active
                      ? "rgba(138, 106, 45, 0.12)"
                      : "rgba(100, 116, 139, 0.08)",
                  }}
                  aria-hidden
                >
                  {iconGlyph(item.iconKey)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="text-[14px] font-semibold tracking-[-0.02em]"
                      style={{ color: active ? NAVY : MUTED }}
                    >
                      {item.title}
                    </p>
                    <span
                      className="text-[10px] font-semibold tracking-[0.08em]"
                      style={{ color: active ? GOLD : MUTED }}
                    >
                      {active ? "UNLOCKED" : "LOCKED"}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-6 text-slate-500">
                    {item.description}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
