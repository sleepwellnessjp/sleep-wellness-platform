"use client";

import type { ReactNode } from "react";

export const NAVY = "#071426";
export const GOLD = "#8a6a2d";

export const inputClass =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

export const textareaClass =
  "mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] leading-7 text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10";

export function Field({
  label,
  required,
  unit,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  unit?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-[#071426] sm:text-sm">
        {label}
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
      {hint ? (
        <span className="mt-0.5 block text-[11px] text-slate-400">{hint}</span>
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
      <div className="border-b border-slate-100 px-5 py-5 sm:px-8 sm:py-6">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 text-[15px] leading-7 text-slate-500 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      <div className="space-y-4 px-5 py-6 sm:px-8 sm:py-8">{children}</div>
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
      className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition ${
        active
          ? "border-[#315f68] bg-[#315f68]/10 text-[#315f68]"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
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

export function parseOptionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export function numberToInput(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "";
  return String(value);
}
