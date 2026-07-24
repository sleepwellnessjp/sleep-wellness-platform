import {
  DEFAULT_PREDICTION_HORIZON_DAYS,
  PREDICTION_METRIC_LABELS,
} from "../constants";
import type {
  PredictiveAnalysis,
  PredictiveAnalysisContext,
  PredictiveAnalysisGenerator,
  PredictiveMetricForecast,
} from "../types";

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function buildForecasts(
  ctx: PredictiveAnalysisContext,
  horizonDays: number,
): PredictiveMetricForecast[] {
  const momentum =
    ctx.improvementRate != null
      ? clamp(ctx.improvementRate / 100, -0.05, 0.25)
      : 0.08;
  const streakBoost = clamp(ctx.streakDays / 30, 0, 0.12);
  const factor = (horizonDays / 14) * (momentum + streakBoost);

  const efficiency = ctx.sleepEfficiency ?? 82;
  const stress = ctx.stress ?? 45;
  const hrv = ctx.hrv ?? 42;
  const deep = ctx.deepSleepPercent ?? 18;
  const score = ctx.wellnessScore ?? 68;

  const mk = (
    key: PredictiveMetricForecast["key"],
    current: number,
    delta: number,
    unit: string,
  ): PredictiveMetricForecast => ({
    key,
    label: PREDICTION_METRIC_LABELS[key],
    current: round1(current),
    predicted: round1(current + delta),
    delta: round1(delta),
    unit,
  });

  return [
    mk("sleep_efficiency", efficiency, clamp(5 * factor * 1.2, 1.5, 8), "%"),
    mk("stress", stress, -clamp(8 * factor * 1.1, 2, 12), "pt"),
    mk("hrv", hrv, clamp(4 * factor, 1, 7), "ms"),
    mk("deep_sleep", deep, clamp(2.5 * factor, 0.8, 4), "%"),
    mk("wellness_score", score, clamp(6 * factor, 2, 10), "pt"),
  ];
}

/**
 * ルールベースの改善予測。
 * 将来: OpenAI で個人履歴を要約し、同じ PredictiveAnalysis を返す Generator に差し替え。
 */
export function generateRuleBasedPredictiveAnalysis(
  ctx: PredictiveAnalysisContext,
): PredictiveAnalysis {
  const horizonDays = ctx.horizonDays ?? DEFAULT_PREDICTION_HORIZON_DAYS;
  const predictions = buildForecasts(ctx, horizonDays);
  const confidence =
    ctx.streakDays >= 14 && ctx.improvementRate != null
      ? "high"
      : ctx.streakDays >= 7
        ? "medium"
        : "low";

  const efficiency = predictions.find((p) => p.key === "sleep_efficiency");
  const stressPred = predictions.find((p) => p.key === "stress");

  return {
    featureId: "predictive_analysis",
    clientId: ctx.clientId,
    clientName: ctx.clientName,
    horizonDays,
    predictions,
    confidence,
    narrative: `このまま継続すると、およそ${horizonDays}日後に睡眠効率が${efficiency ? `${efficiency.delta >= 0 ? "+" : ""}${efficiency.delta}${efficiency.unit}` : "改善"}、ストレスが${stressPred ? `${stressPred.delta}${stressPred.unit}` : "低下"}する見込みです。`,
    caveat:
      "予測は過去の傾向に基づく参考値です。医療診断ではありません。生活変化・体調により結果は異なります。",
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generatePredictiveAnalysis(
  ctx: PredictiveAnalysisContext,
  generator: PredictiveAnalysisGenerator = generateRuleBasedPredictiveAnalysis,
): Promise<PredictiveAnalysis> {
  return generator(ctx);
}
