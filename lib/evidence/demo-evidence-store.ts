/**
 * Version 2.9 Closed Beta Evidence Collection — デモストア
 * 個人を特定しない匿名サンプルのみ保持する。
 */

import { APP_VERSION } from "@/lib/app-version";
import {
  EVIDENCE_COLLECTION_PHASE_LABEL,
  averageOf,
  ratingToPercent,
  todayTokyoDate,
} from "./constants";
import type {
  CreateMorningEvidenceInput,
  CreateSessionEvidenceInput,
  EvidenceAggregateSnapshot,
  EvidenceCollectionBundle,
  EvidenceCommentAnalysis,
  MorningEvidenceSurvey,
  NextAppointmentIntent,
  SessionEvidenceSurvey,
} from "./types";

const DEMO_INSTRUCTOR_KEY = "anon-instructor-demo";
const DEMO_CLIENT_KEY = "anon-client-demo";

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

let sessionStore: SessionEvidenceSurvey[] = [
  {
    id: "ev-sess-1",
    anonymousKey: "anon-instructor-a",
    analysisId: null,
    clientAnonymousKey: "anon-client-a",
    satisfaction: 5,
    understanding: 4,
    homeworkLikelihood: 4,
    nextAppointment: "yes",
    freeComment: "説明が分かりやすく、次回も続けたいとの反応でした。",
    submittedAt: daysAgoIso(1),
    appVersion: "1.0.0",
  },
  {
    id: "ev-sess-2",
    anonymousKey: "anon-instructor-b",
    analysisId: null,
    clientAnonymousKey: "anon-client-b",
    satisfaction: 4,
    understanding: 4,
    homeworkLikelihood: 3,
    nextAppointment: "undecided",
    freeComment: "宿題の量を調整すると実施しやすそうです。",
    submittedAt: daysAgoIso(2),
    appVersion: "1.0.0",
  },
  {
    id: "ev-sess-3",
    anonymousKey: "anon-instructor-c",
    analysisId: null,
    clientAnonymousKey: "anon-client-c",
    satisfaction: 5,
    understanding: 5,
    homeworkLikelihood: 5,
    nextAppointment: "yes",
    freeComment: "",
    submittedAt: daysAgoIso(3),
    appVersion: "1.0.0",
  },
  {
    id: "ev-sess-4",
    anonymousKey: "anon-instructor-a",
    analysisId: null,
    clientAnonymousKey: "anon-client-d",
    satisfaction: 3,
    understanding: 3,
    homeworkLikelihood: 2,
    nextAppointment: "no",
    freeComment: "初回で情報が多く、消化に時間がかかりそうでした。",
    submittedAt: daysAgoIso(4),
    appVersion: "1.0.0",
  },
  {
    id: "ev-sess-5",
    anonymousKey: "anon-instructor-d",
    analysisId: null,
    clientAnonymousKey: "anon-client-e",
    satisfaction: 4,
    understanding: 5,
    homeworkLikelihood: 4,
    nextAppointment: "yes",
    freeComment: "グラフ説明が特に好評でした。",
    submittedAt: daysAgoIso(5),
    appVersion: "1.0.0",
  },
];

let morningStore: MorningEvidenceSurvey[] = [
  {
    id: "ev-morn-1",
    anonymousKey: "anon-client-a",
    surveyDate: todayTokyoDate(),
    sleepSatisfaction: 4,
    morningMood: 4,
    daytimeCondition: 3,
    freeComment: "昨夜は途中覚醒が少なかったです。",
    submittedAt: daysAgoIso(0),
    appVersion: "1.0.0",
  },
  {
    id: "ev-morn-2",
    anonymousKey: "anon-client-b",
    surveyDate: daysAgoIso(1).slice(0, 10),
    sleepSatisfaction: 3,
    morningMood: 3,
    daytimeCondition: 3,
    freeComment: "",
    submittedAt: daysAgoIso(1),
    appVersion: "1.0.0",
  },
  {
    id: "ev-morn-3",
    anonymousKey: "anon-client-c",
    surveyDate: daysAgoIso(2).slice(0, 10),
    sleepSatisfaction: 5,
    morningMood: 5,
    daytimeCondition: 4,
    freeComment: "呼吸法のあと、入眠がスムーズでした。",
    submittedAt: daysAgoIso(2),
    appVersion: "1.0.0",
  },
  {
    id: "ev-morn-4",
    anonymousKey: "anon-client-d",
    surveyDate: daysAgoIso(3).slice(0, 10),
    sleepSatisfaction: 2,
    morningMood: 2,
    daytimeCondition: 2,
    freeComment: "仕事の締め切り前で寝つきが悪かった。",
    submittedAt: daysAgoIso(3),
    appVersion: "1.0.0",
  },
  {
    id: "ev-morn-5",
    anonymousKey: "anon-client-e",
    surveyDate: daysAgoIso(4).slice(0, 10),
    sleepSatisfaction: 4,
    morningMood: 4,
    daytimeCondition: 4,
    freeComment: "朝の気分が安定してきました。",
    submittedAt: daysAgoIso(4),
    appVersion: "1.0.0",
  },
];

function buildMockCommentAnalysis(
  sessions: SessionEvidenceSurvey[],
  mornings: MorningEvidenceSurvey[],
): EvidenceCommentAnalysis {
  const comments = [
    ...sessions.map((s) => s.freeComment),
    ...mornings.map((m) => m.freeComment),
  ].filter((c) => c.trim().length > 0);

  return {
    isMock: true,
    summary:
      "コメントは「説明の分かりやすさ」「宿題の量」「入眠・途中覚醒」に集中しています（モック分析）。",
    positiveShare: 62,
    neutralShare: 26,
    negativeShare: 12,
    themes: [
      {
        theme: "説明の分かりやすさ",
        mentionCount: Math.max(2, Math.round(comments.length * 0.4)),
        sentiment: "positive",
        sampleSnippet: "説明が分かりやすく、次回も続けたい",
      },
      {
        theme: "宿題の実施しやすさ",
        mentionCount: Math.max(1, Math.round(comments.length * 0.3)),
        sentiment: "neutral",
        sampleSnippet: "宿題の量を調整すると実施しやすい",
      },
      {
        theme: "睡眠の質（入眠・覚醒）",
        mentionCount: Math.max(1, Math.round(comments.length * 0.35)),
        sentiment: "positive",
        sampleSnippet: "途中覚醒が少なかった / 入眠がスムーズ",
      },
      {
        theme: "情報量・初回負荷",
        mentionCount: 1,
        sentiment: "negative",
        sampleSnippet: "初回で情報が多く消化に時間がかかる",
      },
    ],
    analyzedAt: new Date().toISOString(),
  };
}

function computeAggregate(
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

  // 改善率・継続率・宿題実施率はデモ用の合成指標（匿名集計のプレースホルダ）
  const improvementRate = Math.min(
    95,
    Math.max(
      40,
      Math.round(
        ratingToPercent(avgSleep) * 0.55 +
          ratingToPercent(avgSatisfaction) * 0.45,
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
      Math.round(ratingToPercent(averageOf(homeworkLikelihoodVals)) * 0.85 + 8),
    ),
  );

  return {
    periodLabel: "直近 14 日（匿名集計）",
    sampleSizeSession: sessions.length,
    sampleSizeMorning: mornings.length,
    improvementRate,
    averageSatisfaction: avgSatisfaction,
    satisfactionPercent: ratingToPercent(avgSatisfaction),
    continuationRate,
    homeworkCompletionRate,
    averageUnderstanding: averageOf(understandingVals),
    averageHomeworkLikelihood: averageOf(homeworkLikelihoodVals),
    nextAppointmentYesRate: nextYesRate,
    averageSleepSatisfaction: avgSleep,
    averageMorningMood: averageOf(moodVals),
    averageDaytimeCondition: averageOf(daytimeVals),
    commentAnalysis: buildMockCommentAnalysis(sessions, mornings),
    updatedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    betaPhaseLabel: EVIDENCE_COLLECTION_PHASE_LABEL,
  };
}

export function getDemoEvidenceActor(role: "instructor" | "client" = "instructor") {
  return {
    anonymousKey: role === "client" ? DEMO_CLIENT_KEY : DEMO_INSTRUCTOR_KEY,
    role,
  };
}

export function createDemoSessionEvidence(
  input: CreateSessionEvidenceInput,
  actor = getDemoEvidenceActor("instructor"),
): SessionEvidenceSurvey {
  const record: SessionEvidenceSurvey = {
    id: uid("ev-sess"),
    anonymousKey: actor.anonymousKey,
    analysisId: input.analysisId?.trim() || null,
    clientAnonymousKey: input.clientId
      ? `anon-${input.clientId.slice(0, 8)}`
      : null,
    satisfaction: input.satisfaction,
    understanding: input.understanding,
    homeworkLikelihood: input.homeworkLikelihood,
    nextAppointment: input.nextAppointment,
    freeComment: (input.freeComment ?? "").trim().slice(0, 500),
    submittedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
  sessionStore = [record, ...sessionStore];
  return record;
}

export function createDemoMorningEvidence(
  input: CreateMorningEvidenceInput,
  actor = getDemoEvidenceActor("client"),
): MorningEvidenceSurvey {
  const surveyDate = (input.surveyDate ?? todayTokyoDate()).slice(0, 10);
  const existing = morningStore.find(
    (m) => m.anonymousKey === actor.anonymousKey && m.surveyDate === surveyDate,
  );
  if (existing) {
    const updated: MorningEvidenceSurvey = {
      ...existing,
      sleepSatisfaction: input.sleepSatisfaction,
      morningMood: input.morningMood,
      daytimeCondition: input.daytimeCondition,
      freeComment: (input.freeComment ?? "").trim().slice(0, 500),
      submittedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
    };
    morningStore = morningStore.map((m) =>
      m.id === existing.id ? updated : m,
    );
    return updated;
  }

  const record: MorningEvidenceSurvey = {
    id: uid("ev-morn"),
    anonymousKey: actor.anonymousKey,
    surveyDate,
    sleepSatisfaction: input.sleepSatisfaction,
    morningMood: input.morningMood,
    daytimeCondition: input.daytimeCondition,
    freeComment: (input.freeComment ?? "").trim().slice(0, 500),
    submittedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
  };
  morningStore = [record, ...morningStore];
  return record;
}

export function getDemoMorningEvidenceForToday(
  actor = getDemoEvidenceActor("client"),
): MorningEvidenceSurvey | null {
  const today = todayTokyoDate();
  return (
    morningStore.find(
      (m) => m.anonymousKey === actor.anonymousKey && m.surveyDate === today,
    ) ?? null
  );
}

export function listDemoSessionEvidenceForActor(
  actor = getDemoEvidenceActor("instructor"),
): SessionEvidenceSurvey[] {
  return sessionStore.filter((s) => s.anonymousKey === actor.anonymousKey);
}

export function getDemoEvidenceCollectionBundle(): EvidenceCollectionBundle {
  const aggregate = computeAggregate(sessionStore, morningStore);
  const recentCommentCount =
    sessionStore.filter((s) => s.freeComment.trim()).length +
    morningStore.filter((m) => m.freeComment.trim()).length;

  return {
    aggregate,
    recentSessionCount: sessionStore.length,
    recentMorningCount: morningStore.length,
    recentCommentCount,
  };
}

export function computeDemoAggregateFromStores(): EvidenceAggregateSnapshot {
  return computeAggregate(sessionStore, morningStore);
}

/** テスト用: nextAppointment 型を再エクスポートしない内部ヘルパー */
export function asNextAppointment(value: NextAppointmentIntent): NextAppointmentIntent {
  return value;
}
