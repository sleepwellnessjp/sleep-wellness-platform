"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import ClientPortalShell, {
  ClientPortalError,
  ClientPortalLoading,
  ClientPortalLoginGate,
  ClientPortalUnlinked,
  useClientPortalBundle,
} from "@/components/client-portal/ClientPortalShell";
import Button from "@/components/ui/Button";
import SectionCard from "@/components/ui/SectionCard";
import { EvidenceRatingRow } from "@/components/evidence/EvidenceRatingRow";
import { GOLD, NAVY } from "@/components/ui/tokens";
import {
  MORNING_SURVEY_LABELS,
  todayTokyoDate,
  type EvidenceRating,
  type MorningEvidenceSurvey,
} from "@/lib/evidence";
import { CLIENT_PORTAL_ROUTES } from "@/lib/client-portal/constants";

function MorningSurveyForm({
  existing,
  onSaved,
}: {
  existing: MorningEvidenceSurvey | null;
  onSaved: (survey: MorningEvidenceSurvey) => void;
}) {
  const [sleepSatisfaction, setSleepSatisfaction] = useState<EvidenceRating>(
    existing?.sleepSatisfaction ?? 4,
  );
  const [morningMood, setMorningMood] = useState<EvidenceRating>(
    existing?.morningMood ?? 4,
  );
  const [daytimeCondition, setDaytimeCondition] = useState<EvidenceRating>(
    existing?.daytimeCondition ?? 3,
  );
  const [freeComment, setFreeComment] = useState(existing?.freeComment ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!existing) return;
    setSleepSatisfaction(existing.sleepSatisfaction);
    setMorningMood(existing.morningMood);
    setDaytimeCondition(existing.daytimeCondition);
    setFreeComment(existing.freeComment);
  }, [existing]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const response = await fetch("/api/evidence/morning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          surveyDate: todayTokyoDate(),
          sleepSatisfaction,
          morningMood,
          daytimeCondition,
          freeComment,
        }),
      });
      const json = (await response.json()) as {
        survey?: MorningEvidenceSurvey;
        error?: string;
      };
      if (!response.ok || !json.survey) {
        throw new Error(json.error ?? "送信に失敗しました");
      }
      onSaved(json.survey);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "送信に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <EvidenceRatingRow
        label={MORNING_SURVEY_LABELS.sleepSatisfaction}
        value={sleepSatisfaction}
        onChange={setSleepSatisfaction}
      />
      <EvidenceRatingRow
        label={MORNING_SURVEY_LABELS.morningMood}
        value={morningMood}
        onChange={setMorningMood}
      />
      <EvidenceRatingRow
        label={MORNING_SURVEY_LABELS.daytimeCondition}
        value={daytimeCondition}
        onChange={setDaytimeCondition}
      />

      <label className="block">
        <span className="text-[13px] font-semibold text-[#071426]">
          {MORNING_SURVEY_LABELS.freeComment}
          <span className="ml-1 font-normal text-slate-400">（任意）</span>
        </span>
        <textarea
          value={freeComment}
          onChange={(e) => setFreeComment(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="昨夜の睡眠や今朝の調子について"
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[15px] text-[#071426] outline-none transition focus:border-[#315f68] focus:ring-4 focus:ring-[#315f68]/10"
        />
      </label>

      {error ? (
        <p className="text-sm text-[#a33a3a]" role="alert">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="text-sm text-[#2f6b4f]" role="status">
          今朝のアンケートを保存しました。ご協力ありがとうございます。
        </p>
      ) : null}

      <Button type="submit" disabled={submitting}>
        {submitting
          ? "送信中…"
          : existing
            ? "更新する"
            : "送信する"}
      </Button>
    </form>
  );
}

export default function ClientMorningEvidencePage() {
  const { loading, needsLogin, error, bundle, reload } = useClientPortalBundle();
  const [survey, setSurvey] = useState<MorningEvidenceSurvey | null>(null);
  const [surveyLoading, setSurveyLoading] = useState(true);
  const [surveyError, setSurveyError] = useState<string | null>(null);

  const loadSurvey = useCallback(async () => {
    setSurveyLoading(true);
    setSurveyError(null);
    try {
      const response = await fetch("/api/evidence/morning", {
        cache: "no-store",
      });
      const json = (await response.json()) as {
        survey?: MorningEvidenceSurvey | null;
        error?: string;
      };
      if (!response.ok) {
        throw new Error(json.error ?? "取得に失敗しました");
      }
      setSurvey(json.survey ?? null);
    } catch (err) {
      setSurveyError(
        err instanceof Error ? err.message : "取得に失敗しました",
      );
    } finally {
      setSurveyLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSurvey();
  }, [loadSurvey]);

  if (needsLogin) return <ClientPortalLoginGate />;
  if (loading) return <ClientPortalLoading />;
  if (error) return <ClientPortalError message={error} onRetry={reload} />;
  if (!bundle) return <ClientPortalUnlinked />;

  return (
    <ClientPortalShell eyebrow="EVIDENCE" title="翌朝アンケート">
      <div className="space-y-6">
        <div>
          <p
            className="text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: GOLD }}
          >
            EVIDENCE · 翌朝
          </p>
          <p className="mt-1 text-[14px] leading-6 text-slate-500">
            {todayTokyoDate()} · Closed Beta
            の実証データ収集です。回答は匿名集計されます。
          </p>
        </div>

        <SectionCard title="今朝の調子">
          {surveyLoading ? (
            <p className="text-sm text-slate-400">読み込み中…</p>
          ) : surveyError ? (
            <p className="text-sm text-[#a33a3a]" role="alert">
              {surveyError}
            </p>
          ) : (
            <MorningSurveyForm existing={survey} onSaved={setSurvey} />
          )}
        </SectionCard>

        <p className="text-center text-[13px]">
          <Link
            href={CLIENT_PORTAL_ROUTES.home}
            className="font-semibold underline-offset-2 hover:underline"
            style={{ color: NAVY }}
          >
            ホームに戻る
          </Link>
        </p>
      </div>
    </ClientPortalShell>
  );
}
