/**
 * Executive Dashboard — Version 1.0 価値可視化レイヤ。
 * 既存の分析・宿題・Journey・認定データを「改善が一目で分かる」形に集約する。
 * 新規ドメイン機能は追加しない。
 */

import { analysisSleepScore, type StoredClient } from "@/lib/client-store";
import { todayInTokyo } from "@/lib/repositories/client-homeworks-repository";
import { parseLeadingNumber } from "@/lib/soxai-graphs";
import type {
  SwiAnalysisRow,
  SwiClientRow,
  SwiHomeworkRow,
} from "@/lib/swi/aggregate";
import type { SwiScope } from "@/lib/swi/types";

export type ExecutiveActivityKind =
  | "analysis"
  | "homework"
  | "journey"
  | "certification"
  | "login";

export type ExecutiveOverview = {
  instructorCount: number;
  clientCount: number;
  analysisCount: number;
  averageSleepWellnessScore: number | null;
};

export type ExecutiveImprovement = {
  /** 初回→最新の平均 Score 差分（点） */
  averageScoreDelta: number | null;
  averageSleepEfficiency: number | null;
  averageHrv: number | null;
  /** 宿題達成率 0–100 */
  homeworkCompletionRate: number | null;
};

export type ExecutiveToday = {
  analysesCount: number;
  homeworkCompleted: number;
  loginCount: number;
};

export type ExecutiveSuccessStory = {
  /** 匿名ラベル（例: Client A） */
  anonymousLabel: string;
  title: string;
  summary: string;
  scoreFrom: number | null;
  scoreTo: number | null;
  scoreDelta: number | null;
  badges: Array<{ id: string; label: string }>;
};

export type ExecutiveTimelineItem = {
  id: string;
  at: string;
  kind: ExecutiveActivityKind;
  label: string;
  detail: string;
};

export type ExecutiveDashboardData = {
  scope: SwiScope;
  generatedAt: string;
  overview: ExecutiveOverview;
  improvement: ExecutiveImprovement;
  today: ExecutiveToday;
  successStory: ExecutiveSuccessStory | null;
  timeline: ExecutiveTimelineItem[];
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return round1(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

function dayKeyTokyo(iso: string): string {
  const trimmed = iso.trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    // ISO 日付または日時。Asia/Tokyo で日付キー化。
    const d = new Date(trimmed.length === 10 ? `${trimmed}T12:00:00+09:00` : trimmed);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
    }
  }
  return trimmed.slice(0, 10);
}

function formatTimeTokyo(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

function anonymousLabelForIndex(index: number): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  return `Client ${letters[index % letters.length] ?? "A"}`;
}

function scoresChronological(analyses: SwiAnalysisRow[]): Map<string, number[]> {
  const map = new Map<string, number[]>();
  const sorted = [...analyses].sort((a, b) => {
    const ta = a.analyzedAt || a.createdAt;
    const tb = b.analyzedAt || b.createdAt;
    return ta.localeCompare(tb);
  });
  for (const row of sorted) {
    if (typeof row.sleepScore !== "number" || !Number.isFinite(row.sleepScore)) {
      continue;
    }
    const list = map.get(row.clientId) ?? [];
    list.push(row.sleepScore);
    map.set(row.clientId, list);
  }
  return map;
}

function buildAverageScoreDelta(analyses: SwiAnalysisRow[]): number | null {
  const byClient = scoresChronological(analyses);
  const deltas: number[] = [];
  for (const scores of byClient.values()) {
    if (scores.length < 2) continue;
    deltas.push(scores[scores.length - 1]! - scores[0]!);
  }
  return avg(deltas);
}

function buildHomeworkRate(homeworks: SwiHomeworkRow[]): number | null {
  if (homeworks.length === 0) return null;
  const completed = homeworks.filter((h) => h.isCompleted).length;
  return Math.round((completed / homeworks.length) * 100);
}

function buildSuccessStoryFromAnalyses(
  analyses: SwiAnalysisRow[],
): ExecutiveSuccessStory | null {
  const byClient = scoresChronological(analyses);
  let bestId: string | null = null;
  let bestDelta = -Infinity;
  let bestFrom: number | null = null;
  let bestTo: number | null = null;
  let bestEfficiencyGain: number | null = null;
  let bestHrvGain: number | null = null;

  let index = 0;
  const indexById = new Map<string, number>();
  for (const [clientId, scores] of byClient) {
    indexById.set(clientId, index);
    index += 1;
    if (scores.length < 2) continue;
    const from = scores[0]!;
    const to = scores[scores.length - 1]!;
    const delta = to - from;
    if (delta > bestDelta) {
      bestDelta = delta;
      bestId = clientId;
      bestFrom = from;
      bestTo = to;

      const clientRows = analyses
        .filter((a) => a.clientId === clientId)
        .sort((a, b) =>
          (a.analyzedAt || a.createdAt).localeCompare(
            b.analyzedAt || b.createdAt,
          ),
        );
      const first = clientRows[0];
      const last = clientRows[clientRows.length - 1];
      if (
        first?.sleepEfficiency != null &&
        last?.sleepEfficiency != null
      ) {
        bestEfficiencyGain = round1(last.sleepEfficiency - first.sleepEfficiency);
      } else {
        bestEfficiencyGain = null;
      }
      if (first?.hrv != null && last?.hrv != null) {
        bestHrvGain = round1(last.hrv - first.hrv);
      } else {
        bestHrvGain = null;
      }
    }
  }

  if (bestId == null || bestDelta < 3 || bestFrom == null || bestTo == null) {
    return null;
  }

  const badges: Array<{ id: string; label: string }> = [
    { id: "score_up", label: `Score +${Math.round(bestDelta)}` },
  ];
  if (bestEfficiencyGain != null && bestEfficiencyGain >= 3) {
    badges.push({ id: "efficiency", label: "睡眠効率アップ" });
  }
  if (bestHrvGain != null && bestHrvGain >= 5) {
    badges.push({ id: "hrv", label: "HRV改善" });
  }

  const summaryParts = [
    `最初の Sleep Wellness Score は${Math.round(bestFrom)}でした。`,
    `分析と宿題の積み重ねを経て、現在は${Math.round(bestTo)}まで改善しています。`,
  ];
  if (bestEfficiencyGain != null && bestEfficiencyGain > 0) {
    summaryParts.push(
      `睡眠効率も${bestEfficiencyGain.toFixed(1)}ポイント向上しました。`,
    );
  }
  summaryParts.push(
    "個人を特定できる情報は含みません。Journey に基づく匿名の改善例です。",
  );

  return {
    anonymousLabel: anonymousLabelForIndex(indexById.get(bestId) ?? 0),
    title: "Sleep Wellness Journey",
    summary: summaryParts.join(" "),
    scoreFrom: round1(bestFrom),
    scoreTo: round1(bestTo),
    scoreDelta: round1(bestDelta),
    badges,
  };
}

function buildTodayCounts(input: {
  analyses: SwiAnalysisRow[];
  homeworks: Array<SwiHomeworkRow & { completedAt?: string | null }>;
  loginCount: number;
  today?: string;
}): ExecutiveToday {
  const today = input.today ?? todayInTokyo();
  const analysesCount = input.analyses.filter((a) => {
    const key = dayKeyTokyo(a.createdAt || a.analyzedAt);
    return key === today;
  }).length;

  const homeworkCompleted = input.homeworks.filter((h) => {
    if (!h.isCompleted) return false;
    if (h.completedAt) return dayKeyTokyo(h.completedAt) === today;
    // completedAt が無い場合は dueDate 当日完了とみなす（デモ互換）
    return h.dueDate === today;
  }).length;

  return {
    analysesCount,
    homeworkCompleted,
    loginCount: input.loginCount,
  };
}

export function buildExecutiveDashboard(input: {
  scope: SwiScope;
  instructorCount: number;
  clients: SwiClientRow[];
  analyses: SwiAnalysisRow[];
  homeworks: Array<SwiHomeworkRow & { completedAt?: string | null }>;
  loginCountToday: number;
  timeline?: ExecutiveTimelineItem[];
  successStory?: ExecutiveSuccessStory | null;
}): ExecutiveDashboardData {
  const efficiencies: number[] = [];
  const hrvs: number[] = [];
  for (const row of input.analyses) {
    if (
      typeof row.sleepEfficiency === "number" &&
      Number.isFinite(row.sleepEfficiency)
    ) {
      efficiencies.push(row.sleepEfficiency);
    }
    if (typeof row.hrv === "number" && Number.isFinite(row.hrv) && row.hrv > 0) {
      hrvs.push(row.hrv);
    }
  }

  const scores = input.analyses
    .map((a) => a.sleepScore)
    .filter((n): n is number => typeof n === "number" && Number.isFinite(n));

  return {
    scope: input.scope,
    generatedAt: new Date().toISOString(),
    overview: {
      instructorCount: input.instructorCount,
      clientCount: input.clients.length,
      analysisCount: input.analyses.length,
      averageSleepWellnessScore: avg(scores),
    },
    improvement: {
      averageScoreDelta: buildAverageScoreDelta(input.analyses),
      averageSleepEfficiency: avg(efficiencies),
      averageHrv: avg(hrvs),
      homeworkCompletionRate: buildHomeworkRate(input.homeworks),
    },
    today: buildTodayCounts({
      analyses: input.analyses,
      homeworks: input.homeworks,
      loginCount: input.loginCountToday,
    }),
    successStory:
      input.successStory !== undefined
        ? input.successStory
        : buildSuccessStoryFromAnalyses(input.analyses),
    timeline: input.timeline ?? [],
  };
}

/** localStorage / 講師クライアントから同期集計（API 未接続時の補強） */
export function computeExecutiveDashboardFromClients(
  clients: StoredClient[],
  options?: {
    instructorCount?: number;
    loginCountToday?: number;
    scope?: SwiScope;
  },
): ExecutiveDashboardData {
  const swiClients: SwiClientRow[] = clients.map((c) => ({
    id: c.id,
    gender: null,
    age: null,
    birthDate: null,
    registeredAt: c.registeredAt,
    createdAt: c.registeredAt,
  }));

  const analyses: SwiAnalysisRow[] = [];
  for (const client of clients) {
    for (const analysis of client.analyses) {
      const score = analysisSleepScore(analysis);
      analyses.push({
        id: analysis.id,
        clientId: client.id,
        sleepScore: score,
        sleepDuration: parseLeadingNumber(
          String(analysis.metrics.sleepDuration ?? ""),
        ),
        sleepEfficiency: parseLeadingNumber(
          String(analysis.metrics.sleepEfficiency ?? ""),
        ),
        hrv: parseLeadingNumber(String(analysis.metrics.hrv ?? "")),
        stress: parseLeadingNumber(
          String(
            analysis.structured?.stressAverage?.trim() ||
              analysis.metrics.stress ||
              "",
          ),
        ),
        analyzedAt: analysis.analysisDate,
        createdAt: analysis.createdAt,
      });
    }
  }

  const today = todayInTokyo();
  const timeline: ExecutiveTimelineItem[] = [];

  for (const client of clients) {
    for (const analysis of client.analyses) {
      if (dayKeyTokyo(analysis.createdAt) !== today) continue;
      timeline.push({
        id: `analysis-${analysis.id}`,
        at: analysis.createdAt,
        kind: "analysis",
        label: "分析",
        detail: "睡眠ウェルネス分析が完了しました",
      });
    }
  }

  timeline.sort((a, b) => b.at.localeCompare(a.at));

  return buildExecutiveDashboard({
    scope: options?.scope ?? "instructor",
    instructorCount: options?.instructorCount ?? 1,
    clients: swiClients,
    analyses,
    homeworks: [],
    loginCountToday: options?.loginCountToday ?? 0,
    timeline: timeline.slice(0, 12),
  });
}

/** デモ用の充実した Executive Dashboard（Supabase 未設定時） */
export function getDemoExecutiveDashboard(
  scope: SwiScope = "platform",
): ExecutiveDashboardData {
  const now = Date.now();
  const today = todayInTokyo();

  const clients: SwiClientRow[] = [
    {
      id: "c1",
      gender: "女性",
      age: 34,
      birthDate: null,
      registeredAt: "2025-11-01",
      createdAt: "2025-11-01T00:00:00.000Z",
    },
    {
      id: "c2",
      gender: "男性",
      age: 41,
      birthDate: null,
      registeredAt: "2025-12-01",
      createdAt: "2025-12-01T00:00:00.000Z",
    },
    {
      id: "c3",
      gender: "女性",
      age: 29,
      birthDate: null,
      registeredAt: "2026-01-15",
      createdAt: "2026-01-15T00:00:00.000Z",
    },
    {
      id: "c4",
      gender: "男性",
      age: 52,
      birthDate: null,
      registeredAt: "2026-02-01",
      createdAt: "2026-02-01T00:00:00.000Z",
    },
  ];

  const analyses: SwiAnalysisRow[] = [
    {
      id: "a1",
      clientId: "c1",
      sleepScore: 61,
      sleepDuration: 6.1,
      sleepEfficiency: 81,
      hrv: 27,
      stress: 52,
      analyzedAt: "2026-01-12T00:00:00.000Z",
      createdAt: "2026-01-12T00:00:00.000Z",
    },
    {
      id: "a2",
      clientId: "c1",
      sleepScore: 74,
      sleepDuration: 7.0,
      sleepEfficiency: 89,
      hrv: 36,
      stress: 34,
      analyzedAt: "2026-06-18T00:00:00.000Z",
      createdAt: "2026-06-18T00:00:00.000Z",
    },
    {
      id: "a3",
      clientId: "c2",
      sleepScore: 68,
      sleepDuration: 6.8,
      sleepEfficiency: 85,
      hrv: 33,
      stress: 40,
      analyzedAt: "2026-02-10T00:00:00.000Z",
      createdAt: "2026-02-10T00:00:00.000Z",
    },
    {
      id: "a4",
      clientId: "c2",
      sleepScore: 76,
      sleepDuration: 7.2,
      sleepEfficiency: 91,
      hrv: 42,
      stress: 31,
      analyzedAt: "2026-07-01T00:00:00.000Z",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
    {
      id: "a5",
      clientId: "c3",
      sleepScore: 70,
      sleepDuration: 6.9,
      sleepEfficiency: 87,
      hrv: 38,
      stress: 36,
      analyzedAt: `${today}T02:10:00.000Z`,
      createdAt: new Date(now - 2 * 3_600_000).toISOString(),
    },
    {
      id: "a6",
      clientId: "c4",
      sleepScore: 58,
      sleepDuration: 5.9,
      sleepEfficiency: 78,
      hrv: 24,
      stress: 55,
      analyzedAt: "2026-03-01T00:00:00.000Z",
      createdAt: "2026-03-01T00:00:00.000Z",
    },
    {
      id: "a7",
      clientId: "c4",
      sleepScore: 67,
      sleepDuration: 6.5,
      sleepEfficiency: 84,
      hrv: 30,
      stress: 44,
      analyzedAt: "2026-06-20T00:00:00.000Z",
      createdAt: "2026-06-20T00:00:00.000Z",
    },
  ];

  const homeworks: Array<SwiHomeworkRow & { completedAt?: string | null }> = [
    {
      clientId: "c1",
      title: "朝日習慣",
      isCompleted: true,
      dueDate: "2026-06-01",
      completedAt: "2026-06-01T08:00:00.000Z",
    },
    {
      clientId: "c1",
      title: "3:6呼吸",
      isCompleted: true,
      dueDate: "2026-06-08",
      completedAt: "2026-06-08T21:00:00.000Z",
    },
    {
      clientId: "c2",
      title: "就寝時刻固定",
      isCompleted: true,
      dueDate: today,
      completedAt: new Date(now - 4 * 3_600_000).toISOString(),
    },
    {
      clientId: "c3",
      title: "メラトニンヨガ™",
      isCompleted: true,
      dueDate: today,
      completedAt: new Date(now - 5 * 3_600_000).toISOString(),
    },
    {
      clientId: "c4",
      title: "入浴改善",
      isCompleted: false,
      dueDate: today,
      completedAt: null,
    },
  ];

  const timeline: ExecutiveTimelineItem[] = [
    {
      id: "t1",
      at: new Date(now - 1.5 * 3_600_000).toISOString(),
      kind: "analysis",
      label: "分析",
      detail: "睡眠ウェルネス分析が完了しました",
    },
    {
      id: "t2",
      at: new Date(now - 3 * 3_600_000).toISOString(),
      kind: "homework",
      label: "宿題",
      detail: "今日の宿題が完了として記録されました",
    },
    {
      id: "t3",
      at: new Date(now - 5 * 3_600_000).toISOString(),
      kind: "journey",
      label: "Journey",
      detail: "改善ストーリーが更新されました",
    },
    {
      id: "t4",
      at: new Date(now - 7 * 3_600_000).toISOString(),
      kind: "certification",
      label: "認定",
      detail: "認定資格の確認・更新が記録されました",
    },
    {
      id: "t5",
      at: new Date(now - 9 * 3_600_000).toISOString(),
      kind: "login",
      label: "ログイン",
      detail: "プラットフォームへのサインイン",
    },
  ];

  const base = buildExecutiveDashboard({
    scope,
    instructorCount: scope === "platform" ? 42 : 1,
    clients,
    analyses,
    homeworks,
    loginCountToday: scope === "platform" ? 18 : 3,
    timeline,
  });

  // デモではプラットフォーム規模感を少し厚く見せる
  if (scope === "platform") {
    return {
      ...base,
      overview: {
        ...base.overview,
        clientCount: 128,
        analysisCount: 946,
        averageSleepWellnessScore: 72.4,
      },
      today: {
        ...base.today,
        analysesCount: Math.max(base.today.analysesCount, 7),
        homeworkCompleted: Math.max(base.today.homeworkCompleted, 12),
        loginCount: 18,
      },
    };
  }

  return base;
}

export function formatExecutiveMetric(
  value: number | null | undefined,
  options?: { digits?: number; suffix?: string; sign?: boolean },
): string {
  if (value == null || !Number.isFinite(value)) return "—";
  const digits = options?.digits ?? 1;
  const formatted = value.toFixed(digits);
  const withSign =
    options?.sign && value > 0 ? `+${formatted}` : formatted;
  return `${withSign}${options?.suffix ?? ""}`;
}

export function formatTimelineClock(iso: string): string {
  return formatTimeTokyo(iso) || "—";
}
