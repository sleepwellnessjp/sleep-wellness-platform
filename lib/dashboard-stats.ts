import {
  analysisSleepScore,
  loadClientsSync,
  type StoredAnalysis,
  type StoredClient,
} from "@/lib/repositories/client-repository";

export type ScoreBucketKey = "80+" | "70-79" | "60-69" | "59-";

export type ScoreDistribution = Record<ScoreBucketKey, number>;

export type FollowUpClient = {
  clientId: string;
  name: string;
  latestAnalysisDate: string | null;
  sleepScore: number | null;
  reasons: string[];
};

export type RecentAnalysisItem = {
  clientId: string;
  analysisId: string;
  name: string;
  analysisDate: string;
  sleepScore: number | null;
  delta: number | null;
  trend: "improved" | "worsened" | "unchanged" | "none";
  summary: string;
  /** 保存日時（新しい順ソート用） */
  createdAt?: string;
};

export type ImprovementStats = {
  improvedCount: number;
  comparableCount: number;
  rate: number | null;
};

export type DashboardStats = {
  clientCount: number;
  analysesThisMonth: number;
  averageSleepScore: number | null;
  improvement: ImprovementStats;
  followUpCount: number;
  followUps: FollowUpClient[];
  recentAnalyses: RecentAnalysisItem[];
  distribution: ScoreDistribution;
  compareClientId: string | null;
};

function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function parsePercent(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes("%")) return parseNumber(trimmed);
  const n = parseNumber(trimmed);
  if (n == null) return null;
  if (n <= 1) return n * 100;
  return n;
}

function parseDurationMinutes(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const hourMinJa = trimmed.match(/(\d+)\s*時間\s*(\d+)\s*分/);
  if (hourMinJa) {
    return Number(hourMinJa[1]) * 60 + Number(hourMinJa[2]);
  }

  const hourOnlyJa = trimmed.match(/(\d+)\s*時間/);
  if (hourOnlyJa && !trimmed.includes("分")) {
    return Number(hourOnlyJa[1]) * 60;
  }

  const minOnlyJa = trimmed.match(/(\d+)\s*分/);
  if (minOnlyJa) return Number(minOnlyJa[1]);

  const hourMinEn = trimmed.match(/(\d+)\s*h\s*(\d+)\s*m/i);
  if (hourMinEn) {
    return Number(hourMinEn[1]) * 60 + Number(hourMinEn[2]);
  }

  const colon = trimmed.match(/^(\d+):(\d+)$/);
  if (colon) return Number(colon[1]) * 60 + Number(colon[2]);

  return parseNumber(trimmed);
}

function daysSince(dateValue: string): number | null {
  const day = dateValue.slice(0, 10);
  const parsed = new Date(`${day}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(
    parsed.getFullYear(),
    parsed.getMonth(),
    parsed.getDate(),
  );
  return Math.floor((today.getTime() - target.getTime()) / 86_400_000);
}

function isHighAwakenings(analysis: StoredAnalysis): boolean {
  const rate = parsePercent(analysis.metrics.awakeningRate || "");
  if (rate != null && rate >= 15) return true;

  const minutes = parseDurationMinutes(analysis.metrics.awakenings || "");
  if (minutes != null && minutes >= 45) return true;

  const countMatch = (analysis.metrics.awakenings || "").match(/(\d+)\s*回/);
  if (countMatch && Number(countMatch[1]) >= 4) return true;

  return false;
}

function isLowSpo2(analysis: StoredAnalysis): boolean {
  const spo2 = parsePercent(analysis.metrics.spo2 || "");
  return spo2 != null && spo2 < 94;
}

function scoreBucket(score: number): ScoreBucketKey {
  if (score >= 80) return "80+";
  if (score >= 70) return "70-79";
  if (score >= 60) return "60-69";
  return "59-";
}

function clampSummary(text: string, max = 72): string {
  const trimmed = text.trim();
  if (!trimmed) return "—";
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function collectFollowUpReasons(
  client: StoredClient,
  latest: StoredAnalysis,
  previous: StoredAnalysis | undefined,
): string[] {
  const reasons: string[] = [];
  const latestScore = analysisSleepScore(latest);

  if (latestScore != null && latestScore < 60) {
    reasons.push("最新睡眠スコアが60未満");
  }

  if (previous) {
    const prevScore = analysisSleepScore(previous);
    if (
      latestScore != null &&
      prevScore != null &&
      prevScore - latestScore >= 3
    ) {
      reasons.push(`前回より睡眠スコアが${prevScore - latestScore}点低下`);
    }
  }

  if (isLowSpo2(latest)) {
    reasons.push("平均SpO₂が94％未満");
  }

  if (isHighAwakenings(latest)) {
    reasons.push("中途覚醒が多い");
  }

  const elapsed = daysSince(latest.analysisDate);
  if (elapsed != null && elapsed >= 30) {
    reasons.push("分析から30日以上経過");
  }

  return reasons;
}

function buildImprovement(clients: StoredClient[]): ImprovementStats {
  let comparableCount = 0;
  let improvedCount = 0;

  for (const client of clients) {
    if (client.analyses.length < 2) continue;
    const latest = client.analyses[0];
    const first = client.analyses[client.analyses.length - 1];
    const latestScore = analysisSleepScore(latest);
    const firstScore = analysisSleepScore(first);
    if (latestScore == null || firstScore == null) continue;

    comparableCount += 1;
    if (latestScore - firstScore >= 3) {
      improvedCount += 1;
    }
  }

  return {
    improvedCount,
    comparableCount,
    rate:
      comparableCount > 0
        ? Math.round((improvedCount / comparableCount) * 100)
        : null,
  };
}

export function computeDashboardStatsFromClients(
  source: StoredClient[],
): DashboardStats {
  const clients = source.map((client) => ({
    ...client,
    analyses: [...client.analyses].sort((a, b) => {
      const byDate = b.analysisDate.localeCompare(a.analysisDate);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    }),
  }));

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  let analysesThisMonth = 0;
  const latestScores: number[] = [];
  const distribution: ScoreDistribution = {
    "80+": 0,
    "70-79": 0,
    "60-69": 0,
    "59-": 0,
  };

  const followUps: FollowUpClient[] = [];
  const recentCandidates: RecentAnalysisItem[] = [];

  for (const client of clients) {
    for (const analysis of client.analyses) {
      if (analysis.createdAt.startsWith(monthPrefix)) {
        analysesThisMonth += 1;
      }
    }

    const latest = client.analyses[0];
    if (!latest) continue;

    const latestScore = analysisSleepScore(latest);
    if (latestScore != null) {
      latestScores.push(latestScore);
      distribution[scoreBucket(latestScore)] += 1;
    }

    const previous = client.analyses[1];
    const reasons = collectFollowUpReasons(client, latest, previous);
    if (reasons.length > 0) {
      followUps.push({
        clientId: client.id,
        name: client.name,
        latestAnalysisDate: latest.analysisDate,
        sleepScore: latestScore,
        reasons,
      });
    }

    for (let index = 0; index < client.analyses.length; index += 1) {
      const analysis = client.analyses[index];
      const score = analysisSleepScore(analysis);
      const older = client.analyses[index + 1];
      const prevScore = older ? analysisSleepScore(older) : null;
      let delta: number | null = null;
      let trend: RecentAnalysisItem["trend"] = "none";
      if (score != null && prevScore != null) {
        delta = score - prevScore;
        if (delta > 0) trend = "improved";
        else if (delta < 0) trend = "worsened";
        else trend = "unchanged";
      }

      recentCandidates.push({
        clientId: client.id,
        analysisId: analysis.id,
        name: client.name,
        analysisDate: analysis.analysisDate,
        sleepScore: score,
        delta,
        trend,
        summary: clampSummary(analysis.result?.summary ?? ""),
        createdAt: analysis.createdAt,
      });
    }
  }

  followUps.sort((a, b) => {
    const scoreA = a.sleepScore ?? 999;
    const scoreB = b.sleepScore ?? 999;
    if (scoreA !== scoreB) return scoreA - scoreB;
    return (b.latestAnalysisDate ?? "").localeCompare(a.latestAnalysisDate ?? "");
  });

  recentCandidates.sort((a, b) =>
    (b.createdAt ?? b.analysisDate).localeCompare(a.createdAt ?? a.analysisDate),
  );

  const averageSleepScore =
    latestScores.length > 0
      ? Math.round(
          (latestScores.reduce((sum, n) => sum + n, 0) / latestScores.length) *
            10,
        ) / 10
      : null;

  const improvement = buildImprovement(clients);
  const compareClient =
    clients.find((client) => client.analyses.length >= 2) ?? null;

  return {
    clientCount: clients.length,
    analysesThisMonth,
    averageSleepScore,
    improvement,
    followUpCount: followUps.length,
    followUps,
    recentAnalyses: recentCandidates.slice(0, 5),
    distribution,
    compareClientId: compareClient?.id ?? null,
  };
}

/** localStorage キャッシュから同期計算（後方互換） */
export function computeDashboardStats(): DashboardStats {
  return computeDashboardStatsFromClients(loadClientsSync());
}
