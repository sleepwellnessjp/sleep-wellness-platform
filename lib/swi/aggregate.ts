/**
 * SWI 匿名集計エンジン（ルールベース）。
 *
 * 将来 AI 分析へ差し替える箇所:
 * - classifyJourneyPattern → GPT による Journey パターン分類
 * - buildInterventionRanking の改善判定 → AI 因果推定
 * - homework improvementRate → 介入効果のモデル推定
 */

import {
  SWI_AGE_BAND_LABELS,
  SWI_AGE_BAND_ORDER,
  SWI_GENDER_LABELS,
  SWI_INTERVENTIONS,
  SWI_JOURNEY_PATTERN_META,
  ageBandFromYears,
  matchInterventionId,
  normalizeGender,
} from "./aggregate-helpers";
import type {
  SwiAgeBand,
  SwiAgeBandStat,
  SwiGenderBucket,
  SwiGenderStat,
  SwiHomeworkStat,
  SwiInsightsOverview,
  SwiInterventionRank,
  SwiJourneyPattern,
  SwiJourneyPatternId,
  SwiOverallStats,
  SwiRetentionWindow,
  SwiScope,
} from "./types";

export type SwiClientRow = {
  id: string;
  gender: string | null;
  age: number | null;
  birthDate: string | null;
  registeredAt: string | null;
  createdAt: string;
};

export type SwiAnalysisRow = {
  id: string;
  clientId: string;
  sleepScore: number | null;
  sleepDuration: number | null;
  sleepEfficiency: number | null;
  hrv: number | null;
  stress: number | null;
  analyzedAt: string;
  createdAt: string;
};

export type SwiHomeworkRow = {
  clientId: string;
  title: string;
  isCompleted: boolean;
  dueDate: string;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return round1(nums.reduce((sum, n) => sum + n, 0) / nums.length);
}

function rate(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(`${fromIso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(from.getTime())) return 0;
  const today = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  return Math.max(
    0,
    Math.floor((today.getTime() - start.getTime()) / 86_400_000),
  );
}

function ageYearsOf(client: SwiClientRow, now = new Date()): number | null {
  if (typeof client.age === "number" && Number.isFinite(client.age)) {
    return client.age;
  }
  if (!client.birthDate) return null;
  const birth = new Date(`${client.birthDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 && age <= 130 ? age : null;
}

function sleepDurationHours(duration: number | null): number | null {
  if (duration == null || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  // DB は時間または分の混在があり得る。24超は分とみなす。
  if (duration > 24) return round1(duration / 60);
  return round1(duration);
}

function scoresByClient(
  analyses: SwiAnalysisRow[],
): Map<string, number[]> {
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

function improvementOf(scores: number[]): {
  improved: boolean;
  delta: number;
} | null {
  if (scores.length < 2) return null;
  const delta = scores[scores.length - 1]! - scores[0]!;
  return { improved: delta >= 3, delta: round1(delta) };
}

export function buildOverallStats(
  clients: SwiClientRow[],
  analyses: SwiAnalysisRow[],
): SwiOverallStats {
  const scores: number[] = [];
  const durations: number[] = [];
  const efficiencies: number[] = [];
  const hrvs: number[] = [];
  const stresses: number[] = [];

  for (const row of analyses) {
    if (typeof row.sleepScore === "number") scores.push(row.sleepScore);
    const hours = sleepDurationHours(row.sleepDuration);
    if (hours != null) durations.push(hours);
    if (
      typeof row.sleepEfficiency === "number" &&
      Number.isFinite(row.sleepEfficiency)
    ) {
      efficiencies.push(row.sleepEfficiency);
    }
    if (typeof row.hrv === "number" && Number.isFinite(row.hrv) && row.hrv > 0) {
      hrvs.push(row.hrv);
    }
    if (
      typeof row.stress === "number" &&
      Number.isFinite(row.stress) &&
      row.stress >= 0
    ) {
      stresses.push(row.stress);
    }
  }

  return {
    clientCount: clients.length,
    analysisCount: analyses.length,
    averageSleepWellnessScore: avg(scores),
    averageSleepDurationHours: avg(durations),
    averageSleepEfficiency: avg(efficiencies),
    averageHrv: avg(hrvs),
    averageStress: avg(stresses),
  };
}

export function buildInterventionRanking(
  analyses: SwiAnalysisRow[],
  homeworks: SwiHomeworkRow[],
): SwiInterventionRank[] {
  const byClientScores = scoresByClient(analyses);
  const clientsByIntervention = new Map<string, Set<string>>();

  for (const hw of homeworks) {
    const id = matchInterventionId(hw.title);
    if (!id) continue;
    const set = clientsByIntervention.get(id) ?? new Set<string>();
    set.add(hw.clientId);
    clientsByIntervention.set(id, set);
  }

  return SWI_INTERVENTIONS.map((def) => {
    const clientIds = clientsByIntervention.get(def.id) ?? new Set();
    let comparable = 0;
    let improved = 0;
    const deltas: number[] = [];
    for (const clientId of clientIds) {
      const scores = byClientScores.get(clientId);
      if (!scores) continue;
      const result = improvementOf(scores);
      if (!result) continue;
      comparable += 1;
      deltas.push(result.delta);
      if (result.improved) improved += 1;
    }
    return {
      id: def.id,
      label: def.label,
      sampleSize: clientIds.size,
      improvementRate: rate(improved, comparable),
      averageScoreDelta: avg(deltas),
    };
  }).sort((a, b) => {
    const ar = a.improvementRate ?? -1;
    const br = b.improvementRate ?? -1;
    if (br !== ar) return br - ar;
    return b.sampleSize - a.sampleSize;
  });
}

export function buildAgeBandStats(
  clients: SwiClientRow[],
  analyses: SwiAnalysisRow[],
): SwiAgeBandStat[] {
  const byClientScores = scoresByClient(analyses);
  const buckets = new Map<
    SwiAgeBand,
    { clients: number; scores: number[]; improved: number; comparable: number }
  >();

  for (const band of [...SWI_AGE_BAND_ORDER, "unknown" as const]) {
    buckets.set(band, { clients: 0, scores: [], improved: 0, comparable: 0 });
  }

  for (const client of clients) {
    const band = ageBandFromYears(ageYearsOf(client));
    const bucket = buckets.get(band)!;
    bucket.clients += 1;
    const scores = byClientScores.get(client.id);
    if (scores && scores.length > 0) {
      bucket.scores.push(scores[scores.length - 1]!);
    }
    const result = scores ? improvementOf(scores) : null;
    if (result) {
      bucket.comparable += 1;
      if (result.improved) bucket.improved += 1;
    }
  }

  return SWI_AGE_BAND_ORDER.map((band) => {
    const bucket = buckets.get(band)!;
    return {
      band,
      label: SWI_AGE_BAND_LABELS[band],
      clientCount: bucket.clients,
      averageScore: avg(bucket.scores),
      improvementRate: rate(bucket.improved, bucket.comparable),
    };
  });
}

export function buildGenderComparison(
  clients: SwiClientRow[],
  analyses: SwiAnalysisRow[],
): SwiGenderStat[] {
  const byClientScores = scoresByClient(analyses);
  const analysesByClient = new Map<string, SwiAnalysisRow[]>();
  for (const row of analyses) {
    const list = analysesByClient.get(row.clientId) ?? [];
    list.push(row);
    analysesByClient.set(row.clientId, list);
  }

  const order: SwiGenderBucket[] = ["female", "male", "other", "unknown"];
  const buckets = new Map<
    SwiGenderBucket,
    {
      clients: number;
      analyses: number;
      scores: number[];
      efficiencies: number[];
      improved: number;
      comparable: number;
    }
  >();
  for (const g of order) {
    buckets.set(g, {
      clients: 0,
      analyses: 0,
      scores: [],
      efficiencies: [],
      improved: 0,
      comparable: 0,
    });
  }

  for (const client of clients) {
    const gender = normalizeGender(client.gender);
    const bucket = buckets.get(gender)!;
    bucket.clients += 1;
    const rows = analysesByClient.get(client.id) ?? [];
    bucket.analyses += rows.length;
    for (const row of rows) {
      if (typeof row.sleepScore === "number") bucket.scores.push(row.sleepScore);
      if (typeof row.sleepEfficiency === "number") {
        bucket.efficiencies.push(row.sleepEfficiency);
      }
    }
    const scores = byClientScores.get(client.id);
    const result = scores ? improvementOf(scores) : null;
    if (result) {
      bucket.comparable += 1;
      if (result.improved) bucket.improved += 1;
    }
  }

  return order
    .filter((g) => g !== "unknown" || (buckets.get(g)?.clients ?? 0) > 0)
    .map((gender) => {
      const bucket = buckets.get(gender)!;
      return {
        gender,
        label: SWI_GENDER_LABELS[gender],
        clientCount: bucket.clients,
        analysisCount: bucket.analyses,
        averageScore: avg(bucket.scores),
        averageSleepEfficiency: avg(bucket.efficiencies),
        improvementRate: rate(bucket.improved, bucket.comparable),
      };
    });
}

export function buildRetentionWindows(
  clients: SwiClientRow[],
  analyses: SwiAnalysisRow[],
): SwiRetentionWindow[] {
  const latestByClient = new Map<string, string>();
  for (const row of analyses) {
    const at = row.analyzedAt || row.createdAt;
    const prev = latestByClient.get(row.clientId);
    if (!prev || at > prev) latestByClient.set(row.clientId, at);
  }

  return ([30, 60, 90] as const).map((days) => {
    let eligible = 0;
    let retained = 0;
    for (const client of clients) {
      const start = client.registeredAt ?? client.createdAt;
      if (daysBetween(start) < days) continue;
      eligible += 1;
      const latest = latestByClient.get(client.id);
      if (latest && daysBetween(latest) <= days) retained += 1;
    }
    return {
      days,
      label: `${days}日継続率`,
      eligibleCount: eligible,
      retainedCount: retained,
      rate: rate(retained, eligible),
    };
  });
}

export function buildHomeworkAchievement(
  homeworks: SwiHomeworkRow[],
  analyses: SwiAnalysisRow[],
): SwiHomeworkStat[] {
  const byClientScores = scoresByClient(analyses);
  const today = new Date().toISOString().slice(0, 10);
  const groups = new Map<
    string,
    {
      title: string;
      assigned: number;
      completed: number;
      clientIds: Set<string>;
    }
  >();

  for (const hw of homeworks) {
    // 達成率の分母は期限到来分のみ（client_homeworks 仕様に合わせる）
    if (hw.dueDate > today) continue;
    const key = hw.title.trim() || "（無題）";
    const group = groups.get(key) ?? {
      title: key,
      assigned: 0,
      completed: 0,
      clientIds: new Set<string>(),
    };
    group.assigned += 1;
    if (hw.isCompleted) group.completed += 1;
    group.clientIds.add(hw.clientId);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => {
      let comparable = 0;
      let improved = 0;
      for (const clientId of group.clientIds) {
        const scores = byClientScores.get(clientId);
        const result = scores ? improvementOf(scores) : null;
        if (!result) continue;
        comparable += 1;
        if (result.improved) improved += 1;
      }
      return {
        title: group.title,
        assignedCount: group.assigned,
        completedCount: group.completed,
        completionRate: rate(group.completed, group.assigned),
        improvementRate: rate(improved, comparable),
      };
    })
    .sort((a, b) => {
      const ac = a.completionRate ?? -1;
      const bc = b.completionRate ?? -1;
      if (bc !== ac) return bc - ac;
      return b.assignedCount - a.assignedCount;
    })
    .slice(0, 12);
}

/**
 * Journey 改善パターン分類（ルールベース）。
 * AI 差し替えポイント: スコア系列・宿題・推薦テキストを GPT に渡し pattern id を返す。
 */
export function classifyJourneyPattern(
  scores: number[],
): SwiJourneyPatternId {
  if (scores.length < 2) return "insufficient_data";

  const first = scores[0]!;
  const last = scores[scores.length - 1]!;
  const mid = scores[Math.floor(scores.length / 2)]!;
  const delta = last - first;
  const max = Math.max(...scores);
  const min = Math.min(...scores);
  const range = max - min;
  const mean = scores.reduce((sum, n) => sum + n, 0) / scores.length;

  if (mean >= 75 && Math.abs(delta) < 5 && range < 10) {
    return "stable_high";
  }
  if (delta <= -3 || (last < 60 && delta < 0)) {
    return "needs_attention";
  }
  if (range >= 15 && scores.length >= 3) {
    const dipped = mid < first - 3 && last > mid + 3;
    if (dipped) return "recovery_after_dip";
    return "volatile";
  }
  if (delta >= 5) {
    const early = scores.slice(0, Math.max(2, Math.ceil(scores.length / 2)));
    const late = scores.slice(Math.floor(scores.length / 2));
    const earlyGain = early[early.length - 1]! - early[0]!;
    const lateDelta =
      late.length >= 2 ? late[late.length - 1]! - late[0]! : 0;
    if (earlyGain >= 4 && Math.abs(lateDelta) <= 2) {
      return "early_gain_plateau";
    }
    return "steady_climb";
  }
  if (Math.abs(delta) < 3 && mean >= 70) return "stable_high";
  if (range >= 10) return "volatile";
  return "insufficient_data";
}

export function buildJourneyPatterns(
  analyses: SwiAnalysisRow[],
): SwiJourneyPattern[] {
  const byClientScores = scoresByClient(analyses);
  const counts = new Map<SwiJourneyPatternId, number>();
  for (const id of Object.keys(SWI_JOURNEY_PATTERN_META) as SwiJourneyPatternId[]) {
    counts.set(id, 0);
  }

  let classified = 0;
  for (const scores of byClientScores.values()) {
    const id = classifyJourneyPattern(scores);
    counts.set(id, (counts.get(id) ?? 0) + 1);
    classified += 1;
  }

  return (Object.keys(SWI_JOURNEY_PATTERN_META) as SwiJourneyPatternId[])
    .map((id) => {
      const meta = SWI_JOURNEY_PATTERN_META[id];
      const clientCount = counts.get(id) ?? 0;
      return {
        id,
        label: meta.label,
        description: meta.description,
        clientCount,
        sharePercent: rate(clientCount, classified),
      };
    })
    .filter((item) => item.clientCount > 0 || item.id === "insufficient_data")
    .sort((a, b) => b.clientCount - a.clientCount);
}

export function buildSwiInsightsOverview(input: {
  scope: SwiScope;
  clients: SwiClientRow[];
  analyses: SwiAnalysisRow[];
  homeworks: SwiHomeworkRow[];
  generatedAt?: string;
}): SwiInsightsOverview {
  return {
    scope: input.scope,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    source: "rules",
    overall: buildOverallStats(input.clients, input.analyses),
    interventionRanking: buildInterventionRanking(
      input.analyses,
      input.homeworks,
    ),
    ageBands: buildAgeBandStats(input.clients, input.analyses),
    genderComparison: buildGenderComparison(input.clients, input.analyses),
    retention: buildRetentionWindows(input.clients, input.analyses),
    homeworkAchievement: buildHomeworkAchievement(
      input.homeworks,
      input.analyses,
    ),
    journeyPatterns: buildJourneyPatterns(input.analyses),
  };
}
