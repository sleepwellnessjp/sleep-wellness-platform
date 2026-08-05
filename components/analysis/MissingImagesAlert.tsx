"use client";

import type { WearableRequiredImageSpec } from "@/lib/wearable-analysis";

type MissingImagesAlertProps = {
  missing: readonly WearableRequiredImageSpec[];
};

export default function MissingImagesAlert({ missing }: MissingImagesAlertProps) {
  if (missing.length === 0) return null;

  return (
    <div
      className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4"
      role="status"
    >
      <p className="text-[14px] font-semibold text-rose-800">
        分析に必要な画像があと{missing.length}種類不足しています
      </p>
      <ul className="mt-2 space-y-1 text-[13px] text-rose-700">
        {missing.map((spec) => (
          <li key={spec.category} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-500" />
            <span>
              {spec.label}
              <span className="text-rose-500/80">（{spec.metrics.slice(0, 3).join("・")}
                {spec.metrics.length > 3 ? " など" : ""}）</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
