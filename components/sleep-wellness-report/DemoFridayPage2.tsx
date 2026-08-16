"use client";

import { useEffect, useState } from "react";
import {
  FOCUS_RING,
  GOLD,
  GOLD_LIGHT,
  GOLD_MID,
  NAVY,
} from "@/components/ui/tokens";
import MethodStoryRail, {
  MethodStoryPrintLine,
} from "@/components/sleep-wellness-report/MethodStoryRail";
import type { CounselingPriorityCard } from "@/lib/sleep-analysis/counseling-view-model";
import {
  prescriptionTodayAction,
  priorityWhyOneLiner,
} from "@/lib/sleep-analysis/demo-report-copy";
import {
  EMPTY_INSTRUCTOR_SESSION_NOTES,
  INSTRUCTOR_SESSION_NOTE_FIELDS,
  readInstructorSessionNotes,
  writeInstructorSessionNotes,
  type InstructorSessionNotes,
} from "@/lib/sleep-analysis/instructor-session-notes";
import type { SwmYogaGuidance } from "@/lib/sleep-analysis/swm-yoga-content";

const NOTE_KEYS = INSTRUCTOR_SESSION_NOTE_FIELDS.slice(0, 2);

/**
 * PAGE 2 — Prescription / Action / Method / メモ
 * Version 1.0 正式版（A4 × 2ページの後半）
 */
export default function DemoFridayPage2({
  priorities,
  dayYoga,
  nightYoga,
  storageKey,
  todayActions,
  nextChecks,
  clientName,
  measurementDate,
  deviceLabel,
  generatedAtLabel,
}: {
  priorities: CounselingPriorityCard[];
  dayYoga: SwmYogaGuidance;
  nightYoga: SwmYogaGuidance;
  storageKey: string;
  todayActions: string[];
  nextChecks: string[];
  clientName?: string | null;
  measurementDate?: string | null;
  deviceLabel: string;
  generatedAtLabel: string;
}) {
  const top3 = priorities.slice(0, 3);
  const [notes, setNotes] = useState<InstructorSessionNotes>(
    EMPTY_INSTRUCTOR_SESSION_NOTES,
  );
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setNotes(readInstructorSessionNotes(storageKey));
    setChecked({});
    setSaved(false);
  }, [storageKey]);

  const persistNotes = (next: InstructorSessionNotes, show: boolean) => {
    setNotes(next);
    writeInstructorSessionNotes(storageKey, next);
    if (show) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    }
  };

  return (
    <section className="swr-print-page swr-print-page-2 space-y-2.5">
      <MethodStoryRail active={["priority", "day", "night", "action"]} />
      <MethodStoryPrintLine />

      <div className="px-0.5">
        <p
          className="text-[10px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          PAGE 2 · Prescription &amp; Practice
        </p>
        <h2
          className="mt-0.5 text-[1.1rem] font-semibold tracking-[-0.02em]"
          style={{ color: NAVY }}
        >
          Today&apos;s Prescription
        </h2>
      </div>

      <ol className="swr-priority-list grid gap-1.5 sm:gap-[6px]">
        {top3.map((item) => (
          <li
            key={item.key}
            className="swr-priority-card flex min-h-[4.75rem] flex-col overflow-hidden rounded-[10px] border bg-white"
            style={{
              borderColor:
                item.rank === 1 ? "rgba(138,106,45,0.3)" : "rgba(7,20,38,0.07)",
              background: item.rank === 1 ? "#fffdf8" : "#fff",
            }}
          >
            <div className="flex items-center gap-2 px-2.5 py-1.5">
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                style={{
                  background: item.rank === 1 ? GOLD_MID : NAVY,
                }}
              >
                {item.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[13px] font-semibold leading-4"
                  style={{ color: NAVY }}
                >
                  Priority {item.rank} · {item.label}
                  {item.relatedValue ? (
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400">
                      {item.relatedValue}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <div className="grid flex-1 border-t border-[rgba(7,20,38,0.05)] sm:grid-cols-2">
              <div className="flex flex-col px-2.5 py-1.5">
                <p className="text-[9px] font-semibold text-slate-400">
                  改善理由
                </p>
                <p className="mt-0.5 flex-1 text-[11px] leading-4 text-slate-600">
                  {priorityWhyOneLiner(item)}
                </p>
              </div>
              <div
                className="flex flex-col px-2.5 py-1.5 sm:border-l sm:border-[rgba(7,20,38,0.05)]"
                style={{
                  background:
                    item.rank === 1
                      ? "rgba(138,106,45,0.06)"
                      : "rgba(7,20,38,0.02)",
                }}
              >
                <p
                  className="text-[9px] font-semibold"
                  style={{ color: GOLD }}
                >
                  今日やること
                </p>
                <p
                  className="mt-0.5 flex-1 text-[11px] font-semibold leading-4"
                  style={{ color: NAVY }}
                >
                  {prescriptionTodayAction(item)}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="swr-action-block rounded-[10px] border border-[rgba(138,106,45,0.22)] bg-[#fffdf8] px-2.5 py-2.5">
        <p
          className="text-[10px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          Today&apos;s Action
        </p>
        <p className="mt-0.5 text-[10px] text-slate-500">チェックリスト</p>
        <ul className="swr-action-list mt-[10px] space-y-2">
          {todayActions.map((line, i) => (
            <li key={`${i}-${line}`} className="flex items-start gap-2">
              <button
                type="button"
                aria-label={`チェック ${i + 1}`}
                onClick={() =>
                  setChecked((prev) => ({ ...prev, [i]: !prev[i] }))
                }
                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border text-[8px] no-print ${
                  checked[i]
                    ? "border-[#8a6a2d] bg-[#8a6a2d] text-white"
                    : "border-[rgba(7,20,38,0.22)] bg-white"
                }`}
              >
                {checked[i] ? "✓" : ""}
              </button>
              <span
                className="swr-notes-print mt-0.5 hidden h-3 w-3 shrink-0 rounded border border-[rgba(7,20,38,0.22)]"
                aria-hidden
              />
              <p className="text-[12px] leading-5 text-slate-700">
                <span style={{ color: GOLD }}>{i + 1}.</span> {line}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="swr-yoga-pair grid items-stretch gap-2 sm:grid-cols-2">
        <article
          className="swr-yoga-card flex h-full flex-col rounded-[10px] border border-[rgba(138,106,45,0.16)] px-2.5 py-2.5"
          style={{ background: "#fffdf8" }}
        >
          <p
            className="text-[9px] font-semibold tracking-[0.14em]"
            style={{ color: GOLD }}
          >
            間のヨガ™（昼）
          </p>
          <h3
            className="mt-0.5 text-[13px] font-semibold leading-4"
            style={{ color: NAVY }}
          >
            {dayYoga.brandName}
          </h3>
          <p className="mt-1 flex-1 text-[11px] leading-4 text-slate-600">
            {dayYoga.purpose}
          </p>
          <p className="mt-1 text-[10px] text-slate-500">
            {dayYoga.timeOfDay} · {dayYoga.durationHint}
          </p>
        </article>

        <article className="swr-yoga-night swr-yoga-card flex h-full flex-col rounded-[10px] border border-[rgba(7,20,38,0.35)] bg-[#071426] px-2.5 py-2.5 text-white">
          <p
            className="text-[9px] font-semibold tracking-[0.14em]"
            style={{ color: GOLD_LIGHT }}
          >
            メラトニンヨガ™（夜）
          </p>
          <h3 className="mt-0.5 text-[13px] font-semibold leading-4 text-white">
            {nightYoga.brandName}
          </h3>
          <p className="mt-1 flex-1 text-[11px] leading-4 text-white/85">
            {nightYoga.purpose}
          </p>
          <p className="mt-1 text-[10px] text-white/55">
            {nightYoga.timeOfDay} · {nightYoga.durationHint}
          </p>
        </article>
      </div>

      <div className="swr-bottom-pair grid items-stretch gap-2 sm:grid-cols-2">
        <div className="swr-notes-card flex h-full flex-col rounded-[10px] border border-[rgba(7,20,38,0.07)] bg-[#f8fafb] px-2.5 py-2.5">
          <p
            className="text-[9px] font-semibold tracking-[0.16em]"
            style={{ color: GOLD }}
          >
            認定講師メモ
          </p>
          <div className="mt-1.5 flex flex-1 flex-col space-y-1.5">
            {NOTE_KEYS.map((field) => (
              <div key={field.key} className="flex flex-1 flex-col">
                <p
                  className="text-[10px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {field.label}
                </p>
                <div className="swr-notes-print mt-0.5 hidden min-h-[28px] flex-1 rounded border border-dashed border-[rgba(7,20,38,0.12)] px-1.5 py-1 text-[10px]">
                  {notes[field.key]?.trim() || "　"}
                </div>
                <textarea
                  rows={2}
                  value={notes[field.key]}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    persistNotes(
                      { ...notes, [field.key]: e.target.value },
                      false,
                    )
                  }
                  className={`no-print mt-0.5 w-full flex-1 rounded border border-[#071426]/08 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-[#8a6a2d] ${FOCUS_RING}`}
                />
              </div>
            ))}
          </div>
          {saved ? (
            <p className="no-print mt-1 text-[10px]" style={{ color: GOLD }}>
              保存しました
            </p>
          ) : null}
        </div>

        <div className="swr-next-card flex h-full flex-col rounded-[10px] border border-[rgba(7,20,38,0.07)] bg-white px-2.5 py-2.5">
          <p
            className="text-[9px] font-semibold tracking-[0.16em]"
            style={{ color: GOLD }}
          >
            次回確認事項
          </p>
          <ul className="mt-1.5 flex-1 space-y-1">
            {(nextChecks.length > 0
              ? nextChecks
              : ["睡眠効率の変化", "実践の継続"]
            )
              .slice(0, 5)
              .map((item) => (
                <li
                  key={item}
                  className="flex gap-1.5 text-[11px] leading-4 text-slate-600"
                >
                  <span style={{ color: GOLD_MID }}>□</span>
                  {item}
                </li>
              ))}
          </ul>
          <div className="mt-auto grid grid-cols-2 gap-1.5 pt-2.5">
            <div>
              <p className="text-[9px] text-slate-400">認定講師</p>
              <div className="mt-0.5 h-4 border-b border-[rgba(7,20,38,0.18)]" />
            </div>
            <div>
              <p className="text-[9px] text-slate-400">日付</p>
              <div className="mt-0.5 h-4 border-b border-[rgba(7,20,38,0.18)]" />
            </div>
          </div>
        </div>
      </div>

      <footer className="swr-page2-footer px-0.5 text-center text-[9px] leading-3 text-slate-300">
        Sleep Wellness Method™ Ver.1.0 · Sleep Wellness Institute Japan
        {clientName ? ` · ${clientName} 様` : ""}
        {measurementDate ? ` · ${measurementDate}` : ""}
        {` · ${deviceLabel} · ${generatedAtLabel}`}
      </footer>
    </section>
  );
}
