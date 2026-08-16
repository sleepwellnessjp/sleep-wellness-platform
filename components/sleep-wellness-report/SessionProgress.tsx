"use client";

import { GOLD, NAVY } from "@/components/ui/tokens";
import { SwrCard } from "@/components/sleep-wellness-report/report-ui";
import type { SessionProgressStep } from "@/lib/sleep-analysis/session-guide";

export default function SessionProgress({
  steps,
}: {
  steps: SessionProgressStep[];
}) {
  return (
    <SwrCard className="!py-5">
      <p
        className="text-[10px] font-semibold tracking-[0.2em]"
        style={{ color: GOLD }}
      >
        Progress
      </p>
      <p
        className="mt-1.5 text-[15px] font-semibold tracking-[-0.02em]"
        style={{ color: NAVY }}
      >
        改善ステップ
      </p>
      <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center sm:gap-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-col items-center sm:flex-row sm:gap-4">
            <div
              className="flex h-12 min-w-[5.5rem] items-center justify-center rounded-2xl px-4 text-[14px] font-semibold"
              style={{
                color: step.active ? "#fff" : NAVY,
                background: step.active ? NAVY : "rgba(7,20,38,0.04)",
                border: step.active
                  ? "none"
                  : "1px solid rgba(7,20,38,0.08)",
              }}
            >
              {step.label}
            </div>
            {index < steps.length - 1 ? (
              <span
                className="my-1 text-[14px] text-slate-300 sm:my-0"
                aria-hidden
              >
                ↓
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </SwrCard>
  );
}
