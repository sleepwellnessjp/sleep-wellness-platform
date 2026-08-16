"use client";

import { GOLD, NAVY } from "@/components/ui/tokens";

/** 一目で伝わる Method の流れ */
const CORE = [
  { id: "analyze", label: "アセスメント" },
  { id: "prescribe", label: "処方" },
  { id: "practice", label: "実践" },
] as const;

export type MethodStoryStepId =
  | "score"
  | "reason"
  | "summary"
  | "priority"
  | "day"
  | "night"
  | "comment"
  | "action";

function coreActive(
  active: MethodStoryStepId[],
): Array<(typeof CORE)[number]["id"]> {
  const set = new Set<(typeof CORE)[number]["id"]>();
  for (const id of active) {
    if (id === "score" || id === "summary" || id === "reason") {
      set.add("analyze");
    }
    if (id === "priority" || id === "day" || id === "night") {
      set.add("prescribe");
    }
    if (id === "comment" || id === "action") {
      set.add("practice");
    }
  }
  return [...set];
}

export default function MethodStoryRail({
  active,
}: {
  active: MethodStoryStepId[];
}) {
  const on = coreActive(active);
  return (
    <nav
      className="swr-print-avoid no-print swr-rail"
      aria-label="Sleep Wellness Method の流れ"
    >
      <p className="swr-rail-brand" style={{ color: GOLD }}>
        Sleep Wellness Method™
      </p>
      <ol className="swr-rail-steps">
        {CORE.map((step, i) => {
          const lit = on.includes(step.id);
          return (
            <li key={step.id} className="flex items-center gap-2">
              {i > 0 ? (
                <span className="swr-rail-arrow" aria-hidden>
                  →
                </span>
              ) : null}
              <span
                className="swr-rail-pill"
                data-active={lit ? "true" : "false"}
                style={{
                  color: lit ? "#fff" : "rgba(7,20,38,0.38)",
                  background: lit ? NAVY : "transparent",
                }}
              >
                {step.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function MethodStoryPrintLine() {
  return (
    <p className="swr-story-print hidden" style={{ color: GOLD }}>
      Sleep Wellness Method™ · アセスメント → 処方 → 実践
    </p>
  );
}
