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
  /** 重大度（blocking = 睡眠バランスPDFを出さない） */
  severity: "warning" | "info" | "blocking";
};

/** 睡眠バランス印刷ゲート用の許容差 */
export const SLEEP_BALANCE_DURATION_TOLERANCE_MIN = 2;
export const SLEEP_BALANCE_RATE_TOLERANCE_PCT = 1;

export type SleepBalanceGateResult = {
  /** true なら帯グラフ・内訳を出してよい */
  ok: boolean;
  durationEvaluated: boolean;
  ratesEvaluated: boolean;
  durationOk: boolean | null;
  ratesOk: boolean | null;
  stageSumMinutes: number | null;
  sleepMinutes: number | null;
  durationDiffMinutes: number | null;
  rateSum: number | null;
  rateDiffFrom100: number | null;
  failedChecks: Array<"duration" | "rates">;
  messages: string[];
};

const labelOf = (key: MetricFieldKey): string =>
  SOXAI_METRIC_FIELDS.find((f) => f.key === key)?.label ?? key;

/**
 * PDF③・確認画面ゲート用。
 * - |（レム+浅い+深い）−睡眠時間| <= 2分
 * - |率合計（覚醒+レム+浅い+深い）−100| <= 1
 * 評価できる側で満たさないものがあれば ok=false。
 */
export function evaluateSleepBalanceGate(
  metrics: AnalysisMetrics,
): SleepBalanceGateResult {
  const sleepMinutes = parseDurationMinutes(metrics.sleepDuration);
  const remMin = parseDurationMinutes(metrics.remSleep);
  const lightMin = parseDurationMinutes(metrics.lightSleep);
  const deepMin = parseDurationMinutes(metrics.deepSleep);
  const remP = parsePercent(metrics.remSleepRate);
  const lightP = parsePercent(metrics.lightSleepRate);
  const deepP = parsePercent(metrics.deepSleepRate);
  const awakeP = parsePercent(metrics.awakeningRate);

  const durationEvaluated =
    sleepMinutes != null &&
    remMin != null &&
    lightMin != null &&
    deepMin != null;
  const stageSumMinutes = durationEvaluated
    ? remMin! + lightMin! + deepMin!
    : null;
  const durationDiffMinutes =
    durationEvaluated && stageSumMinutes != null && sleepMinutes != null
      ? Math.abs(stageSumMinutes - sleepMinutes)
      : null;
  const durationOk =
    durationDiffMinutes == null
      ? null
      : durationDiffMinutes <= SLEEP_BALANCE_DURATION_TOLERANCE_MIN;

  const ratesEvaluated =
    remP != null && lightP != null && deepP != null && awakeP != null;
  const rateSum = ratesEvaluated
    ? remP! + lightP! + deepP! + awakeP!
    : null;
  const rateDiffFrom100 =
    rateSum == null ? null : Math.abs(rateSum - 100);
  const ratesOk =
    rateDiffFrom100 == null
      ? null
      : rateDiffFrom100 <= SLEEP_BALANCE_RATE_TOLERANCE_PCT;

  const failedChecks: Array<"duration" | "rates"> = [];
  const messages: string[] = [];

  if (durationOk === false && stageSumMinutes != null && sleepMinutes != null) {
    failedChecks.push("duration");
    messages.push(
      `ステージ合計${Math.round(stageSumMinutes)}分（レム+浅い+深い）/ 睡眠時間${Math.round(sleepMinutes)}分（差${Math.round(durationDiffMinutes ?? 0)}分）`,
    );
  }
  if (ratesOk === false && rateSum != null) {
    failedChecks.push("rates");
    const shown = Number.isInteger(rateSum)
      ? String(rateSum)
      : String(Math.round(rateSum * 10) / 10);
    messages.push(
      `ステージ割合の合計 ${shown}%（期待 100%・差${Math.round((rateDiffFrom100 ?? 0) * 10) / 10}pt）`,
    );
  }

  const ok = failedChecks.length === 0;

  return {
    ok,
    durationEvaluated,
    ratesEvaluated,
    durationOk,
    ratesOk,
    stageSumMinutes,
    sleepMinutes,
    durationDiffMinutes,
    rateSum,
    rateDiffFrom100,
    failedChecks,
    messages,
  };
}

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

  const gate = evaluateSleepBalanceGate(metrics);
  if (gate.durationOk === false) {
    warnings.push({
      keys: ["sleepDuration", "remSleep", "lightSleep", "deepSleep"],
      message: `睡眠ステージ時間の合計（${Math.round(gate.stageSumMinutes ?? 0)}分＝レム+浅い+深い）と睡眠時間（${Math.round(gate.sleepMinutes ?? 0)}分）が一致しません（許容±${SLEEP_BALANCE_DURATION_TOLERANCE_MIN}分）。画像を照合して修正してください。`,
      severity: "blocking",
    });
  }

  if (gate.ratesOk === false) {
    const shown =
      gate.rateSum == null
        ? "?"
        : Number.isInteger(gate.rateSum)
          ? String(gate.rateSum)
          : String(Math.round(gate.rateSum * 10) / 10);
    warnings.push({
      keys: [
        "remSleepRate",
        "lightSleepRate",
        "deepSleepRate",
        "awakeningRate",
      ],
      message: `睡眠ステージ割合の合計が ${shown}% です（期待 100%・許容±${SLEEP_BALANCE_RATE_TOLERANCE_PCT}%）。覚醒・レム・浅い・深いの率を画像と照合してください。`,
      severity: "blocking",
    });
  }

  // SOXAIの「睡眠時間」はレム+浅い+深い（覚醒を含まない）。
  const sleepStageMins = [remMin, lightMin, deepMin].filter(
    (n): n is number => n != null,
  );
  if (sleepStageMins.length >= 3) {
    const sleepStageSum = (remMin ?? 0) + (lightMin ?? 0) + (deepMin ?? 0);
    if (sleepMin == null && sleepStageSum > 16 * 60) {
      warnings.push({
        keys: ["remSleep", "lightSleep", "deepSleep"],
        message:
          "ステージ時間の合計が異常に長いです。時間と割合の取り違えがないか確認してください。",
        severity: "warning",
      });
    }
  }

  // 覚醒を含む合計は就床スパン異常の検知用（睡眠時間との直接比較はしない）
  if (awakeMin != null && sleepStageMins.length >= 3) {
    const withAwake =
      (remMin ?? 0) + (lightMin ?? 0) + (deepMin ?? 0) + awakeMin;
    if (withAwake > 18 * 60) {
      warnings.push({
        keys: ["remSleep", "lightSleep", "deepSleep", "awakenings"],
        message:
          "覚醒を含むステージ時間の合計が異常に長いです。時間と割合の取り違えがないか確認してください。",
        severity: "warning",
      });
    }
  }

  const remP = parsePercent(metrics.remSleepRate);
  const lightP = parsePercent(metrics.lightSleepRate);
  const deepP = parsePercent(metrics.deepSleepRate);
  const awakeP = parsePercent(metrics.awakeningRate);

  // 時間と割合の対応（同一ステージで両方が読めた場合）
  // ※ SOXAIの%分母は就床寄りだが、ここでは従来どおり睡眠時間基準のソフト警告のみ
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
    if (sleepMin > span + 45) {
      warnings.push({
        keys: ["bedtime", "wakeTime", "sleepDuration"],
        message:
          "入眠〜起床の間隔より睡眠時間が長いです。時刻または睡眠時間の誤読の可能性があります。",
        severity: "warning",
      });
    }
  }

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

  if (isMetricPresent(metrics, "restingHeartRate")) {
    const n = Number(String(metrics.restingHeartRate).replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && (n < 30 || n > 100)) {
      warnings.push({
        keys: ["restingHeartRate"],
        message: `安静時心拍数「${metrics.restingHeartRate}」が通常範囲外です。要確認。`,
        severity: "warning",
      });
    }
  }

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

export function hasBlockingConsistencyWarning(
  warnings: MetricConsistencyWarning[],
): boolean {
  return warnings.some((w) => w.severity === "blocking");
}
