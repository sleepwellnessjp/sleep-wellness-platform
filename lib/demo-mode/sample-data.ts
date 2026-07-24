/**
 * Demo Mode — ダッシュボード / フロー用サンプルデータ。
 * Supabase・講師の実クライアントとは完全に分離（読み取り専用の定数）。
 */

import {
  DEMO_CLIENTS,
  DEMO_INSTRUCTOR,
  DEFAULT_DEMO_CLIENT_ID,
  getDefaultDemoClient,
  type DemoClient,
} from "@/lib/demo-clients";

export type DemoDashboardSnapshot = {
  instructor: typeof DEMO_INSTRUCTOR;
  clientCount: number;
  analyzedCount: number;
  averageSleepScore: number;
  followUpDueCount: number;
  homeworkActiveCount: number;
  journeyInProgressCount: number;
  reportReadyCount: number;
  featuredClient: DemoClient;
  clients: readonly DemoClient[];
  recentActivity: { id: string; whenLabel: string; summary: string }[];
  aiHighlights: string[];
  sampleSleepMetrics: {
    sleepScore: number;
    sleepDuration: string;
    sleepEfficiency: string;
    deepSleepRate: string;
    hrv: string;
    stress: string;
  };
  sampleAiSuggestions: { stars: number; text: string }[];
  sampleHomeworks: {
    title: string;
    progressRate: number;
    status: string;
  }[];
  sampleJourney: {
    label: string;
    sleepScore: number | null;
    status: "completed" | "current" | "upcoming";
  }[];
  sampleFollowUps: {
    conductedAt: string;
    method: string;
    finding: string;
  }[];
  sampleReports: {
    clientName: string;
    title: string;
    sleepScore: number | null;
    status: string;
  }[];
};

function averageScore(clients: readonly DemoClient[]): number {
  const scored = clients.filter((c) => c.sleepScore != null);
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, c) => acc + (c.sleepScore ?? 0), 0);
  return Math.round(sum / scored.length);
}

export function getDemoDashboardSnapshot(): DemoDashboardSnapshot {
  const featured = getDefaultDemoClient();
  const analyzed = DEMO_CLIENTS.filter((c) => c.lastAnalysisDate != null);

  return {
    instructor: DEMO_INSTRUCTOR,
    clientCount: DEMO_CLIENTS.length,
    analyzedCount: analyzed.length,
    averageSleepScore: averageScore(DEMO_CLIENTS),
    followUpDueCount: 5,
    homeworkActiveCount: 8,
    journeyInProgressCount: 9,
    reportReadyCount: 10,
    featuredClient: featured,
    clients: DEMO_CLIENTS,
    recentActivity: [
      {
        id: "demo-act-1",
        whenLabel: "昨日",
        summary: `${featured.name}さんの分析が完了しました`,
      },
      {
        id: "demo-act-2",
        whenLabel: "昨日",
        summary: "改善レポート（PDF）を作成しました",
      },
      {
        id: "demo-act-3",
        whenLabel: "2日前",
        summary: "鈴木 健太さんの Journey を更新しました",
      },
      {
        id: "demo-act-4",
        whenLabel: "3日前",
        summary: "Homework の達成率を確認しました",
      },
    ],
    aiHighlights: [
      "入眠前60分の強い光を控え、切り替え時間をつくる",
      "就寝前のゆっくりした呼吸で副交感神経を整える",
      "平日の起床時刻を揃え、朝の光を数分取り入れる",
    ],
    sampleSleepMetrics: {
      sleepScore: featured.sleepScore ?? 72,
      sleepDuration: "6時間48分",
      sleepEfficiency: "87%",
      deepSleepRate: "18%",
      hrv: "42 ms",
      stress: "28",
    },
    sampleAiSuggestions: [
      {
        stars: 5,
        text: "入眠前60分の強い光を控え、切り替え時間をつくる",
      },
      {
        stars: 4,
        text: "就寝前にゆっくりした呼吸で体を休める準備をする",
      },
      {
        stars: 4,
        text: "就寝90〜60分前のぬるめ入浴で体温リズムを整える",
      },
      {
        stars: 3,
        text: "翌朝同じ時刻に起き、朝の光を数分取り入れる",
      },
    ],
    sampleHomeworks: [
      {
        title: "就寝90分前までに入浴を終える",
        progressRate: 80,
        status: "継続中",
      },
      {
        title: "入眠前60分は強い光を控える",
        progressRate: 65,
        status: "継続中",
      },
      {
        title: "起床時刻を平日で揃える",
        progressRate: 100,
        status: "完了",
      },
    ],
    sampleJourney: [
      { label: "初回分析", sleepScore: 58, status: "completed" },
      { label: "1週間", sleepScore: 63, status: "completed" },
      { label: "2週間", sleepScore: 68, status: "completed" },
      { label: "4週間", sleepScore: 72, status: "current" },
      { label: "8週間", sleepScore: null, status: "upcoming" },
    ],
    sampleFollowUps: [
      {
        conductedAt: "2026-07-18",
        method: "オンライン",
        finding: "就寝ルーティンが定着。週末のリズム崩れに注意。",
      },
      {
        conductedAt: "2026-07-04",
        method: "対面",
        finding: "入眠までの時間が短縮。仕事のストレスは依然高め。",
      },
    ],
    sampleReports: DEMO_CLIENTS.filter((c) => c.sleepScore != null)
      .slice(0, 5)
      .map((client) => ({
        clientName: client.name,
        title: "Sleep Wellness Report",
        sleepScore: client.sleepScore,
        status: "発行済み",
      })),
  };
}

export { DEFAULT_DEMO_CLIENT_ID, DEMO_CLIENTS, DEMO_INSTRUCTOR };
