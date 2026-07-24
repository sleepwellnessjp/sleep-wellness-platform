"use client";

import { EVIDENCE_RATINGS, type EvidenceRating } from "@/lib/evidence";
import { FOCUS_RING, NAVY } from "@/components/ui/tokens";

export function EvidenceRatingRow({
  label,
  value,
  onChange,
  lowHint = "低い",
  highHint = "高い",
}: {
  label: string;
  value: EvidenceRating;
  onChange: (value: EvidenceRating) => void;
  lowHint?: string;
  highHint?: string;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="text-[13px] font-semibold text-[#071426]">{label}</legend>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <span className="shrink-0 text-[11px] text-slate-400">{lowHint}</span>
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
          {EVIDENCE_RATINGS.map((rating) => {
            const selected = value === rating;
            return (
              <button
                key={rating}
                type="button"
                onClick={() => onChange(rating)}
                className={`inline-flex h-11 w-11 items-center justify-center rounded-full text-[15px] font-semibold tabular-nums transition ${FOCUS_RING} ${
                  selected
                    ? "text-white"
                    : "border border-slate-200 bg-white text-[#071426] hover:bg-slate-50"
                }`}
                style={selected ? { backgroundColor: NAVY } : undefined}
                aria-pressed={selected}
                aria-label={`${label} ${rating}`}
              >
                {rating}
              </button>
            );
          })}
        </div>
        <span className="shrink-0 text-[11px] text-slate-400">{highHint}</span>
      </div>
    </fieldset>
  );
}
