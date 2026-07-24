"use client";

import {
  GOLD,
  GOLD_LIGHT,
  MUTED,
  NAVY,
  SUCCESS,
  TEAL,
} from "@/components/ui/tokens";
import type { JourneyStageStatus, JourneyStageView } from "@/lib/journey";

function statusStyle(status: JourneyStageStatus) {
  if (status === "completed") {
    return {
      label: "完了",
      color: SUCCESS,
      background: "rgba(15, 107, 92, 0.1)",
      ring: "rgba(15, 107, 92, 0.35)",
    };
  }
  if (status === "current") {
    return {
      label: "現在",
      color: TEAL,
      background: "rgba(49, 95, 104, 0.12)",
      ring: GOLD,
    };
  }
  return {
    label: "これから",
    color: MUTED,
    background: "rgba(100, 116, 139, 0.1)",
    ring: "rgba(100, 116, 139, 0.25)",
  };
}

export default function JourneyStageMap({
  stages,
}: {
  stages: JourneyStageView[];
}) {
  return (
    <ol className="space-y-3 sm:space-y-4">
      {stages.map((stage, index) => {
        const style = statusStyle(stage.status);
        const isCurrent = stage.status === "current";
        return (
          <li key={stage.id} className="relative">
            {index < stages.length - 1 ? (
              <span
                className="absolute left-[1.35rem] top-12 hidden h-[calc(100%-0.5rem)] w-px sm:block"
                style={{ background: "rgba(138, 106, 45, 0.22)" }}
                aria-hidden
              />
            ) : null}
            <article
              className={`relative rounded-[24px] border px-4 py-4 sm:px-5 sm:py-5 ${
                isCurrent
                  ? "border-[#8a6a2d]/28 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4]"
                  : "border-[#071426]/06 bg-white"
              }`}
            >
              <div className="flex gap-3 sm:gap-4">
                <div
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums text-white sm:h-11 sm:w-11"
                  style={{
                    background: isCurrent
                      ? `linear-gradient(145deg, ${GOLD_LIGHT}, ${GOLD})`
                      : stage.status === "completed"
                        ? NAVY
                        : "rgba(100, 116, 139, 0.45)",
                    boxShadow: isCurrent
                      ? `0 0 0 4px rgba(138, 106, 45, 0.12)`
                      : undefined,
                  }}
                  aria-hidden
                >
                  {stage.stageNumber}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p
                      className="text-[10px] font-semibold tracking-[0.18em]"
                      style={{ color: GOLD }}
                    >
                      STAGE {stage.stageNumber}
                    </p>
                    <span
                      className="inline-flex min-h-6 items-center rounded-full px-2.5 text-[10px] font-semibold tracking-[0.06em]"
                      style={{
                        color: style.color,
                        background: style.background,
                      }}
                    >
                      {style.label}
                    </span>
                  </div>
                  <h3
                    className="mt-1.5 text-[1.05rem] font-semibold tracking-[-0.03em] sm:text-[1.15rem]"
                    style={{ color: NAVY }}
                  >
                    {stage.title}
                  </h3>
                  <p className="mt-1 text-[14px] leading-6 text-slate-600">
                    {stage.subtitle}
                  </p>
                  {isCurrent ? (
                    <p className="mt-2 text-[13px] leading-6 text-slate-500">
                      {stage.description}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          </li>
        );
      })}
    </ol>
  );
}
