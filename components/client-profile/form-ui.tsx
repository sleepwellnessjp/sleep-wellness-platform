"use client";

import type { ReactNode } from "react";
import {
  formatAiImportanceStars,
  getProfileAiImportance,
  type AiImportanceStars,
} from "@/lib/client-profiles/ai-importance";
import { numberToInputValue } from "@/lib/client-profiles/display";
import {
  PROFILE_HINTS,
  PROFILE_LABELS,
  type ProfileLabelKey,
} from "@/lib/client-profiles/labels";
import {
  htmlMaxForRule,
  htmlMinForRule,
  NUMBER_RULES,
  parseOptionalNumber as parseValidatedNumber,
  type NumberRule,
} from "@/lib/client-profiles/validation";

export const NAVY = "#071426";
export const GOLD = "#8a6a2d";

export const inputClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:text-[15px]";

export const inputEmptyReadonlyClass =
  "mt-2 min-h-12 w-full rounded-2xl border border-[#C48A2D]/30 bg-[#FFF8EC] px-4 py-3.5 text-[16px] font-semibold text-[#C48A2D] sm:min-h-0 sm:text-[15px]";

export const textareaClass =
  "mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:text-[15px]";

/** 控えめで高級感のある重要度表示（重要項目のみ） */
export function AiImportanceMark({
  stars,
  className = "",
}: {
  stars: AiImportanceStars | undefined | null;
  className?: string;
}) {
  const mark = formatAiImportanceStars(stars);
  if (!mark) return null;

  return (
    <span
      className={`font-serif text-[11px] font-normal tracking-[0.14em] text-[#8a6a2d]/80 ${className}`}
      title="AI分析への重要度"
      aria-label={`AI分析への重要度 ${stars} / 5`}
    >
      {mark}
    </span>
  );
}

export function Field({
  label,
  labelKey,
  required,
  unit,
  hint,
  children,
}: {
  label?: string;
  /** 指定するとラベル・補足・AI重要度を共通定義から解決 */
  labelKey?: ProfileLabelKey;
  required?: boolean;
  unit?: string;
  hint?: string;
  children: ReactNode;
}) {
  const resolvedLabel =
    label ?? (labelKey ? PROFILE_LABELS[labelKey] : "");
  const resolvedHint =
    hint ?? (labelKey ? PROFILE_HINTS[labelKey] : undefined);
  const importance = labelKey
    ? getProfileAiImportance(labelKey)
    : undefined;

  return (
    <label className="block">
      <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-[#071426] sm:text-sm">
        {resolvedLabel}
        <AiImportanceMark stars={importance} />
        {required ? (
          <span className="text-[11px] font-medium text-[#8a6a2d]">必須</span>
        ) : (
          <span className="text-[11px] font-medium text-slate-400">任意</span>
        )}
        {unit ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500">
            {unit}
          </span>
        ) : null}
      </span>
      {resolvedHint ? (
        <span className="mt-0.5 block text-[11px] text-slate-400">
          {resolvedHint}
        </span>
      ) : null}
      {children}
    </label>
  );
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-8 sm:py-6">
        <h2 className="text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-1.5 text-[14px] leading-6 text-slate-500 sm:mt-2 sm:text-sm sm:leading-7">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-4 px-4 py-5 sm:px-8 sm:py-8">{children}</div>
    </section>
  );
}

export function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-full border px-3.5 py-2 text-[13px] font-semibold transition active:opacity-90 sm:min-h-0 sm:active:opacity-100 ${
        active
          ? "border-[#315f68] bg-[#315f68]/10 text-[#315f68]"
          : "border-slate-200 bg-white text-slate-600 sm:hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export function BoolSelect({
  value,
  onChange,
}: {
  value: boolean | null | undefined;
  onChange: (next: boolean | null) => void;
}) {
  const current =
    value === true ? "yes" : value === false ? "no" : "";
  return (
    <select
      className={inputClass}
      value={current}
      onChange={(event) => {
        const v = event.target.value;
        if (v === "yes") onChange(true);
        else if (v === "no") onChange(false);
        else onChange(null);
      }}
    >
      <option value="">未選択</option>
      <option value="yes">はい</option>
      <option value="no">いいえ</option>
    </select>
  );
}

/** @deprecated use parseOptionalNumber(value, rule) */
export function parseOptionalNumber(
  value: string,
  rule: NumberRule = NUMBER_RULES.nonNegative,
): number | null {
  return parseValidatedNumber(value, rule);
}

export function numberToInput(
  value: number | null | undefined,
  rule: NumberRule = NUMBER_RULES.nonNegative,
): string {
  return numberToInputValue(value, rule);
}

export { NUMBER_RULES, htmlMinForRule, htmlMaxForRule };
export type { NumberRule };
