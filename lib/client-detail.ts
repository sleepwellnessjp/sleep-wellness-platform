/**
 * クライアント詳細 — 表示用データ契約。
 * clients / analyses / programs / appointments / guidance notes / homeworks を集約する。
 */

import {
  DUMMY_CLIENT_MANAGEMENT_LIST,
  GENDER_LABELS,
  clientInitials,
  formatManagementDate,
  mapGender,
  type ClientGender,
  type ClientManagementItem,
} from "@/lib/client-management";
import {
  analysisSleepScore,
  getClientById,
} from "@/lib/repositories/client-repository";
import { listGuidanceNotes } from "@/lib/repositories/client-guidance-notes-repository";
import { listBetaHomeworks } from "@/lib/repositories/beta-homework-repository";
import { listSleepJourneysForClient } from "@/lib/repositories/sleep-journeys-repository";
import { getProgramDetail } from "@/lib/repositories/program-repository";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { StoredAnalysis, StoredClient } from "@/lib/client-store";

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
  /** 最新分析 ID（PDF / レポート導線用） */
  latestAnalysisId: string | null;
  /** ISO date YYYY-MM-DD — clients.next_follow_up_date */
  nextFollowUpDate: string | null;
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

const DEFAULT_INSTRUCTOR = "認定講師";

function parseHours(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const n = Number(match[1]);
  return Number.isFinite(n) ? n : null;
}

function parseNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const match = value.replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function metricsFromAnalysis(analysis: StoredAnalysis | null): ClientDetailMetrics {
  if (!analysis) {
    return {
      sleepEfficiency: null,
      sleepHours: null,
      hrv: null,
      stress: null,
      circadianOffsetHours: null,
    };
  }
  const m = analysis.metrics;
  const structured = analysis.structured;
  return {
    sleepEfficiency: parseNumber(m.sleepEfficiency),
    sleepHours: parseHours(m.sleepDuration),
    hrv: parseNumber(m.hrv),
      stress:
      parseNumber(structured?.stressAverage) ??
      null,
    circadianOffsetHours: null,
  };
}

function progressFromAnalyses(
  analyses: StoredAnalysis[],
): ClientDetailProgress {
  if (analyses.length === 0) {
    return { initialScore: null, currentScore: null, targetScore: 80 };
  }
  const newest = analysisSleepScore(analyses[0]!);
  const oldest = analysisSleepScore(analyses[analyses.length - 1]!);
  const current = newest;
  const initial = oldest;
  const target =
    current != null ? Math.min(95, Math.max(70, current + 10)) : 80;
  return {
    initialScore: initial,
    currentScore: current,
    targetScore: target,
  };
}

function timelineFromClient(
  client: StoredClient,
  journeyUpdatedAt: string | null,
  homeworkItems: Array<{ id: string; title: string; at: string }>,
): ClientDetailActivityItem[] {
  const items: ClientDetailActivityItem[] = [];

  for (const analysis of client.analyses.slice(0, 8)) {
    items.push({
      id: `analysis-${analysis.id}`,
      kind: "analysis",
      at: analysis.createdAt || `${analysis.analysisDate}T12:00:00+09:00`,
      title: "分析実施",
      description: `Sleep Wellness 分析を完了しました（スコア ${
        analysisSleepScore(analysis) ?? "—"
      }）`,
    });
    for (const pdf of analysis.pdfHistory.slice(0, 2)) {
      items.push({
        id: `report-${pdf.id}`,
        kind: "report",
        at: pdf.createdAt,
        title: "レポート生成",
        description: pdf.label || "PDFレポートを作成しました",
      });
    }
  }

  if (journeyUpdatedAt) {
    items.push({
      id: `journey-${client.id}`,
      kind: "journey",
      at: journeyUpdatedAt,
      title: "Journey更新",
      description: "Sleep Journey の進捗を更新しました",
    });
  }

  for (const hw of homeworkItems) {
    items.push({
      id: `homework-${hw.id}`,
      kind: "homework",
      at: hw.at,
      title: "宿題送信",
      description: hw.title || "宿題を送信しました",
    });
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
}

async function resolveInstructorName(): Promise<string> {
  if (!isSupabaseConfigured()) return DEFAULT_INSTRUCTOR;
  const supabase = createBrowserClient();
  if (!supabase) return DEFAULT_INSTRUCTOR;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DEFAULT_INSTRUCTOR;
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const name =
    data && typeof (data as { display_name?: string | null }).display_name === "string"
      ? (data as { display_name: string }).display_name.trim()
      : "";
  if (!name) return DEFAULT_INSTRUCTOR;
  return name.endsWith("先生") ? name : `${name} 先生`;
}

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
    sleepEfficiency: Math.min(95, Math.max(60, score + 8)),
    sleepHours: 6.5 + (score - 70) * 0.02,
    hrv: Math.round(35 + score * 0.2),
    stress: Math.max(20, 90 - score),
    circadianOffsetHours: score >= 75 ? 0.5 : 1.2,
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
  return {
    id: item.id,
    name: item.name,
    age: item.age,
    gender: item.gender,
    avatarUrl: item.avatarUrl,
    assignedSince: item.assignedDay,
    instructorName: item.instructorName || DEFAULT_INSTRUCTOR,
    sleepScore: item.sleepScore,
    latestAnalysisId: null,
    nextFollowUpDate: item.nextFollowUpDate,
    metrics: defaultMetrics(item.sleepScore),
    progress: defaultProgress(item.sleepScore),
    timeline: defaultTimeline(item),
    notes:
      "指導メモはまだありません。セッション後の気づきを記録してください。",
  };
}

/**
 * クライアント詳細取得。
 */
export async function getClientDetail(
  id: string,
): Promise<ClientDetail | null> {
  let client: StoredClient | null = null;
  try {
    client = await getClientById(id);
  } catch (error) {
    console.error("[client-detail] getClientById failed:", error);
  }

  if (!client) {
    if (!isSupabaseConfigured()) {
      const item = DUMMY_CLIENT_MANAGEMENT_LIST.find((row) => row.id === id);
      if (!item) return null;
      return buildFromListItem(item);
    }
    return null;
  }

  const latest = client.analyses[0] ?? null;
  let journeyUpdatedAt: string | null = null;
  let notes = client.memo?.trim() || "";

  try {
    const program = await getProgramDetail(client.id);
    journeyUpdatedAt = program?.updatedAt ?? null;
    if (!notes && program?.instructorMemo?.trim()) {
      notes = program.instructorMemo.trim();
    }
  } catch {
    // ignore
  }

  try {
    const journeys = await listSleepJourneysForClient(client.id);
    const latestJourney = journeys[journeys.length - 1];
    if (latestJourney?.createdAt) {
      journeyUpdatedAt = latestJourney.createdAt;
    } else if (latestJourney?.recordedAt) {
      journeyUpdatedAt = `${latestJourney.recordedAt}T12:00:00+09:00`;
    }
  } catch {
    // sleep_journeys 未適用環境は programs 由来の値を維持
  }

  try {
    const guidance = await listGuidanceNotes(client.id);
    if (guidance.length > 0) {
      notes = guidance
        .slice()
        .reverse()
        .map((note) => note.content)
        .join("\n\n");
    }
  } catch {
    // ignore
  }

  let homeworkItems: Array<{ id: string; title: string; at: string }> = [];
  try {
    const homeworks = await listBetaHomeworks(client.id);
    homeworkItems = homeworks.slice(0, 8).map((hw) => ({
      id: hw.id,
      title: hw.title,
      at: `${hw.startDate}T12:00:00+09:00`,
    }));
  } catch {
    // ignore
  }

  const instructorName = await resolveInstructorName();

  return {
    id: client.id,
    name: client.name,
    age: typeof client.age === "number" ? client.age : null,
    gender: mapGender(client.gender),
    avatarUrl: null,
    assignedSince: client.registeredAt?.slice(0, 10) ?? null,
    instructorName,
    sleepScore:
      typeof client.currentSleepScore === "number"
        ? client.currentSleepScore
        : latest
          ? analysisSleepScore(latest)
          : null,
    latestAnalysisId: latest?.id ?? null,
    nextFollowUpDate: client.nextFollowUpDate?.trim() || null,
    metrics: metricsFromAnalysis(latest),
    progress: progressFromAnalyses(client.analyses),
    timeline: timelineFromClient(client, journeyUpdatedAt, homeworkItems),
    notes:
      notes ||
      "指導メモはまだありません。セッション後の気づきを記録してください。",
  };
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
