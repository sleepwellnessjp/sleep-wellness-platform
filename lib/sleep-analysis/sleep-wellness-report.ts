/**
 * Sleep Wellness Report Builder。
 *
 * Score / Insight / Priority の3エンジンを統合し、
 * 画面非依存のレポートオブジェクトを返す。
 * 既存エンジン本体は変更しない。
 */

import type {
  SleepAnalysisData,
  SleepAnalysisDevice,
} from "@/lib/sleep-analysis/sleep-analysis-model";
import { computeSleepWellnessInsight } from "@/lib/sleep-analysis/sleep-wellness-insight";
import type {
  SleepWellnessCause,
  SleepWellnessInsight,
  SleepWellnessSuggestion,
} from "@/lib/sleep-analysis/sleep-wellness-insight";
import type { InsightSeverity } from "@/lib/sleep-analysis/sleep-wellness-insight-rules";
import { computeSleepWellnessPriority } from "@/lib/sleep-analysis/sleep-wellness-priority";
import type {
  SleepWellnessPriorityItem,
  SleepWellnessPriorityPlan,
} from "@/lib/sleep-analysis/sleep-wellness-priority";
import { computeSleepWellnessScore } from "@/lib/sleep-analysis/sleep-wellness-score";
import type {
  SleepWellnessGrade,
  SleepWellnessScore,
  SleepWellnessScoreFactor,
} from "@/lib/sleep-analysis/sleep-wellness-score";
import { SLEEP_WELLNESS_FACTOR_LABELS } from "@/lib/sleep-analysis/sleep-wellness-weights";

export const SLEEP_WELLNESS_REPORT_VERSION = "1.0.0";

/** 1. 総合評価 */
export type SleepWellnessReportOverall = {
  totalScore: number | null;
  grade: SleepWellnessGrade | null;
  headline: string;
  summary: string;
  coverageLabel: string;
  device: SleepAnalysisDevice;
};

/** 2. 優先改善項目（順位順・最大3） */
export type SleepWellnessReportPriorityItem = {
  rank: 1 | 2 | 3;
  rankLabel: string;
  key: SleepWellnessPriorityItem["key"];
  label: string;
  reason: string;
  metricScore: number | null;
};

/** 3. 分析内容 */
export type SleepWellnessReportAnalysis = {
  overview: string;
  causes: Array<{
    title: string;
    description: string;
    severity: InsightSeverity;
    evidenceLabels: string[];
  }>;
  factorHighlights: Array<{
    label: string;
    score: number;
    status: "strong" | "fair" | "weak";
  }>;
  matchedRuleCount: number;
};

/** 4. 今日の改善アクション（優先順） */
export type SleepWellnessReportAction = {
  order: number;
  title: string;
  body: string;
  relatedPriorityLabel: string | null;
  category: SleepWellnessSuggestion["category"] | "priority";
};

/** 5. インストラクター向けメモ */
export type SleepWellnessReportInstructorMemo = {
  bullets: string[];
  caution: string | null;
  dataGaps: string[];
  focusKeys: string[];
};

export type SleepWellnessReport = {
  overallEvaluation: SleepWellnessReportOverall;
  priorityImprovements: SleepWellnessReportPriorityItem[];
  analysis: SleepWellnessReportAnalysis;
  todaysActions: SleepWellnessReportAction[];
  instructorMemo: SleepWellnessReportInstructorMemo;
  /** 下流デバッグ用の生エンジン結果 */
  sources: {
    score: SleepWellnessScore;
    insight: SleepWellnessInsight;
    priority: SleepWellnessPriorityPlan;
  };
  meta: {
    version: string;
    ruleBased: true;
    generatedAt: string;
  };
};

export type BuildSleepWellnessReportInput = {
  data: SleepAnalysisData;
  score?: SleepWellnessScore | null;
  insight?: SleepWellnessInsight | null;
  priority?: SleepWellnessPriorityPlan | null;
  /** ISO 文字列。省略時は now */
  generatedAt?: string;
};

function isWrapped(
  input: BuildSleepWellnessReportInput | SleepAnalysisData,
): input is BuildSleepWellnessReportInput {
  return (
    typeof input === "object" &&
    input != null &&
    "data" in input &&
    (input as BuildSleepWellnessReportInput).data != null &&
    typeof (input as BuildSleepWellnessReportInput).data.device === "string"
  );
}

function coverageLabel(available: number, total: number): string {
  if (total <= 0) return "指標なし";
  const pct = Math.round((available / total) * 100);
  if (pct >= 80) return `指標充足度 高（${available}/${total}）`;
  if (pct >= 50) return `指標充足度 中（${available}/${total}）`;
  return `指標充足度 低（${available}/${total}）`;
}

function overallHeadline(
  total: number | null,
  grade: SleepWellnessGrade | null,
): string {
  if (total == null || grade == null) {
    return "総合評価を算出するための指標が不足しています";
  }
  if (grade === "A") return `良好な睡眠コンディション（${total}点 / ${grade}）`;
  if (grade === "B") return `おおむね安定、改善余地あり（${total}点 / ${grade}）`;
  if (grade === "C") return `改善を優先したい状態（${total}点 / ${grade}）`;
  if (grade === "D") return `複数指標に負荷が見られる状態（${total}点 / ${grade}）`;
  return `回復を最優先すべき状態（${total}点 / ${grade}）`;
}

function factorStatus(score: number): "strong" | "fair" | "weak" {
  if (score >= 75) return "strong";
  if (score >= 60) return "fair";
  return "weak";
}

function evidenceLabels(cause: SleepWellnessCause): string[] {
  return cause.evidenceKeys.map(
    (k) => SLEEP_WELLNESS_FACTOR_LABELS[k] ?? k,
  );
}

function buildOverall(
  data: SleepAnalysisData,
  score: SleepWellnessScore,
  insight: SleepWellnessInsight,
): SleepWellnessReportOverall {
  return {
    totalScore: score.total,
    grade: score.grade,
    headline: overallHeadline(score.total, score.grade),
    summary: insight.summary,
    coverageLabel: coverageLabel(
      score.coverage.available,
      score.coverage.total,
    ),
    device: data.device,
  };
}

function buildPrioritySection(
  priority: SleepWellnessPriorityPlan,
): SleepWellnessReportPriorityItem[] {
  return priority.items.map((item) => ({
    rank: item.rank,
    rankLabel: item.rankLabel,
    key: item.key,
    label: item.label,
    reason: item.reason,
    metricScore: item.metricScore,
  }));
}

function buildAnalysis(
  score: SleepWellnessScore,
  insight: SleepWellnessInsight,
): SleepWellnessReportAnalysis {
  const highlights = score.factors
    .filter(
      (f): f is SleepWellnessScoreFactor & { score: number } =>
        f.available && f.score != null,
    )
    .map((f) => ({
      label: f.label,
      score: f.score,
      status: factorStatus(f.score),
    }))
    .sort((a, b) => a.score - b.score);

  return {
    overview: insight.summary,
    causes: insight.causes.map((c) => ({
      title: c.title,
      description: c.description,
      severity: c.severity,
      evidenceLabels: evidenceLabels(c),
    })),
    factorHighlights: highlights,
    matchedRuleCount: insight.matchedRuleIds.length,
  };
}

function buildTodaysActions(
  priority: SleepWellnessPriorityPlan,
  insight: SleepWellnessInsight,
): SleepWellnessReportAction[] {
  const actions: SleepWellnessReportAction[] = [];
  const seen = new Set<string>();

  // 優先順位順に、対応する Insight 提案を紐づけ
  for (const item of priority.items) {
    const relatedSuggestions = insight.suggestions.filter((s) =>
      s.relatedCauseIds.some((id) =>
        item.relatedInsightCauseIds.includes(id),
      ),
    );

    if (relatedSuggestions.length > 0) {
      for (const s of relatedSuggestions) {
        const dedupe = `${s.category}:${s.title}`;
        if (seen.has(dedupe)) continue;
        seen.add(dedupe);
        actions.push({
          order: actions.length + 1,
          title: s.title,
          body: s.body,
          relatedPriorityLabel: `${item.rankLabel} ${item.label}`,
          category: s.category,
        });
        break; // 優先項目あたり1アクション
      }
    } else {
      const dedupe = `priority:${item.key}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      actions.push({
        order: actions.length + 1,
        title: `今日は「${item.label}」を意識する`,
        body: item.reason,
        relatedPriorityLabel: `${item.rankLabel} ${item.label}`,
        category: "priority",
      });
    }

    if (actions.length >= 3) break;
  }

  // 優先が空のとき、Insight 提案だけで埋める
  if (actions.length === 0) {
    for (const s of insight.suggestions.slice(0, 3)) {
      actions.push({
        order: actions.length + 1,
        title: s.title,
        body: s.body,
        relatedPriorityLabel: null,
        category: s.category,
      });
    }
  }

  if (actions.length === 0) {
    actions.push({
      order: 1,
      title: "計測の継続とリズムの維持",
      body: "大きな悪化パターンは検出されていません。就寝・起床時刻を一定に保ち、明日以降の比較ができるよう計測を継続してください。",
      relatedPriorityLabel: null,
      category: "monitor",
    });
  }

  return actions;
}

function buildInstructorMemo(
  data: SleepAnalysisData,
  score: SleepWellnessScore,
  insight: SleepWellnessInsight,
  priority: SleepWellnessPriorityPlan,
): SleepWellnessReportInstructorMemo {
  const bullets: string[] = [];
  const dataGaps: string[] = score.meta.missingKeys.map(
    (k) => SLEEP_WELLNESS_FACTOR_LABELS[k] ?? k,
  );

  if (score.total != null && score.grade != null) {
    bullets.push(
      `Sleep Wellness Score は ${score.total} 点（${score.grade}）。カバレッジ ${score.coverage.available}/${score.coverage.total}。`,
    );
  } else {
    bullets.push(
      "総合点を算出できる指標が不足しています。追加画像または手動入力を検討してください。",
    );
  }

  if (priority.items.length > 0) {
    const focus = priority.items
      .map((i) => `${i.rankLabel}${i.label}`)
      .join(" → ");
    bullets.push(`セッションで触る順番の提案: ${focus}。`);
  } else {
    bullets.push("明確な優先改善項目は検出されていません。維持・観察が中心です。");
  }

  const highCauses = insight.causes.filter((c) => c.severity === "high");
  if (highCauses.length > 0) {
    bullets.push(
      `高severityの複合要因: ${highCauses.map((c) => c.title).join(" / ")}。`,
    );
  } else if (insight.causes.length > 0) {
    bullets.push(
      `検出された複合要因は ${insight.causes.length} 件（いずれも medium/low）。`,
    );
  } else {
    bullets.push("複合ルールによる原因推定ヒットはありません。");
  }

  if (data.warningMessages.length > 0) {
    bullets.push(
      `データ側ワーニング: ${data.warningMessages.slice(0, 3).join("；")}`,
    );
  }

  if (data.confidence != null) {
    bullets.push(`入力データの信頼度目安: ${data.confidence}%。`);
  }

  let caution: string | null = null;
  if (score.coverage.available < 4) {
    caution =
      "利用可能指標が少ないため、解釈は仮説止まりです。断定表現を避け、追加計測を促してください。";
  } else if (
    highCauses.length > 0 &&
    (data.spo2 != null && data.spo2 < 95)
  ) {
    caution =
      "呼吸・SpO2 関連の弱さが見られます。医療診断は行わず、必要に応じて専門家受診の相談を検討してください。";
  } else if (score.total != null && score.total < 40) {
    caution =
      "総合点が低い日です。負荷の高い介入より、睡眠機会の確保と回復を優先する案内が安全です。";
  }

  return {
    bullets,
    caution,
    dataGaps,
    focusKeys: priority.items.map((i) => i.key),
  };
}

/**
 * Score / Insight / Priority を統合した Sleep Wellness Report を構築する。
 */
export function buildSleepWellnessReport(
  input: BuildSleepWellnessReportInput | SleepAnalysisData,
): SleepWellnessReport {
  const data = isWrapped(input) ? input.data : input;
  const score =
    isWrapped(input) && input.score
      ? input.score
      : computeSleepWellnessScore(data);
  const insight =
    isWrapped(input) && input.insight
      ? input.insight
      : computeSleepWellnessInsight({ data, score });
  const priority =
    isWrapped(input) && input.priority
      ? input.priority
      : computeSleepWellnessPriority({ data, score, insight });

  const generatedAt =
    (isWrapped(input) && input.generatedAt) || new Date().toISOString();

  return {
    overallEvaluation: buildOverall(data, score, insight),
    priorityImprovements: buildPrioritySection(priority),
    analysis: buildAnalysis(score, insight),
    todaysActions: buildTodaysActions(priority, insight),
    instructorMemo: buildInstructorMemo(data, score, insight, priority),
    sources: { score, insight, priority },
    meta: {
      version: SLEEP_WELLNESS_REPORT_VERSION,
      ruleBased: true,
      generatedAt,
    },
  };
}
