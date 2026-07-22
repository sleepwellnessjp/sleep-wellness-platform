"use client";

import { useMemo } from "react";
import { GOLD, NAVY } from "@/components/client-profile/form-ui";
import {
  SLEEP_RELATION_DISCLAIMER,
  buildSleepRelationTips,
} from "@/lib/client-profiles/sleep-relations";
import type { ClientProfileSections } from "@/lib/client-profiles/types";

type Props = {
  sections: ClientProfileSections;
};

export default function ProfileSleepRelationCard({ sections }: Props) {
  const tips = useMemo(() => buildSleepRelationTips(sections), [sections]);

  return (
    <section
      className="relative overflow-hidden rounded-[24px] border border-[#8a6a2d]/20 bg-white shadow-[0_16px_48px_-40px_rgba(15,23,42,0.28)]"
      aria-label="睡眠との関連"
    >
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(216,179,106,0.12),transparent_50%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#8a6a2d]/45 to-transparent"
        aria-hidden
      />

      <div className="relative px-5 py-5 sm:px-6 sm:py-6">
        <p
          className="text-[11px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          SLEEP RELATION
        </p>
        <h2
          className="mt-1.5 text-base font-semibold tracking-[-0.02em] sm:text-lg"
          style={{ color: NAVY }}
        >
          睡眠との関連
        </h2>
        <p className="mt-2 text-[13px] leading-6 text-slate-500 sm:text-[14px] sm:leading-7">
          このプロフィールが睡眠へどう影響する可能性があるか
        </p>

        {tips.length === 0 ? (
          <p className="mt-4 text-[14px] leading-7 text-slate-500">
            関連するヒントを表示するには、勤務・健康・運動・睡眠などの項目を追加してください。
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5 border-t border-[#8a6a2d]/12 pt-4">
            {tips.map((tip) => (
              <li
                key={tip}
                className="flex gap-2 text-[14px] leading-6 tracking-[-0.01em] text-slate-600 sm:text-[15px] sm:leading-7"
              >
                <span className="shrink-0 text-[#8a6a2d]" aria-hidden>
                  ・
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-[12px] leading-6 text-slate-400 sm:text-[13px]">
          {SLEEP_RELATION_DISCLAIMER}
        </p>
      </div>
    </section>
  );
}
