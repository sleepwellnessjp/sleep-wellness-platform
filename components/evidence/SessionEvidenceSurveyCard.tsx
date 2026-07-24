"use client";

import { FormEvent, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { EvidenceRatingRow } from "@/components/evidence/EvidenceRatingRow";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  NEXT_APPOINTMENT_LABELS,
  NEXT_APPOINTMENT_OPTIONS,
  SESSION_SURVEY_LABELS,
  type EvidenceRating,
  type NextAppointmentIntent,
} from "@/lib/evidence";

const STORAGE_PREFIX = "swij-evidence-session-done:";

function storageKey(analysisId: string | null | undefined): string {
  return `${STORAGE_PREFIX}${analysisId?.trim() || "session"}`;
}

/**
 * カウンセリング終了時の 30 秒アンケート（既存フローに影響しない任意送信）。
 */
export default function SessionEvidenceSurveyCard({
  analysisId,
  clientId,
}: {
  analysisId?: string | null;
  clientId?: string | null;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [done, setDone] = useState(false);
  const [satisfaction, setSatisfaction] = useState<EvidenceRating>(4);
  const [understanding, setUnderstanding] = useState<EvidenceRating>(4);
  const [homeworkLikelihood, setHomeworkLikelihood] =
    useState<EvidenceRating>(4);
  const [nextAppointment, setNextAppointment] =
    useState<NextAppointmentIntent>("yes");
  const [freeComment, setFreeComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(storageKey(analysisId)) === "1") {
        setDone(true);
      }
    } catch {
      // ignore
    }
  }, [analysisId]);

  if (dismissed || done) {
    if (done) {
      return (
        <div className="no-print rounded-[1.75rem] border border-[#071426]/08 bg-white px-5 py-5 text-center sm:px-6">
          <p className="text-[13px] font-semibold" style={{ color: NAVY }}>
            実証アンケートをご協力ありがとうございました
          </p>
          <p className="mt-1 text-[12px] text-slate-400">
            回答は匿名で本部の改善に活用されます
          </p>
        </div>
      );
    }
    return null;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/evidence/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: analysisId ?? null,
          clientId: clientId ?? null,
          satisfaction,
          understanding,
          homeworkLikelihood,
          nextAppointment,
          freeComment,
        }),
      });
      const json = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(json.error ?? "送信に失敗しました");
      }
      try {
        window.localStorage.setItem(storageKey(analysisId), "1");
      } catch {
        // ignore
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="no-print rounded-[1.75rem] border border-[#8a6a2d]/25 bg-gradient-to-br from-[#faf7f1] via-white to-[#f5efe4] px-5 py-6 shadow-[0_18px_50px_-40px_rgba(138,106,45,0.35)] sm:px-7 sm:py-7"
      aria-labelledby="session-evidence-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            EVIDENCE · 約30秒
          </p>
          <h2
            id="session-evidence-title"
            className="mt-1.5 text-[17px] font-semibold tracking-[-0.02em] text-[#071426] sm:text-[18px]"
          >
            カウンセリング終了アンケート
          </h2>
          <p className="mt-1 text-[13px] leading-6 text-slate-500">
            Closed Beta の実証データ収集です。個人は特定されません。スキップも可能です。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-[12px] font-semibold text-slate-400 hover:text-slate-600"
        >
          スキップ
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-5">
        <EvidenceRatingRow
          label={SESSION_SURVEY_LABELS.satisfaction}
          value={satisfaction}
          onChange={setSatisfaction}
        />
        <EvidenceRatingRow
          label={SESSION_SURVEY_LABELS.understanding}
          value={understanding}
          onChange={setUnderstanding}
        />
        <EvidenceRatingRow
          label={SESSION_SURVEY_LABELS.homeworkLikelihood}
          value={homeworkLikelihood}
          onChange={setHomeworkLikelihood}
          lowHint="低い"
          highHint="高い"
        />

        <fieldset>
          <legend className="text-[13px] font-semibold text-[#071426]">
            {SESSION_SURVEY_LABELS.nextAppointment}
          </legend>
          <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {NEXT_APPOINTMENT_OPTIONS.map((option) => {
              const selected = nextAppointment === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setNextAppointment(option)}
                  className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[13px] font-semibold transition ${
                    selected
                      ? "text-white"
                      : "border border-slate-200 bg-white text-[#071426] hover:bg-slate-50"
                  }`}
                  style={selected ? { backgroundColor: NAVY } : undefined}
                  aria-pressed={selected}
                >
                  {NEXT_APPOINTMENT_LABELS[option]}
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-[13px] font-semibold text-[#071426]">
            {SESSION_SURVEY_LABELS.freeComment}
            <span className="ml-1 font-normal text-slate-400">（任意）</span>
          </span>
          <textarea
            value={freeComment}
            onChange={(e) => setFreeComment(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="気づき・改善点など"
            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
          />
        </label>

        {error ? (
          <p className="text-sm text-[#a33a3a]" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
          {submitting ? "送信中…" : "送信する"}
        </Button>
      </form>
    </section>
  );
}
