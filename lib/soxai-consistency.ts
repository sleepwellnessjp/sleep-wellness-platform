import {
  parseDurationMinutes,
  parseHHMM,
  parsePercent,
} from "@/lib/soxai-graphs";
import {
  isMetricPresent,
  SOXAI_METRIC_FIELDS,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";

export type MetricConsistencyWarning = {
  /** 関連するメトリクスキー */
  keys: MetricFieldKey[];
  /** 確認画面に出す警告文 */
  message: string;
  /** 重大度 */
  severity: "warning" | "info";
};

const labelOf = (key: MetricFieldKey): string =>
  SOXAI_METRIC_FIELDS.find((f) => f.key === key)?.label ?? key;

/**
 * 合計時間・割合の矛盾を検出する（値の自動修正はしない）
 */
export function detectMetricConsistencyWarnings(
  metrics: AnalysisMetrics,
): MetricConsistencyWarning[] {
  const warnings: MetricConsistencyWarning[] = [];

  const sleepMin = parseDurationMinutes(metrics.sleepDuration);
  const remMin = parseDurationMinutes(metrics.remSleep);
  const lightMin = parseDurationMinutes(metrics.lightSleep);
  const deepMin = parseDurationMinutes(metrics.deepSleep);
  const awakeMin = parseDurationMinutes(metrics.awakenings);

  const stageMins = [remMin, lightMin, deepMin, awakeMin].filter(
    (n): n is number => n != null,
  );
  if (stageMins.length >= 3) {
    const stageSum =
      (remMin ?? 0) + (lightMin ?? 0) + (deepMin ?? 0) + (awakeMin ?? 0);
    if (sleepMin != null && sleepMin > 0) {
      const diff = Math.abs(stageSum - sleepMin);
      // 睡眠時間とステージ合計が大きくずれる（15分超、かつ相対10%超）
      if (diff > 15 && diff / sleepMin > 0.1) {
        warnings.push({
          keys: [
            "sleepDuration",
            "remSleep",
            "lightSleep",
            "deepSleep",
            "awakenings",
          ],
          message: `ステージ時間の合計（約${Math.round(stageSum)}分）と睡眠時間（約${Math.round(sleepMin)}分）に大きな差があります。画像を照合してください。`,
          severity: "warning",
        });
      }
    } else if (stageSum > 0) {
      // 総睡眠が無い場合でもステージ同士の異常（合計が極端）は情報のみ
      if (stageSum > 16 * 60) {
        warnings.push({
          keys: ["remSleep", "lightSleep", "deepSleep", "awakenings"],
          message:
            "ステージ時間の合計が異常に長いです。時間と割合の取り違えがないか確認してください。",
          severity: "warning",
        });
      }
    }
  }

  const remP = parsePercent(metrics.remSleepRate);
  const lightP = parsePercent(metrics.lightSleepRate);
  const deepP = parsePercent(metrics.deepSleepRate);
  const awakeP = parsePercent(metrics.awakeningRate);
  const rates = [remP, lightP, deepP, awakeP].filter(
    (n): n is number => n != null,
  );
  if (rates.length >= 3) {
    const rateSum =
      (remP ?? 0) + (lightP ?? 0) + (deepP ?? 0) + (awakeP ?? 0);
    if (Math.abs(rateSum - 100) > 8) {
      warnings.push({
        keys: [
          "remSleepRate",
          "lightSleepRate",
          "deepSleepRate",
          "awakeningRate",
        ],
        message: `睡眠ステージ割合の合計が ${Math.round(rateSum)}% です（通常は約100%）。割合の誤読がないか確認してください。`,
        severity: "warning",
      });
    }
  }

  // 時間と割合の対応（同一ステージで両方が読めた場合）
  const pairs: Array<{
    durKey: MetricFieldKey;
    rateKey: MetricFieldKey;
    dur: number | null;
    rate: number | null;
  }> = [
    {
      durKey: "remSleep",
      rateKey: "remSleepRate",
      dur: remMin,
      rate: remP,
    },
    {
      durKey: "lightSleep",
      rateKey: "lightSleepRate",
      dur: lightMin,
      rate: lightP,
    },
    {
      durKey: "deepSleep",
      rateKey: "deepSleepRate",
      dur: deepMin,
      rate: deepP,
    },
    {
      durKey: "awakenings",
      rateKey: "awakeningRate",
      dur: awakeMin,
      rate: awakeP,
    },
  ];

  if (sleepMin != null && sleepMin > 0) {
    for (const pair of pairs) {
      if (pair.dur == null || pair.rate == null) continue;
      const expected = (pair.dur / sleepMin) * 100;
      if (Math.abs(expected - pair.rate) > 12) {
        warnings.push({
          keys: [pair.durKey, pair.rateKey, "sleepDuration"],
          message: `${labelOf(pair.durKey)}と${labelOf(pair.rateKey)}が睡眠時間から見た割合と大きく食い違います。`,
          severity: "warning",
        });
      }
    }
  }

  // 入眠・起床と睡眠時間のざっくり整合
  const bed = parseHHMM(metrics.bedtime);
  const wake = parseHHMM(metrics.wakeTime);
  if (bed != null && wake != null && sleepMin != null && sleepMin > 0) {
    let span = wake - bed;
    if (span <= 0) span += 24 * 60;
    // 睡眠時間は就床スパンより長いことは通常ない（潜時・覚醒を含む場合があるので余裕を持たせる）
    if (sleepMin > span + 45) {
      warnings.push({
        keys: ["bedtime", "wakeTime", "sleepDuration"],
        message:
          "入眠〜起床の間隔より睡眠時間が長いです。時刻または睡眠時間の誤読の可能性があります。",
        severity: "warning",
      });
    }
  }

  // 明らかに単位違いっぽい値
  if (isMetricPresent(metrics, "sleepEfficiency")) {
    const n = parsePercent(metrics.sleepEfficiency);
    if (n != null && (n < 20 || n > 100)) {
      warnings.push({
        keys: ["sleepEfficiency"],
        message: `睡眠効率「${metrics.sleepEfficiency}」が通常範囲外です。要確認。`,
        severity: "warning",
      });
    }
  }

  if (isMetricPresent(metrics, "spo2")) {
    const n = parsePercent(metrics.spo2);
    if (n != null && (n < 70 || n > 100)) {
      warnings.push({
        keys: ["spo2"],
        message: `平均SpO₂「${metrics.spo2}」が通常範囲外です。要確認。`,
        severity: "warning",
      });
    }
  }

  // 重複警告の簡易抑制（同一メッセージ）
  const seen = new Set<string>();
  return warnings.filter((w) => {
    if (seen.has(w.message)) return false;
    seen.add(w.message);
    return true;
  });
}

/** 矛盾に関係するキー集合 */
export function consistencyWarningKeys(
  warnings: MetricConsistencyWarning[],
): Set<MetricFieldKey> {
  const set = new Set<MetricFieldKey>();
  for (const w of warnings) {
    for (const k of w.keys) set.add(k);
  }
  return set;
}
