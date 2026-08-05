"use client";

import type { WearableRequiredImageSpec } from "@/lib/wearable-analysis";

type RequiredImageGuideProps = {
  specs: readonly WearableRequiredImageSpec[];
  filledCategories: ReadonlySet<string>;
};

export default function RequiredImageGuide({
  specs,
  filledCategories,
}: RequiredImageGuideProps) {
  const required = specs.filter((s) => s.required);
  const optional = specs.filter((s) => !s.required);
  const filledRequired = required.filter((s) =>
    filledCategories.has(s.category),
  ).length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-4 sm:px-5">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[#8a6a2d]">
        REQUIRED SET
      </p>
      <p className="mt-2 text-[14px] font-semibold text-[#071426]">
        必須 {filledRequired} / {required.length} 種類
        {optional.length > 0 ? ` · 任意 ${optional.length} 種類` : null}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {specs.map((spec, index) => {
          const filled = filledCategories.has(spec.category);
          return (
            <li
              key={spec.category}
              className="flex items-start gap-2 text-[13px] leading-5 text-slate-600"
            >
              <span
                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  filled
                    ? "bg-[#315f68] text-white"
                    : spec.required
                      ? "bg-slate-200 text-slate-600"
                      : "bg-[#f4efe4] text-[#8a6a2d]"
                }`}
              >
                {index + 1}
              </span>
              <span>
                <span className="font-medium text-[#071426]">{spec.label}</span>
                <span className="ml-1 text-[11px] text-slate-400">
                  {spec.required ? "必須" : "任意"}
                  {filled ? " · 済" : " · 未"}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
