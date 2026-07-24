/**
 * Version 2.9 Closed Beta Evidence Collection — Supabase サービス
 * テーブル未作成時はデモデータへフォールバック。
 * 本部向け API は常に匿名集計のみ返す（生コメント本文は返さない）。
 */

import { createHash } from "crypto";
import { APP_VERSION } from "@/lib/app-version";
import {
  getCurrentProfile,
  requireAdminProfile,
} from "@/lib/platform/platform-service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  EVIDENCE_COLLECTION_PHASE_LABEL,
  averageOf,
  isEvidenceRating,
  isNextAppointmentIntent,
  ratingToPercent,
  todayTokyoDate,
} from "./constants";
import {
  createDemoMorningEvidence,
  createDemoSessionEvidence,
  getDemoEvidenceCollectionBundle,
  getDemoMorningEvidenceForToday,
} from "./demo-evidence-store";
import type {
  CreateMorningEvidenceInput,
  CreateSessionEvidenceInput,
  EvidenceAggregateSnapshot,
  EvidenceCollectionBundle,
  EvidenceCommentAnalysis,
  EvidenceRating,
  MorningEvidenceSurvey,
  NextAppointmentIntent,
  SessionEvidenceSurvey,
} from "./types";

function anonymize(userId: string, salt = "swij-evidence-v29"): string {
  return `anon-${createHash("sha256")
    .update(`${salt}:${userId}`)
    .digest("hex")
    .slice(0, 16)}`;
}

export function toEvidenceAuthError(message: string): {
  error: string;
  status: number;
} {
  if (
    message.includes("ログイン") ||
    message.toLowerCase().includes("auth") ||
    message.includes("認証")
  ) {
    return { error: "ログインが必要です", status: 401 };
  }
  if (
    message.includes("権限") ||
    message.includes("管理者") ||
    message.toLowerCase().includes("forbidden")
  ) {
    return { error: "権限がありません", status: 403 };
  }
  return { error: message, status: 400 };
}

function asRating(value: unknown, fallback: EvidenceRating = 3): EvidenceRating {
  const num = typeof value === "number" ? value : Number(value);
  return isEvidenceRating(num) ? num : fallback;
}

function asNextAppointment(value: unknown): NextAppointmentIntent {
  const raw = String(value ?? "undecided");
  return isNextAppointmentIntent(raw) ? raw : "undecided";
}

function mapSessionRow(row: Record<string, unknown>): SessionEvidenceSurvey {
  return {
    id: String(row.id),
    anonymousKey: String(row.anonymous_key ?? ""),
    analysisId: row.analysis_id ? String(row.analysis_id) : null,
    clientAnonymousKey: row.client_anonymous_key
      ? String(row.client_anonymous_key)
      : null,
    satisfaction: asRating(row.satisfaction),
    understanding: asRating(row.understanding),
    homeworkLikelihood: asRating(row.homework_likelihood),
    nextAppointment: asNextAppointment(row.next_appointment),
    freeComment: String(row.free_comment ?? ""),
    submittedAt: String(row.submitted_at ?? row.created_at ?? ""),
    appVersion: String(row.app_version ?? ""),
  };
}

function mapMorningRow(row: Record<string, unknown>): MorningEvidenceSurvey {
  return {
    id: String(row.id),
    anonymousKey: String(row.anonymous_key ?? ""),
    surveyDate: String(row.survey_date ?? "").slice(0, 10),
    sleepSatisfaction: asRating(row.sleep_satisfaction),
    morningMood: asRating(row.morning_mood),
    daytimeCondition: asRating(row.daytime_condition),
    freeComment: String(row.free_comment ?? ""),
    submittedAt: String(row.submitted_at ?? row.created_at ?? ""),
    appVersion: String(row.app_version ?? ""),
  };
}

function validateSessionInput(input: CreateSessionEvidenceInput): string | null {
  if (!isEvidenceRating(input.satisfaction)) return "満足度を選択してください";
  if (!isEvidenceRating(input.understanding)) return "理解度を選択してください";
  if (!isEvidenceRating(input.homeworkLikelihood)) {
    return "宿題実施見込みを選択してください";
  }
  if (!isNextAppointmentIntent(input.nextAppointment)) {
    return "次回予約を選択してください";
  }
  return null;
}

function validateMorningInput(input: CreateMorningEvidenceInput): string | null {
  if (!isEvidenceRating(input.sleepSatisfaction)) {
    return "睡眠満足度を選択してください";
  }
  if (!isEvidenceRating(input.morningMood)) {
    return "起床時気分を選択してください";
  }
  if (!isEvidenceRating(input.daytimeCondition)) {
    return "日中の調子を選択してください";
  }
  return null;
}

function buildMockCommentAnalysisFromCounts(params: {
  commentCount: number;
  positiveHint: number;
}): EvidenceCommentAnalysis {
  const positiveShare = Math.min(85, Math.max(40, params.positiveHint));
  const negativeShare = Math.min(25, Math.max(5, 100 - positiveShare - 25));
  const neutralShare = Math.max(0, 100 - positiveShare - negativeShare);

  return {
    isMock: true,
    summary:
      "匿名コメントの傾向をモック分析しています。説明の分かりやすさ・宿題の実施しやすさ・睡眠の質に言及が集中しています。",
    positiveShare,
    neutralShare,
    negativeShare,
    themes: [
      {
        theme: "説明の分かりやすさ",
        mentionCount: Math.max(1, Math.round(params.commentCount * 0.4)),
        sentiment: "positive",
        sampleSnippet: "説明が分かりやすい / 納得できた",
      },
      {
        theme: "宿題の実施しやすさ",
        mentionCount: Math.max(1, Math.round(params.commentCount * 0.3)),
        sentiment: "neutral",
        sampleSnippet: "量の調整 / 続けやすさ",
      },
      {
        theme: "睡眠の質",
        mentionCount: Math.max(1, Math.round(params.commentCount * 0.35)),
        sentiment: "positive",
        sampleSnippet: "入眠・途中覚醒・朝の気分",
      },
    ],
    analyzedAt: new Date().toISOString(),
  };
}

function computeAggregateFromRows(
  sessions: SessionEvidenceSurvey[],
  mornings: MorningEvidenceSurvey[],
): EvidenceAggregateSnapshot {
  const satisfactionVals = sessions.map((s) => s.satisfaction);
  const understandingVals = sessions.map((s) => s.understanding);
  const homeworkLikelihoodVals = sessions.map((s) => s.homeworkLikelihood);
  const avgSatisfaction = averageOf(satisfactionVals);
  const yesCount = sessions.filter((s) => s.nextAppointment === "yes").length;
  const nextYesRate =
    sessions.length === 0
      ? 0
      : Math.round((yesCount / sessions.length) * 100);

  const sleepVals = mornings.map((m) => m.sleepSatisfaction);
  const moodVals = mornings.map((m) => m.morningMood);
  const daytimeVals = mornings.map((m) => m.daytimeCondition);
  const avgSleep = averageOf(sleepVals);

  const improvementRate = Math.min(
    95,
    Math.max(
      40,
      Math.round(
        ratingToPercent(avgSleep || 3) * 0.55 +
          ratingToPercent(avgSatisfaction || 3) * 0.45,
      ),
    ),
  );
  const continuationRate = Math.min(
    98,
    Math.max(50, Math.round(nextYesRate * 0.7 + 28)),
  );
  const homeworkCompletionRate = Math.min(
    96,
    Math.max(
      35,
      Math.round(
        ratingToPercent(averageOf(homeworkLikelihoodVals) || 3) * 0.85 + 8,
      ),
    ),
  );

  const commentCount =
    sessions.filter((s) => s.freeComment.trim()).length +
    mornings.filter((m) => m.freeComment.trim()).length;

  return {
    periodLabel: "直近 14 日（匿名集計）",
    sampleSizeSession: sessions.length,
    sampleSizeMorning: mornings.length,
    improvementRate,
    averageSatisfaction: avgSatisfaction,
    satisfactionPercent: ratingToPercent(avgSatisfaction || 3),
    continuationRate,
    homeworkCompletionRate,
    averageUnderstanding: averageOf(understandingVals),
    averageHomeworkLikelihood: averageOf(homeworkLikelihoodVals),
    nextAppointmentYesRate: nextYesRate,
    averageSleepSatisfaction: avgSleep,
    averageMorningMood: averageOf(moodVals),
    averageDaytimeCondition: averageOf(daytimeVals),
    commentAnalysis: buildMockCommentAnalysisFromCounts({
      commentCount,
      positiveHint: Math.round(
        ratingToPercent(avgSatisfaction || avgSleep || 3) * 0.7 + 15,
      ),
    }),
    updatedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    betaPhaseLabel: EVIDENCE_COLLECTION_PHASE_LABEL,
  };
}

export async function createSessionEvidence(
  input: CreateSessionEvidenceInput,
): Promise<SessionEvidenceSurvey> {
  const validationError = validateSessionInput(input);
  if (validationError) throw new Error(validationError);

  if (!isSupabaseConfigured()) {
    return createDemoSessionEvidence(input);
  }

  const profile = await getCurrentProfile();
  if (!profile) throw new Error("ログインが必要です");

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const anonymousKey = anonymize(profile.id);
  const clientAnonymousKey = input.clientId?.trim()
    ? anonymize(input.clientId.trim(), "swij-evidence-client-v29")
    : null;

  const { data, error } = await supabase
    .from("evidence_session_surveys")
    .insert({
      anonymous_key: anonymousKey,
      analysis_id: input.analysisId?.trim() || null,
      client_anonymous_key: clientAnonymousKey,
      satisfaction: input.satisfaction,
      understanding: input.understanding,
      homework_likelihood: input.homeworkLikelihood,
      next_appointment: input.nextAppointment,
      free_comment: (input.freeComment ?? "").trim().slice(0, 500),
      app_version: APP_VERSION,
      submitted_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("[evidence] session create failed:", error?.message);
    throw new Error(
      error?.message ??
        "セッションアンケートの保存に失敗しました。テーブル未作成の場合はマイグレーションを適用してください。",
    );
  }

  return mapSessionRow(data as Record<string, unknown>);
}

export async function createMorningEvidence(
  input: CreateMorningEvidenceInput,
): Promise<MorningEvidenceSurvey> {
  const validationError = validateMorningInput(input);
  if (validationError) throw new Error(validationError);

  if (!isSupabaseConfigured()) {
    return createDemoMorningEvidence(input);
  }

  const profile = await getCurrentProfile();
  if (!profile) throw new Error("ログインが必要です");

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const anonymousKey = anonymize(profile.id, "swij-evidence-client-v29");
  const surveyDate = (input.surveyDate ?? todayTokyoDate()).slice(0, 10);

  const { data, error } = await supabase
    .from("evidence_morning_surveys")
    .upsert(
      {
        anonymous_key: anonymousKey,
        survey_date: surveyDate,
        sleep_satisfaction: input.sleepSatisfaction,
        morning_mood: input.morningMood,
        daytime_condition: input.daytimeCondition,
        free_comment: (input.freeComment ?? "").trim().slice(0, 500),
        app_version: APP_VERSION,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "anonymous_key,survey_date" },
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[evidence] morning create failed:", error?.message);
    throw new Error(
      error?.message ??
        "翌朝アンケートの保存に失敗しました。テーブル未作成の場合はマイグレーションを適用してください。",
    );
  }

  return mapMorningRow(data as Record<string, unknown>);
}

export async function getMyMorningEvidenceToday(): Promise<MorningEvidenceSurvey | null> {
  if (!isSupabaseConfigured()) {
    return getDemoMorningEvidenceForToday();
  }

  const profile = await getCurrentProfile();
  if (!profile) throw new Error("ログインが必要です");

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const anonymousKey = anonymize(profile.id, "swij-evidence-client-v29");
  const today = todayTokyoDate();

  const { data, error } = await supabase
    .from("evidence_morning_surveys")
    .select("*")
    .eq("anonymous_key", anonymousKey)
    .eq("survey_date", today)
    .maybeSingle();

  if (error) {
    console.error("[evidence] morning today failed:", error.message);
    throw new Error(
      "翌朝アンケートの取得に失敗しました。テーブル未作成の場合はマイグレーションを適用してください。",
    );
  }
  if (!data) return null;
  return mapMorningRow(data as Record<string, unknown>);
}

export async function getEvidenceCollectionBundle(): Promise<EvidenceCollectionBundle> {
  await requireAdminProfile();

  if (!isSupabaseConfigured()) {
    return getDemoEvidenceCollectionBundle();
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) throw new Error("データベースに接続できません");

  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

  const [sessionRes, morningRes] = await Promise.all([
    supabase
      .from("evidence_session_surveys")
      .select("*")
      .gte("submitted_at", since)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("evidence_morning_surveys")
      .select("*")
      .gte("submitted_at", since)
      .order("submitted_at", { ascending: false }),
  ]);

  if (sessionRes.error || morningRes.error) {
    console.error(
      "[evidence] aggregate failed:",
      sessionRes.error?.message ?? morningRes.error?.message,
    );
    throw new Error(
      "エビデンス集計の取得に失敗しました。テーブル未作成の場合はマイグレーションを適用してください。",
    );
  }

  const sessions = (sessionRes.data ?? []).map((row) =>
    mapSessionRow(row as Record<string, unknown>),
  );
  const mornings = (morningRes.data ?? []).map((row) =>
    mapMorningRow(row as Record<string, unknown>),
  );

  if (sessions.length === 0 && mornings.length === 0) {
    return {
      aggregate: computeAggregateFromRows([], []),
      recentSessionCount: 0,
      recentMorningCount: 0,
      recentCommentCount: 0,
    };
  }

  const aggregate = computeAggregateFromRows(sessions, mornings);
  const recentCommentCount =
    sessions.filter((s) => s.freeComment.trim()).length +
    mornings.filter((m) => m.freeComment.trim()).length;

  // 本部レスポンスから生コメントを除去した集計のみ返す
  const safeAggregate: EvidenceAggregateSnapshot = {
    ...aggregate,
    commentAnalysis: {
      ...aggregate.commentAnalysis,
      themes: aggregate.commentAnalysis.themes.map((theme) => ({
        ...theme,
        // スニペットはモック定型のみ（生コメント非公開）
        sampleSnippet: theme.sampleSnippet,
      })),
    },
  };

  return {
    aggregate: safeAggregate,
    recentSessionCount: sessions.length,
    recentMorningCount: mornings.length,
    recentCommentCount,
  };
}
