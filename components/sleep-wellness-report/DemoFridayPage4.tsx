"use client";

import { useEffect, useState } from "react";
import { FOCUS_RING, GOLD, GOLD_MID, NAVY } from "@/components/ui/tokens";
import {
  EMPTY_INSTRUCTOR_SESSION_NOTES,
  INSTRUCTOR_SESSION_NOTE_FIELDS,
  readInstructorSessionNotes,
  writeInstructorSessionNotes,
  type InstructorSessionNotes,
} from "@/lib/sleep-analysis/instructor-session-notes";

const SCRIPT_PREFIX = "swij-swr-instructor-readaloud-v1:";

const NOTE_KEYS = INSTRUCTOR_SESSION_NOTE_FIELDS.slice(0, 3);

/** Page 4 — Instructor Guide */
export default function DemoFridayPage4({
  storageKey,
  generatedScript,
  todayActions,
  clientName,
  measurementDate,
  deviceLabel,
  generatedAtLabel,
}: {
  storageKey: string;
  generatedScript: string;
  todayActions: string[];
  clientName?: string | null;
  measurementDate?: string | null;
  deviceLabel: string;
  generatedAtLabel: string;
}) {
  const [script, setScript] = useState(generatedScript);
  const [notes, setNotes] = useState<InstructorSessionNotes>(
    EMPTY_INSTRUCTOR_SESSION_NOTES,
  );
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const key = `${SCRIPT_PREFIX}${storageKey}`;
    try {
      const stored = localStorage.getItem(key) ?? sessionStorage.getItem(key);
      setScript(stored && stored.trim() ? stored : generatedScript);
    } catch {
      setScript(generatedScript);
    }
    setNotes(readInstructorSessionNotes(storageKey));
    setSaved(false);
  }, [storageKey, generatedScript]);

  const persistScript = (value: string, show: boolean) => {
    setScript(value);
    const key = `${SCRIPT_PREFIX}${storageKey}`;
    try {
      sessionStorage.setItem(key, value);
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
    if (show) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    }
  };

  const persistNotes = (next: InstructorSessionNotes, show: boolean) => {
    setNotes(next);
    writeInstructorSessionNotes(storageKey, next);
    if (show) {
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    }
  };

  const displayScript = script.trim() || generatedScript;
  const paragraphs = displayScript.split(/\n\n+/).filter(Boolean);

  return (
    <section className="swr-print-page swr-print-page-4 flex flex-col gap-5 sm:gap-6">
      <header className="swr-print-avoid space-y-2 px-1">
        <p
          className="text-[10px] font-semibold tracking-[0.24em]"
          style={{ color: GOLD }}
        >
          PAGE 4 · INSTRUCTOR GUIDE
        </p>
        <h1
          className="text-[1.4rem] font-semibold tracking-[-0.03em]"
          style={{ color: NAVY }}
        >
          Instructor Guide
        </h1>
      </header>

      {/* 上半分：読み上げ */}
      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.07)] bg-white px-5 py-5 sm:px-7 sm:py-6">
        <p
          className="text-[11px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          読み上げ用コメント
        </p>
        <div className="mt-4 space-y-4">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="whitespace-pre-line text-[14px] font-medium leading-7 sm:text-[15px] sm:leading-8"
              style={{ color: NAVY }}
            >
              {para}
            </p>
          ))}
        </div>

        <div className="no-print mt-5 border-t border-[rgba(7,20,38,0.06)] pt-4">
          <label
            htmlFor="instructor-readaloud"
            className="text-[13px] font-semibold"
            style={{ color: NAVY }}
          >
            編集
          </label>
          <textarea
            id="instructor-readaloud"
            rows={8}
            value={script}
            onChange={(e) => persistScript(e.target.value, false)}
            className={`mt-2 w-full resize-y rounded-2xl border border-[#071426]/10 bg-[#fafaf8] px-4 py-3 text-[13px] leading-7 text-[#071426] outline-none focus:border-[#8a6a2d] focus:bg-white focus:ring-4 focus:ring-[#8a6a2d]/12 ${FOCUS_RING}`}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => persistScript(script, true)}
              className="inline-flex min-h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white"
              style={{ background: NAVY }}
            >
              保存
            </button>
            <button
              type="button"
              onClick={() => persistScript(generatedScript, true)}
              className="inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(7,20,38,0.1)] bg-white px-5 text-[13px] font-semibold"
              style={{ color: NAVY }}
            >
              自動生成に戻す
            </button>
            <p
              className={`text-[12px] ${saved ? "text-[#8a6a2d]" : "text-slate-400"}`}
            >
              {saved ? "保存しました" : "自動保存あり"}
            </p>
          </div>
        </div>
      </div>

      {/* Today's Action */}
      <div className="swr-print-avoid rounded-[24px] border border-[rgba(138,106,45,0.22)] bg-[#fffdf8] px-5 py-5 sm:px-7">
        <p
          className="text-[11px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          TODAY&apos;S ACTION
        </p>
        <h2
          className="mt-1.5 text-[1.15rem] font-semibold tracking-[-0.02em]"
          style={{ color: NAVY }}
        >
          今日やること
        </h2>
        <ol className="mt-4 space-y-3">
          {todayActions.map((line, i) => (
            <li key={line} className="flex items-start gap-3">
              <span
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                style={{ background: i === 0 ? GOLD_MID : NAVY }}
              >
                {i + 1}
              </span>
              <p className="text-[14px] leading-6" style={{ color: NAVY }}>
                {line}
              </p>
            </li>
          ))}
        </ol>
      </div>

      {/* 認定講師メモ */}
      <div className="swr-print-avoid rounded-[24px] border border-[rgba(7,20,38,0.07)] bg-white px-5 py-5 sm:px-7">
        <p
          className="text-[11px] font-semibold tracking-[0.16em]"
          style={{ color: GOLD }}
        >
          認定講師メモ
        </p>
        <div className="mt-4 space-y-4">
          {NOTE_KEYS.map((field) => (
            <div key={field.key}>
              <label
                htmlFor={`note-${field.key}`}
                className="text-[12px] font-semibold"
                style={{ color: NAVY }}
              >
                {field.label}
              </label>
              <div className="swr-notes-print mt-1.5 hidden min-h-[40px] rounded-xl border border-dashed border-[rgba(7,20,38,0.14)] bg-[#fafaf8] px-3 py-2 text-[12px] leading-5 text-slate-600">
                {notes[field.key]?.trim() || "　"}
              </div>
              <textarea
                id={`note-${field.key}`}
                rows={2}
                value={notes[field.key]}
                placeholder={field.placeholder}
                onChange={(e) =>
                  persistNotes(
                    { ...notes, [field.key]: e.target.value },
                    false,
                  )
                }
                className={`no-print mt-1.5 w-full resize-y rounded-xl border border-[#071426]/08 bg-[#fafaf8] px-3 py-2 text-[13px] leading-6 text-[#071426] outline-none focus:border-[#8a6a2d] focus:bg-white focus:ring-4 focus:ring-[#8a6a2d]/10 ${FOCUS_RING}`}
              />
            </div>
          ))}
        </div>
        <div className="no-print mt-4">
          <button
            type="button"
            onClick={() => persistNotes(notes, true)}
            className="inline-flex min-h-10 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white"
            style={{ background: NAVY }}
          >
            メモを保存
          </button>
        </div>
      </div>

      <footer className="swr-print-avoid px-1 text-center text-[10px] leading-5 text-slate-400">
        Sleep Wellness Method™ · Sleep Wellness Institute Japan
        {clientName ? ` · ${clientName} 様` : ""}
        {measurementDate ? ` · 測定日 ${measurementDate}` : ""}
        {` · ${deviceLabel} · ${generatedAtLabel}`}
        <br />
        本レポートは医療行為・診断ではありません。
      </footer>
    </section>
  );
}
