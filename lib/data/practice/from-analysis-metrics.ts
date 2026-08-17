import type { PracticeMetrics } from "@/lib/data/practice/types";
import {
  parseMetricMinutes,
  parseMetricPercent,
  parseMetricWithUnit,
} from "@/lib/sleep-analysis/parse-metric-value";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";

/** 分析メトリクスを処方判定用の数値へ正規化する。 */
export function toPracticeMetrics(metrics: AnalysisMetrics): PracticeMetrics {
  return {
    sleepLatencyMinutes: parseMetricMinutes(metrics.sleepLatency),
    sleepEfficiencyPercent: parseMetricPercent(metrics.sleepEfficiency),
    deepSleepRatioPercent: parseMetricPercent(metrics.deepSleepRate),
    remRatioPercent: parseMetricPercent(metrics.remSleepRate),
    wakeMinutes: parseMetricMinutes(metrics.awakenings),
    restingHrBpm: parseMetricWithUnit(metrics.restingHeartRate),
    hrvMs: parseMetricWithUnit(metrics.hrv),
    respiratoryRate: parseMetricWithUnit(metrics.respiratoryRate),
  };
}
