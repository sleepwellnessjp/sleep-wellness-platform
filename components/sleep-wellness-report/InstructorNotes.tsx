"use client";

import { useEffect, useState } from "react";
import { FOCUS_RING, GOLD, NAVY } from "@/components/ui/tokens";
import {
  SwrCard,
  SwrEyebrow,
  SwrTitle,
} from "@/components/sleep-wellness-report/report-ui";
import {
  EMPTY_INSTRUCTOR_SESSION_NOTES,
  INSTRUCTOR_SESSION_NOTE_FIELDS,
  readInstructorSessionNotes,
  writeInstructorSessionNotes,
  type InstructorSessionNotes,
} from "@/lib/sleep-analysis/instructor-session-notes";

export type InstructorNotesProps = {
  storageKey: string;
  systemBullets?: string[];
  systemCaution?: string | null;
};

export default function InstructorNotes({
  storageKey,
  systemBullets = [],
  systemCaution = null,
}: InstructorNotesProps) {
  const [notes, setNotes] = useState<InstructorSessionNotes>(
    EMPTY_INSTRUCTOR_SESSION_NOTES,
  );
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    setNotes(readInstructorSessionNotes(storageKey));
    setSaveState("idle");
  }, [storageKey]);

  const persist = (
    next: InstructorSessionNotes,
    showSaved: boolean,
  ) => {
    setNotes(next);
    writeInstructorSessionNotes(storageKey, next);
    if (showSaved) {
      setSaveState("saved");
      window.setTimeout(() => setSaveState("idle"), 1800);
    }
  };

  const filled = INSTRUCTOR_SESSION_NOTE_FIELDS.filter(
    (f) => notes[f.key].trim().length > 0,
  );

  return (
    <SwrCard tone="memo" className="swr-instructor-notes">
      <SwrEyebrow>07 · Instructor Record</SwrEyebrow>
      <SwrTitle>インストラクター記録</SwrTitle>
      <p className="no-print mt-2 text-[13px] leading-6 text-slate-500">
        クライアント提示時は個別に編集してください。印刷時は入力済み項目のみ表示されます。
      </p>

      <div className="no-print mt-4 space-y-4">
        {INSTRUCTOR_SESSION_NOTE_FIELDS.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={`swr-note-${field.key}`}
              className="text-[13px] font-semibold"
              style={{ color: NAVY }}
            >
              {field.label}
            </label>
            <textarea
              id={`swr-note-${field.key}`}
              name={field.key}
              rows={3}
              value={notes[field.key]}
              placeholder={field.placeholder}
              onChange={(e) =>
                persist({ ...notes, [field.key]: e.target.value }, false)
              }
              className={`mt-1.5 min-h-[4.5rem] w-full resize-y rounded-2xl border border-[#071426]/15 bg-[#fafaf8] px-4 py-3 text-[14px] leading-7 text-[#071426] outline-none transition placeholder:text-slate-400 focus:border-[#8a6a2d] focus:bg-white focus:ring-4 focus:ring-[#8a6a2d]/15 ${FOCUS_RING}`}
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => persist(notes, true)}
            className="inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white transition active:opacity-90"
            style={{ background: NAVY }}
          >
            記録を保存
          </button>
          <p
            className={`text-[12px] ${saveState === "saved" ? "text-[#0f6b5c]" : "text-slate-400"}`}
          >
            {saveState === "saved" ? "保存しました" : "自動保存も有効です"}
          </p>
        </div>
      </div>

      {/* Print: only filled fields */}
      <div className="swr-notes-print mt-3 hidden print:block">
        {filled.length === 0 ? (
          <p className="text-[12px] text-slate-400">（記録なし）</p>
        ) : (
          <dl className="space-y-3">
            {filled.map((field) => (
              <div key={field.key}>
                <dt
                  className="text-[11px] font-semibold tracking-[0.06em]"
                  style={{ color: GOLD }}
                >
                  {field.label}
                </dt>
                <dd className="mt-1 whitespace-pre-wrap text-[13px] leading-6 text-slate-700">
                  {notes[field.key].trim()}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {(systemCaution || systemBullets.length > 0) && (
        <details className="no-print mt-5 border-t border-[rgba(7,20,38,0.06)] pt-4">
          <summary className="cursor-pointer text-[13px] font-semibold" style={{ color: NAVY }}>
            システム生成メモ（参考）
          </summary>
          <div className="mt-3 space-y-2">
            {systemCaution ? (
              <p className="rounded-xl bg-[rgba(163,58,58,0.06)] px-3 py-2 text-[12px] leading-5 text-slate-700">
                {systemCaution}
              </p>
            ) : null}
            <ul className="space-y-1.5">
              {systemBullets.map((b) => (
                <li key={b} className="text-[12px] leading-5 text-slate-500">
                  · {b}
                </li>
              ))}
            </ul>
          </div>
        </details>
      )}
    </SwrCard>
  );
}
