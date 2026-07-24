"use client";

import { useMemo, useState } from "react";
import { GOLD, NAVY } from "@/components/client-profile/form-ui";
import { calculateAiAccuracyPrediction } from "@/lib/client-profiles/ai-accuracy";
import {
  calculateProfileCompletion,
  profileCompletionBlocks,
  type MissingProfileField,
  type ProfileCompletionStepId,
} from "@/lib/client-profiles/completion";
import type { ClientProfileSections } from "@/lib/client-profiles/types";

type Props = {
  sections: ClientProfileSections;
  /** 生年月日から導出した年齢など */
  derivedAgeYears?: number | null;
  /** 未入力項目クリック時（ウィザードで該当ステップへ） */
  onSelectMissing?: (field: MissingProfileField) => void;
};

export default function ProfileCompletionCard({
  sections,
  derivedAgeYears,
  onSelectMissing,
}: Props) {
  const [open, setOpen] = useState(false);

  const completion = useMemo(
    () =>
      calculateProfileCompletion(sections, {
        ageYears: derivedAgeYears,
      }),
    [sections, derivedAgeYears],
  );

  const accuracy = useMemo(
    () =>
      calculateAiAccuracyPrediction(sections, {
        ageYears: derivedAgeYears,
      }),
    [sections, derivedAgeYears],
  );

  const { filled, empty } = profileCompletionBlocks(completion.percent);
  const bar = `${"█".repeat(filled)}${"░".repeat(empty)}`;

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_16px_48px_-40px_rgba(15,23,42,0.28)]">
      <div className="px-4 py-4 sm:px-6 sm:py-6">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
          {/* プロフィール完成率 */}
          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  PROFILE COMPLETION
                </p>
                <h2
                  className="mt-1.5 text-base font-semibold tracking-[-0.02em] sm:text-lg"
                  style={{ color: NAVY }}
                >
                  プロフィール完成率
                </h2>
              </div>
              <p
                className="shrink-0 text-[1.6rem] font-semibold tracking-[-0.05em] sm:text-[2rem]"
                style={{ color: NAVY }}
                aria-label={`${completion.percent}パーセント`}
              >
                {completion.percent}
                <span className="ml-0.5 text-base font-medium text-slate-400">
                  %
                </span>
              </p>
            </div>

            <p
              className="mt-3 overflow-hidden font-mono text-[14px] leading-none tracking-[0.08em] text-[#315f68] sm:text-base"
              aria-hidden
            >
              {bar}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${completion.percent}%`,
                  background:
                    "linear-gradient(90deg, #315f68 0%, #8a6a2d 100%)",
                }}
              />
            </div>

            <p className="mt-3 text-[12px] leading-5 text-slate-400">
              入力済み {completion.filledCount} / {completion.totalCount} 項目
            </p>
          </div>

          {/* AI分析精度予測 */}
          <div className="border-t border-slate-100 pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  className="text-[11px] font-semibold tracking-[0.22em]"
                  style={{ color: GOLD }}
                >
                  AI ACCURACY
                </p>
                <h2
                  className="mt-1.5 text-base font-semibold tracking-[-0.02em] sm:text-lg"
                  style={{ color: NAVY }}
                >
                  AI分析精度
                </h2>
              </div>
              <p
                className="shrink-0 text-[1.6rem] font-semibold tracking-[-0.05em] sm:text-[2rem]"
                style={{ color: NAVY }}
                aria-label={`AI分析精度 ${accuracy.percent}パーセント`}
              >
                {accuracy.percent}
                <span className="ml-0.5 text-base font-medium text-slate-400">
                  %
                </span>
              </p>
            </div>

            <p
              className="mt-3 font-serif text-[1.35rem] leading-none tracking-[0.12em] sm:text-[1.5rem]"
              style={{ color: GOLD }}
              aria-label={`${accuracy.stars} / 5`}
            >
              {accuracy.starsLabel}
            </p>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${accuracy.percent}%`,
                  background:
                    "linear-gradient(90deg, #8a6a2d 0%, #d8b36a 100%)",
                }}
              />
            </div>

            <p className="mt-3 text-[12px] leading-5 text-slate-400">
              {accuracy.missingImportantCount > 0
                ? `重要項目の未入力 ${accuracy.missingImportantCount} 件 · 入力で精度が上がります`
                : "重要項目は充足しています"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          className={`mt-4 flex min-h-12 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3.5 text-left transition active:opacity-90 sm:mt-5 sm:min-h-0 sm:active:opacity-100 ${
            completion.missingCount > 0
              ? "border-[#C48A2D]/30 bg-[#FFF8EC] sm:hover:bg-[#fff3dc]"
              : "border-slate-200 bg-[#fafaf8] sm:hover:bg-slate-50"
          }`}
        >
          <span>
            <span
              className={`block text-[11px] font-semibold tracking-[0.16em] ${
                completion.missingCount > 0
                  ? "text-[#C48A2D]"
                  : "text-slate-400"
              }`}
            >
              未入力項目
            </span>
            <span
              className="mt-0.5 block text-[15px] font-semibold tracking-[-0.02em]"
              style={{
                color:
                  completion.missingCount > 0 ? "#C48A2D" : NAVY,
              }}
            >
              {completion.missingCount}
              <span
                className={`ml-1 text-sm font-medium ${
                  completion.missingCount > 0
                    ? "text-[#C48A2D]/70"
                    : "text-slate-400"
                }`}
              >
                件
              </span>
            </span>
          </span>
          <span
            className={`text-[12px] ${
              completion.missingCount > 0
                ? "text-[#C48A2D]"
                : "text-slate-400"
            }`}
            aria-hidden
          >
            {open ? "▲" : "▼"}
          </span>
        </button>

        {open && (
          <div
            className={`mt-3 rounded-2xl border px-4 py-4 ${
              completion.missingCount > 0
                ? "border-[#C48A2D]/20 bg-[#FFF8EC]"
                : "border-slate-100 bg-[#fafaf8]"
            }`}
          >
            <p
              className={`text-[13px] leading-6 ${
                completion.missingCount > 0
                  ? "text-[#C48A2D]"
                  : "text-slate-500"
              }`}
            >
              分析精度向上のため入力してください
            </p>

            {completion.missingCount === 0 ? (
              <p
                className="mt-3 text-[14px] font-medium"
                style={{ color: NAVY }}
              >
                すべての項目が入力済みです
              </p>
            ) : (
              <ul className="mt-3 max-h-64 space-y-1 overflow-y-auto">
                {groupBySection(completion.missingFields).map((group) => (
                  <li key={group.sectionTitle}>
                    <p className="mb-1.5 mt-3 first:mt-0 text-[11px] font-semibold tracking-[0.14em] text-[#C48A2D]/80">
                      {group.sectionTitle}
                    </p>
                    <ul className="space-y-1">
                      {group.fields.map((field) => (
                        <li key={field.key}>
                          {onSelectMissing ? (
                            <button
                              type="button"
                              onClick={() => onSelectMissing(field)}
                              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl bg-white/70 px-2.5 py-2 text-left text-[14px] font-medium text-[#C48A2D] transition active:bg-white sm:min-h-0 sm:hover:bg-white sm:active:bg-white/70"
                            >
                              <span>{field.label}</span>
                              <span className="text-[11px] text-[#C48A2D]/70">
                                入力へ →
                              </span>
                            </button>
                          ) : (
                            <span className="block rounded-xl bg-white/70 px-2.5 py-2 text-[14px] font-medium text-[#C48A2D]">
                              {field.label}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function groupBySection(
  fields: MissingProfileField[],
): Array<{
  sectionTitle: string;
  stepId: ProfileCompletionStepId;
  fields: MissingProfileField[];
}> {
  const order: ProfileCompletionStepId[] = [];
  const map = new Map<
    ProfileCompletionStepId,
    {
      sectionTitle: string;
      stepId: ProfileCompletionStepId;
      fields: MissingProfileField[];
    }
  >();

  for (const field of fields) {
    let group = map.get(field.stepId);
    if (!group) {
      group = {
        sectionTitle: field.sectionTitle,
        stepId: field.stepId,
        fields: [],
      };
      map.set(field.stepId, group);
      order.push(field.stepId);
    }
    group.fields.push(field);
  }

  return order.map((id) => map.get(id)!);
}
