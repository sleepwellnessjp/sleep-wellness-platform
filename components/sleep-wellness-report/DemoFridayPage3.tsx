"use client";

import { useEffect, useState } from "react";
import { FOCUS_RING, GOLD, GOLD_MID, NAVY } from "@/components/ui/tokens";
import MethodStoryRail, {
  MethodStoryPrintLine,
} from "@/components/sleep-wellness-report/MethodStoryRail";
import {
  EMPTY_INSTRUCTOR_SESSION_NOTES,
  INSTRUCTOR_SESSION_NOTE_FIELDS,
  readInstructorSessionNotes,
  writeInstructorSessionNotes,
  type InstructorSessionNotes,
} from "@/lib/sleep-analysis/instructor-session-notes";

const NOTE_KEYS = INSTRUCTOR_SESSION_NOTE_FIELDS.slice(0, 2);

/** PAGE 3 — Practice（Action / メモ / 次回確認のみ） */
export default function DemoFridayPage3({
  storageKey,
  todayActions,
  nextChecks,
  clientName,
  measurementDate,
  deviceLabel,
  generatedAtLabel,
}: {
  storageKey: string;
  todayActions: string[];
  nextChecks: string[];
  clientName?: string | null;
  measurementDate?: string | null;
  deviceLabel: string;
  generatedAtLabel: string;
}) {
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
    <section className="swr-print-page swr-print-page-3 space-y-2.5">
      <MethodStoryRail active={["comment", "action"]} />
      <MethodStoryPrintLine />

      <div className="px-0.5">
        <p
          className="text-[10px] font-semibold tracking-[0.2em]"
          style={{ color: GOLD }}
        >
          PAGE 3 · Practice
        </p>
        <h2
          className="mt-0.5 text-[1.15rem] font-semibold tracking-[-0.02em]"
          style={{ color: NAVY }}
        >
          Today&apos;s Action
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500">チェックリスト</p>
      </div>

      <div className="rounded-[16px] border border-[rgba(7,20,38,0.07)] bg-white px-3 py-2.5 sm:px-4">
        <ul className="space-y-2">
          {todayActions.map((line, i) => (
            <li key={`${i}-${line}`} className="flex items-start gap-2.5">
              <button
                type="button"
                aria-label={`チェック ${i + 1}`}
                onClick={() =>
                  setChecked((prev) => ({ ...prev, [i]: !prev[i] }))
                }
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[9px] no-print ${
                  checked[i]
                    ? "border-[#8a6a2d] bg-[#8a6a2d] text-white"
                    : "border-[rgba(7,20,38,0.22)] bg-white"
                }`}
              >
                {checked[i] ? "✓" : ""}
              </button>
              <span
                className="swr-notes-print mt-0.5 hidden h-3.5 w-3.5 shrink-0 rounded border border-[rgba(7,20,38,0.22)]"
                aria-hidden
              />
              <p className="text-[13px] leading-5 text-slate-700">
                <span style={{ color: GOLD }}>{i + 1}.</span> {line}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-[16px] border border-[rgba(7,20,38,0.07)] bg-[#f8fafb] px-3 py-2.5">
          <p
            className="text-[10px] font-semibold tracking-[0.16em]"
            style={{ color: GOLD }}
          >
            認定講師メモ
          </p>
          <div className="mt-2 space-y-2">
            {NOTE_KEYS.map((field) => (
              <div key={field.key}>
                <p
                  className="text-[11px] font-semibold"
                  style={{ color: NAVY }}
                >
                  {field.label}
                </p>
                <div className="swr-notes-print mt-1 hidden min-h-[28px] rounded-md border border-dashed border-[rgba(7,20,38,0.12)] px-2 py-1.5 text-[11px]">
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
                  className={`no-print mt-1 w-full rounded-lg border border-[#071426]/08 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-[#8a6a2d] ${FOCUS_RING}`}
                />
              </div>
            ))}
          </div>
          {saved ? (
            <p className="no-print mt-1.5 text-[11px]" style={{ color: GOLD }}>
              保存しました
            </p>
          ) : null}
        </div>

        <div className="rounded-[16px] border border-[rgba(7,20,38,0.07)] bg-white px-3 py-2.5">
          <p
            className="text-[10px] font-semibold tracking-[0.16em]"
            style={{ color: GOLD }}
          >
            次回確認事項
          </p>
          <ul className="mt-2 space-y-1.5">
            {(nextChecks.length > 0
              ? nextChecks
              : ["睡眠効率の変化", "実践の継続"]
            )
              .slice(0, 5)
              .map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-[12px] leading-4 text-slate-600"
                >
                  <span style={{ color: GOLD_MID }}>□</span>
                  {item}
                </li>
              ))}
          </ul>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-slate-400">認定講師</p>
              <div className="mt-1 h-6 border-b border-[rgba(7,20,38,0.18)]" />
            </div>
            <div>
              <p className="text-[10px] text-slate-400">日付</p>
              <div className="mt-1 h-6 border-b border-[rgba(7,20,38,0.18)]" />
            </div>
          </div>
        </div>
      </div>

      <footer className="px-0.5 text-center text-[10px] leading-4 text-slate-400">
        Sleep Wellness Method™ · Sleep Wellness Institute Japan
        {clientName ? ` · ${clientName} 様` : ""}
        {measurementDate ? ` · ${measurementDate}` : ""}
        {` · ${deviceLabel} · ${generatedAtLabel}`}
      </footer>
    </section>
  );
}
