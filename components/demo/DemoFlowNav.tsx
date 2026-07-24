"use client";

import Link from "next/link";
import {
  BORDER,
  GOLD,
  MUTED,
  NAVY,
  TEAL,
} from "@/components/ui/tokens";
import {
  DEMO_FLOW_STEPS,
  type DemoFlowStepId,
} from "@/lib/demo-mode/flow";

export default function DemoFlowNav({
  currentId,
  compact = false,
}: {
  currentId?: DemoFlowStepId;
  compact?: boolean;
}) {
  return (
    <nav aria-label="デモ体験フロー" className="w-full">
      <ol
        className={
          compact
            ? "flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            : "grid gap-2 sm:grid-cols-2"
        }
      >
        {DEMO_FLOW_STEPS.map((step) => {
          const active = step.id === currentId;
          return (
            <li
              key={step.id}
              className={compact ? "shrink-0" : undefined}
            >
              <Link
                href={step.href}
                className={
                  compact
                    ? "inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-[12px] font-semibold transition active:opacity-80 sm:hover:opacity-90"
                    : "flex min-h-12 items-start gap-3 rounded-2xl border bg-white px-4 py-3.5 transition active:bg-slate-50 sm:hover:bg-slate-50/80"
                }
                style={{
                  borderColor: active ? TEAL : BORDER,
                  backgroundColor: active && compact ? "#f4f7f7" : undefined,
                  color: NAVY,
                }}
                aria-current={active ? "step" : undefined}
              >
                <span
                  className={
                    compact
                      ? "tabular-nums text-[11px] font-semibold"
                      : "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                  }
                  style={{
                    color: compact ? (active ? TEAL : MUTED) : undefined,
                    backgroundColor: compact ? undefined : active ? TEAL : NAVY,
                  }}
                >
                  {step.index}
                </span>
                <span className={compact ? undefined : "min-w-0"}>
                  <span className="block text-[13px] font-semibold tracking-[-0.02em] sm:text-[14px]">
                    {step.label}
                  </span>
                  {!compact ? (
                    <span
                      className="mt-0.5 block text-[12px] leading-5"
                      style={{ color: MUTED }}
                    >
                      {step.description}
                    </span>
                  ) : null}
                </span>
                {active && !compact ? (
                  <span
                    className="ml-auto shrink-0 text-[10px] font-semibold tracking-[0.14em]"
                    style={{ color: GOLD }}
                  >
                    NOW
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
