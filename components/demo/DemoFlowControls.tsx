"use client";

import Link from "next/link";
import {
  BORDER,
  CARD_SHADOW,
  MUTED,
  NAVY,
  SUCCESS,
} from "@/components/ui/tokens";
import { setDemoFlowStep } from "@/lib/auth/demo-session";
import {
  DEMO_FLOW_START_HREF,
  getDemoFlowNeighbors,
  type DemoFlowStepId,
} from "@/lib/demo-mode/flow";

export default function DemoFlowControls({
  stepId,
}: {
  stepId: DemoFlowStepId;
}) {
  const { prev, next, current } = getDemoFlowNeighbors(stepId);

  return (
    <div
      className="sticky bottom-0 z-30 -mx-4 border-t bg-white/95 px-4 py-3 backdrop-blur-md sm:-mx-8 sm:px-8"
      style={{
        borderColor: BORDER,
        paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
      }}
    >
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
        {prev ? (
          <Link
            href={prev.href}
            onClick={() => setDemoFlowStep(prev.id)}
            className="inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-[13px] font-semibold transition active:opacity-80 sm:min-h-12 sm:px-5"
            style={{ borderColor: BORDER, color: NAVY }}
          >
            ← {prev.label}
          </Link>
        ) : (
          <Link
            href="/demo"
            className="inline-flex min-h-11 items-center justify-center rounded-full border px-4 text-[13px] font-semibold transition active:opacity-80 sm:min-h-12 sm:px-5"
            style={{ borderColor: BORDER, color: MUTED }}
          >
            ← ダッシュボード
          </Link>
        )}

        <p
          className="hidden text-center text-[12px] tabular-nums sm:block"
          style={{ color: MUTED }}
        >
          {current.index} / 7
        </p>

        {next ? (
          <Link
            href={next.href}
            onClick={() => setDemoFlowStep(next.id)}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-[13px] font-semibold text-white transition active:opacity-90 sm:min-h-12 sm:flex-none sm:px-6 sm:hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            次へ · {next.label}
          </Link>
        ) : (
          <Link
            href="/demo"
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 text-[13px] font-semibold text-white transition active:opacity-90 sm:min-h-12 sm:flex-none sm:px-6"
            style={{ backgroundColor: SUCCESS }}
          >
            体験完了 · 概要へ
          </Link>
        )}
      </div>
    </div>
  );
}

export function DemoStartButton({
  className = "",
  label = "デモ体験をはじめる",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <Link
      href={DEMO_FLOW_START_HREF}
      onClick={() => setDemoFlowStep("collect")}
      className={`inline-flex min-h-12 items-center justify-center rounded-full px-8 text-[15px] font-semibold text-white transition active:opacity-90 sm:hover:opacity-90 ${className}`}
      style={{ backgroundColor: NAVY, boxShadow: CARD_SHADOW }}
    >
      {label}
    </Link>
  );
}
