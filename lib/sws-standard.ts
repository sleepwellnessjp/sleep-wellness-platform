import type { AnalysisMetrics } from "@/lib/soxai-metrics";

export type SwsMetricCode =
  | "SWS-001"
  | "SWS-002"
  | "SWS-003"
  | "SWS-004"
  | "SWS-005"
  | "SWS-006"
  | "SWS-007"
  | "SWS-008"
  | "SWS-009"
  | "SWS-010"
  | "SWS-011"
  | "SWS-012"
  | "SWS-013"
  | "SWS-014"
  | "SWS-015";

export type SwsMetricEntry = {
  code: SwsMetricCode;
  label: string;
  value: string;
  source: "soxai" | "manual";
};

export const SWS_DEFINITIONS: Record<
  SwsMetricCode,
  { label: string; metricKey: keyof AnalysisMetrics }
> = {
  "SWS-001": { label: "睡眠時間", metricKey: "sleepDuration" },
  "SWS-002": { label: "睡眠スコア", metricKey: "sleepScore" },
  "SWS-003": { label: "睡眠効率", metricKey: "sleepEfficiency" },
  "SWS-004": { label: "入眠潜時", metricKey: "sleepLatency" },
  "SWS-005": { label: "REM睡眠", metricKey: "remSleep" },
  "SWS-006": { label: "深睡眠", metricKey: "deepSleep" },
  "SWS-007": { label: "浅睡眠", metricKey: "lightSleep" },
  "SWS-008": { label: "覚醒", metricKey: "awakenings" },
  "SWS-009": { label: "安静時心拍数", metricKey: "restingHeartRate" },
  "SWS-010": { label: "HRV", metricKey: "hrv" },
  "SWS-011": { label: "呼吸数", metricKey: "respiratoryRate" },
  "SWS-012": { label: "血中酸素", metricKey: "spo2" },
  "SWS-013": { label: "皮膚温", metricKey: "skinTemperature" },
  "SWS-014": { label: "ストレス", metricKey: "stress" },
  "SWS-015": { label: "体内時計", metricKey: "circadianRhythm" },
};

export function toSwsMetrics(
  metrics: AnalysisMetrics,
  source: "soxai" | "manual",
): SwsMetricEntry[] {
  const entries: SwsMetricEntry[] = [];
  for (const [code, def] of Object.entries(SWS_DEFINITIONS) as Array<
    [SwsMetricCode, { label: string; metricKey: keyof AnalysisMetrics }]
  >) {
    const raw = metrics[def.metricKey];
    const value =
      def.metricKey === "sleepScore"
        ? typeof raw === "number" && Number.isFinite(raw)
          ? String(raw)
          : ""
        : String(raw ?? "").trim();
    entries.push({
      code,
      label: def.label,
      value,
      source,
    });
  }
  return entries;
}
