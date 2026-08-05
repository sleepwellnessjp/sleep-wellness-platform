/**
 * Sleep Wellness Insight エンジン（ルールベース）。
 *
 * SleepAnalysisData + SleepWellnessScore を入力に、
 * 複数指標の組み合わせから
 * - 原因
 * - 優先改善ポイント
 * - 改善提案
 * を返す。AI は使用しない。
 */

import type { SleepAnalysisData } from "@/lib/sleep-analysis/sleep-analysis-model";
import type {
  SleepWellnessScore,
  SleepWellnessScoreFactor,
} from "@/lib/sleep-analysis/sleep-wellness-score";
import { computeSleepWellnessScore } from "@/lib/sleep-analysis/sleep-wellness-score";
import type { SleepWellnessScoreFactorKey } from "@/lib/sleep-analysis/sleep-wellness-weights";
import {
  SLEEP_WELLNESS_INSIGHT_RULES,
  SLEEP_WELLNESS_INSIGHT_VERSION,
  type InsightConfidence,
  type InsightFactorSnapshot,
  type InsightRuleContext,
  type InsightSeverity,
  type InsightSuggestionCategory,
  type MatchedInsightRule,
} from "@/lib/sleep-analysis/sleep-wellness-insight-rules";

export type SleepWellnessCause = {
  id: string;
  title: string;
  description: string;
  evidenceKeys: SleepWellnessScoreFactorKey[];
  severity: InsightSeverity;
  confidence: InsightConfidence;
};

export type SleepWellnessPriority = {
  id: string;
  rank: number;
  title: string;
  reason: string;
  relatedCauseIds: string[];
  targetKeys: SleepWellnessScoreFactorKey[];
};

export type SleepWellnessSuggestion = {
  id: string;
  title: string;
  body: string;
  category: InsightSuggestionCategory;
  relatedPriorityIds: string[];
  relatedCauseIds: string[];
};

export type SleepWellnessInsight = {
  causes: SleepWellnessCause[];
  priorities: SleepWellnessPriority[];
  suggestions: SleepWellnessSuggestion[];
  /** ルールベースの短い総括（AI ではない） */
  summary: string;
  scoreTotal: number | null;
  matchedRuleIds: string[];
  meta: {
    version: string;
    ruleBased: true;
    coverageAvailable: number;
    coverageTotal: number;
  };
};

export type ComputeSleepWellnessInsightInput = {
  data: SleepAnalysisData;
  /** 省略時は内部で computeSleepWellnessScore を呼ぶ */
  score?: SleepWellnessScore | null;
};

function confidenceFromEvidence(
  evidenceKeys: SleepWellnessScoreFactorKey[],
  factors: Map<SleepWellnessScoreFactorKey, InsightFactorSnapshot>,
  coverageAvailable: number,
): InsightConfidence {
  const availableEvidence = evidenceKeys.filter(
    (k) => factors.get(k)?.available,
  ).length;
  if (availableEvidence >= 3 && coverageAvailable >= 6) return "high";
  if (availableEvidence >= 2 && coverageAvailable >= 4) return "medium";
  return "low";
}

function buildFactorMap(
  factors: SleepWellnessScoreFactor[],
): Map<SleepWellnessScoreFactorKey, InsightFactorSnapshot> {
  const map = new Map<SleepWellnessScoreFactorKey, InsightFactorSnapshot>();
  for (const f of factors) {
    map.set(f.key, {
      key: f.key,
      score: f.score,
      inputValue: f.inputValue,
      available: f.available && f.score != null,
    });
  }
  return map;
}

function buildContext(
  data: SleepAnalysisData,
  score: SleepWellnessScore,
): InsightRuleContext {
  return {
    factors: buildFactorMap(score.factors),
    totalSleepMinutes: data.totalSleepMinutes,
    sleepLatencyMinutes: data.sleepLatencyMinutes,
    awakeMinutes: data.awakeMinutes,
    spo2: data.spo2,
    scoreTotal: score.total,
  };
}

function severityRank(s: InsightSeverity): number {
  if (s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

function buildSummary(
  matched: MatchedInsightRule[],
  scoreTotal: number | null,
): string {
  if (matched.length === 0) {
    if (scoreTotal == null) {
      return "評価に必要な指標が不足しているため、複合的な原因推定は行えませんでした。";
    }
    if (scoreTotal >= 80) {
      return "主要指標の組み合わせに大きな悪化パターンは見当たりません。現状のリズムを維持しつつ、弱い項目があれば個別に観察してください。";
    }
    if (scoreTotal >= 60) {
      return "単一の強い複合悪化パターンは検出されませんでしたが、総合点には改善余地があります。弱い項目の組み合わせを継続観察してください。";
    }
    return "複数指標の明確な悪化パターンは特定できませんでしたが、総合点は低めです。データ欠損の有無を確認しつつ、睡眠時間と効率から整えるのが安全です。";
  }

  const top = [...matched].sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      b.priorityWeight - a.priorityWeight,
  )[0];
  const extra =
    matched.length > 1
      ? `ほか ${matched.length - 1} 件の複合パターンも検出されています。`
      : "";
  return `複数指標の組み合わせから「${top.causeTitle}」が主な要因候補です。${extra}`.trim();
}

function isInsightInput(
  input: ComputeSleepWellnessInsightInput | SleepAnalysisData,
): input is ComputeSleepWellnessInsightInput {
  return (
    typeof input === "object" &&
    input != null &&
    "data" in input &&
    (input as ComputeSleepWellnessInsightInput).data != null &&
    typeof (input as ComputeSleepWellnessInsightInput).data.device === "string"
  );
}

/**
 * ルールベースで Sleep Wellness Insight を生成する。
 */
export function computeSleepWellnessInsight(
  input: ComputeSleepWellnessInsightInput | SleepAnalysisData,
): SleepWellnessInsight {
  const data = isInsightInput(input) ? input.data : input;
  const score =
    isInsightInput(input) && input.score
      ? input.score
      : computeSleepWellnessScore(data);

  const ctx = buildContext(data, score);
  const matched: MatchedInsightRule[] = [];

  for (const rule of SLEEP_WELLNESS_INSIGHT_RULES) {
    const result = rule.match(ctx);
    if (result) matched.push(result);
  }

  matched.sort(
    (a, b) =>
      severityRank(b.severity) - severityRank(a.severity) ||
      b.priorityWeight - a.priorityWeight,
  );

  const causes: SleepWellnessCause[] = matched.map((m) => ({
    id: m.id,
    title: m.causeTitle,
    description: m.causeDescription,
    evidenceKeys: m.evidenceKeys,
    severity: m.severity,
    confidence: confidenceFromEvidence(
      m.evidenceKeys,
      ctx.factors,
      score.coverage.available,
    ),
  }));

  // 優先改善: ルール順に rank を付与。同一 target の重複は統合
  const priorities: SleepWellnessPriority[] = [];
  const seenPriorityKeys = new Set<string>();
  for (const m of matched) {
    const dedupeKey = [...m.targetKeys].sort().join("+");
    if (seenPriorityKeys.has(dedupeKey)) {
      const existing = priorities.find(
        (p) => [...p.targetKeys].sort().join("+") === dedupeKey,
      );
      if (existing && !existing.relatedCauseIds.includes(m.id)) {
        existing.relatedCauseIds.push(m.id);
      }
      continue;
    }
    seenPriorityKeys.add(dedupeKey);
    priorities.push({
      id: `priority_${m.id}`,
      rank: priorities.length + 1,
      title: m.priorityTitle,
      reason: m.priorityReason,
      relatedCauseIds: [m.id],
      targetKeys: m.targetKeys,
    });
  }

  // 提案: カテゴリ＋タイトルで軽い重複排除
  const suggestions: SleepWellnessSuggestion[] = [];
  const seenSuggestion = new Set<string>();
  for (const m of matched) {
    const key = `${m.suggestionCategory}:${m.suggestionTitle}`;
    if (seenSuggestion.has(key)) {
      const existing = suggestions.find(
        (s) => `${s.category}:${s.title}` === key,
      );
      if (existing) {
        if (!existing.relatedCauseIds.includes(m.id)) {
          existing.relatedCauseIds.push(m.id);
        }
        const pid = `priority_${m.id}`;
        if (!existing.relatedPriorityIds.includes(pid)) {
          // priority が統合されている場合もあるので、存在する priority id を探す
          const linked = priorities.find((p) =>
            p.relatedCauseIds.includes(m.id),
          );
          if (linked && !existing.relatedPriorityIds.includes(linked.id)) {
            existing.relatedPriorityIds.push(linked.id);
          }
        }
      }
      continue;
    }
    seenSuggestion.add(key);
    const linked = priorities.find((p) => p.relatedCauseIds.includes(m.id));
    suggestions.push({
      id: `suggest_${m.id}`,
      title: m.suggestionTitle,
      body: m.suggestionBody,
      category: m.suggestionCategory,
      relatedPriorityIds: linked ? [linked.id] : [],
      relatedCauseIds: [m.id],
    });
  }

  return {
    causes,
    priorities,
    suggestions,
    summary: buildSummary(matched, score.total),
    scoreTotal: score.total,
    matchedRuleIds: matched.map((m) => m.id),
    meta: {
      version: SLEEP_WELLNESS_INSIGHT_VERSION,
      ruleBased: true,
      coverageAvailable: score.coverage.available,
      coverageTotal: score.coverage.total,
    },
  };
}
