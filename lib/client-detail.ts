/**
 * クライアント詳細 — 表示用データ契約。
 * 現状はダミー。Supabase 接続時は getClientDetail 内を差し替える。
 *
 * 想定テーブル:
 * - clients / client_profiles（氏名・年齢・性別・avatar・担当開始日）
 * - instructors（担当認定講師）
 * - analyses（sleep_score・効率・時間・HRV・ストレス・体内時計）
 * - programs / journeys（初回・現在・目標スコア）
 * - activity_events（分析・レポート・Journey・宿題の履歴）
 * - instructor_notes（講師メモ）
 */

import {
  DUMMY_CLIENT_MANAGEMENT_LIST,
  GENDER_LABELS,
  clientInitials,
  formatManagementDate,
  type ClientGender,
  type ClientManagementItem,
} from "@/lib/client-management";

export type ClientDetailMetrics = {
  sleepEfficiency: number | null;
  /** 時間（例: 6.8） */
  sleepHours: number | null;
  hrv: number | null;
  stress: number | null;
  /** 体内時計ずれ（時間） */
  circadianOffsetHours: number | null;
};

export type ClientDetailProgress = {
  initialScore: number | null;
  currentScore: number | null;
  targetScore: number | null;
};

export type ClientDetailActivityKind =
  | "analysis"
  | "report"
  | "journey"
  | "homework";

export type ClientDetailActivityItem = {
  id: string;
  kind: ClientDetailActivityKind;
  /** ISO datetime */
  at: string;
  title: string;
  description: string;
};

export type ClientDetail = {
  id: string;
  name: string;
  age: number | null;
  gender: ClientGender;
  avatarUrl: string | null;
  /** ISO date YYYY-MM-DD — 担当開始日 */
  assignedSince: string | null;
  instructorName: string;
  sleepScore: number | null;
  metrics: ClientDetailMetrics;
  progress: ClientDetailProgress;
  timeline: ClientDetailActivityItem[];
  notes: string;
};

export const ACTIVITY_KIND_LABELS: Record<ClientDetailActivityKind, string> = {
  analysis: "分析実施",
  report: "レポート生成",
  journey: "Journey更新",
  homework: "宿題送信",
};

const DEFAULT_INSTRUCTOR = "山田 先生";

/** クライアントごとの詳細ダミー。一覧の ID と揃える。 */
const DETAIL_OVERRIDES: Record<
  string,
  Partial<
    Pick<
      ClientDetail,
      | "assignedSince"
      | "instructorName"
      | "metrics"
      | "progress"
      | "timeline"
      | "notes"
    >
  >
> = {
  "client-demo-1": {
    assignedSince: "2026-03-12",
    metrics: {
      sleepEfficiency: 84,
      sleepHours: 6.8,
      hrv: 48,
      stress: 42,
      circadianOffsetHours: 1.2,
    },
    progress: {
      initialScore: 58,
      currentScore: 72,
      targetScore: 85,
    },
    timeline: [
      {
        id: "t1-1",
        kind: "analysis",
        at: "2026-07-18T10:30:00+09:00",
        title: "分析実施",
        description: "Sleep Wellness 分析を完了しました",
      },
      {
        id: "t1-2",
        kind: "report",
        at: "2026-07-18T10:42:00+09:00",
        title: "レポート生成",
        description: "AIレポートとPDFを作成しました",
      },
      {
        id: "t1-3",
        kind: "journey",
        at: "2026-07-19T09:15:00+09:00",
        title: "Journey更新",
        description: "就寝ルーティンの進捗を更新しました",
      },
      {
        id: "t1-4",
        kind: "homework",
        at: "2026-07-20T18:00:00+09:00",
        title: "宿題送信",
        description: "就寝90分前のブルーライト制限を送信しました",
      },
    ],
    notes:
      "起床後の倦怠感が改善傾向。週末の就寝時刻のばらつきが残課題。次回は体内時計のずれを重点確認。",
  },
  "client-demo-2": {
    assignedSince: "2026-04-02",
    metrics: {
      sleepEfficiency: 71,
      sleepHours: 5.9,
      hrv: 36,
      stress: 58,
      circadianOffsetHours: 2.1,
    },
    progress: {
      initialScore: 54,
      currentScore: 61,
      targetScore: 80,
    },
    timeline: [
      {
        id: "t2-1",
        kind: "analysis",
        at: "2026-07-15T14:00:00+09:00",
        title: "分析実施",
        description: "Sleep Wellness 分析を完了しました",
      },
      {
        id: "t2-2",
        kind: "report",
        at: "2026-07-15T14:12:00+09:00",
        title: "レポート生成",
        description: "AIレポートを生成しました",
      },
      {
        id: "t2-3",
        kind: "homework",
        at: "2026-07-16T11:30:00+09:00",
        title: "宿題送信",
        description: "就寝前ストレッチを送信しました",
      },
      {
        id: "t2-4",
        kind: "journey",
        at: "2026-07-22T16:40:00+09:00",
        title: "Journey更新",
        description: "ストレスケア段階を更新しました",
      },
    ],
    notes:
      "仕事の残業が多く中途覚醒が続く。HRVが低めのため、休息日の設計を一緒に見直す。",
  },
  "client-demo-3": {
    assignedSince: "2026-02-20",
    metrics: {
      sleepEfficiency: 88,
      sleepHours: 7.2,
      hrv: 55,
      stress: 31,
      circadianOffsetHours: 0.4,
    },
    progress: {
      initialScore: 66,
      currentScore: 78,
      targetScore: 88,
    },
    timeline: [
      {
        id: "t3-1",
        kind: "analysis",
        at: "2026-07-20T09:20:00+09:00",
        title: "分析実施",
        description: "Sleep Wellness 分析を完了しました",
      },
      {
        id: "t3-2",
        kind: "report",
        at: "2026-07-20T09:35:00+09:00",
        title: "レポート生成",
        description: "PDFレポートを出力しました",
      },
      {
        id: "t3-3",
        kind: "journey",
        at: "2026-07-21T20:10:00+09:00",
        title: "Journey更新",
        description: "目標スコア到達に向けた計画を更新しました",
      },
    ],
    notes: "全体的に安定。朝の光浴び習慣が定着。次は深い睡眠の質をさらに底上げ。",
  },
};

function defaultMetrics(score: number | null): ClientDetailMetrics {
  if (score == null) {
    return {
      sleepEfficiency: null,
      sleepHours: null,
      hrv: null,
      stress: null,
      circadianOffsetHours: null,
    };
  }
  return {
    sleepEfficiency: Math.min(95, Math.max(55, score + 8)),
    sleepHours: Math.round((5.5 + score / 50) * 10) / 10,
    hrv: Math.round(28 + score / 3),
    stress: Math.max(20, Math.round(90 - score)),
    circadianOffsetHours: Math.round((3 - score / 40) * 10) / 10,
  };
}

function defaultProgress(score: number | null): ClientDetailProgress {
  if (score == null) {
    return { initialScore: null, currentScore: null, targetScore: 80 };
  }
  return {
    initialScore: Math.max(40, score - 12),
    currentScore: score,
    targetScore: Math.min(95, score + 12),
  };
}

function defaultTimeline(item: ClientManagementItem): ClientDetailActivityItem[] {
  const baseDate = item.lastAnalysisDate ?? item.assignedDay ?? "2026-07-20";
  return [
    {
      id: `${item.id}-a1`,
      kind: "analysis",
      at: `${baseDate}T10:00:00+09:00`,
      title: "分析実施",
      description: "Sleep Wellness 分析を完了しました",
    },
    {
      id: `${item.id}-a2`,
      kind: "report",
      at: `${baseDate}T10:15:00+09:00`,
      title: "レポート生成",
      description: "AIレポートを生成しました",
    },
    {
      id: `${item.id}-a3`,
      kind: "journey",
      at: `${baseDate}T18:00:00+09:00`,
      title: "Journey更新",
      description: "Sleep Journey の進捗を更新しました",
    },
    {
      id: `${item.id}-a4`,
      kind: "homework",
      at: `${baseDate}T19:00:00+09:00`,
      title: "宿題送信",
      description: "今週の宿題を送信しました",
    },
  ];
}

function buildFromListItem(item: ClientManagementItem): ClientDetail {
  const override = DETAIL_OVERRIDES[item.id];
  return {
    id: item.id,
    name: item.name,
    age: item.age,
    gender: item.gender,
    avatarUrl: item.avatarUrl,
    assignedSince: override?.assignedSince ?? item.assignedDay,
    instructorName: override?.instructorName ?? DEFAULT_INSTRUCTOR,
    sleepScore: item.sleepScore,
    metrics: override?.metrics ?? defaultMetrics(item.sleepScore),
    progress: override?.progress ?? defaultProgress(item.sleepScore),
    timeline: override?.timeline ?? defaultTimeline(item),
    notes:
      override?.notes ??
      "指導メモはまだありません。セッション後の気づきを記録してください。",
  };
}

/**
 * クライアント詳細取得。
 * TODO(Supabase): clients を profiles / analyses / programs /
 * activity_events / instructor_notes と結合して ClientDetail を返す。
 */
export async function getClientDetail(
  id: string,
): Promise<ClientDetail | null> {
  const item = DUMMY_CLIENT_MANAGEMENT_LIST.find((client) => client.id === id);
  if (!item) return null;
  return buildFromListItem(item);
}

export function formatDetailDate(isoDate: string | null): string {
  return formatManagementDate(isoDate);
}

export function formatTimelineWhen(isoDatetime: string): string {
  const d = new Date(isoDatetime);
  if (Number.isNaN(d.getTime())) return isoDatetime;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatGender(gender: ClientGender): string {
  return GENDER_LABELS[gender];
}

export function formatMetricHours(value: number | null): string {
  if (value == null) return "—";
  return `${value.toFixed(1)}h`;
}

export function formatMetricPercent(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value)}%`;
}

export function formatMetricNumber(value: number | null, unit = ""): string {
  if (value == null) return "—";
  return `${Math.round(value)}${unit}`;
}

export { clientInitials };
