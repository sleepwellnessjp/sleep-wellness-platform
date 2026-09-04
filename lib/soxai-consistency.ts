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

/**
 * 睡眠バランス印刷ゲート用の許容差。
 * 時間は分単位丸めがあるため固定分数ではなく全就床に対する割合で判定する。
 */
/** @deprecated ゲート時間判定は SLEEP_BALANCE_DURATION_TOLERANCE_PCT を使う */
export const SLEEP_BALANCE_DURATION_TOLERANCE_MIN = 2;
/** 全就床時間に対するステージ合計の許容相対誤差（%） */
export const SLEEP_BALANCE_DURATION_TOLERANCE_PCT = 8;
/** Oura（レム+浅い+深い）の率合計許容 ±% */
export const SLEEP_BALANCE_RATE_TOLERANCE_PCT = 1;
/**
 * SOXAI（覚醒+レム+浅い+深い）率合計の段階許容。
 * 各率が独立四捨五入されるため ±3pt までは丸め由来として問題なし。
 */
export const SLEEP_BALANCE_RATE_SOXAI_OK_PCT = 3;
/** SOXAI: これを超えると blocking（これ以下かつ OK 超えは warning） */
export const SLEEP_BALANCE_RATE_SOXAI_WARN_PCT = 6;

export type ConsistencyCheckOptions = {
  inputSource?: "soxai" | "manual" | "oura";
  /**
   * 全就床 / Time in Bed（分）。
   * metrics.timeInBed が無いとき（主に Oura Vision）のフォールバック。
   */
  timeInBedMinutes?: number | null;
};

export type SleepBalanceRateSeverity = "ok" | "warning" | "blocking";

export type SleepBalanceGateResult = {
  /** true なら帯グラフ・内訳を出してよい */
  ok: boolean;
  durationEvaluated: boolean;
  ratesEvaluated: boolean;
  durationOk: boolean | null;
  /**
   * 率チェック。null=未評価。
   * true= PDF 可（ok / warning 帯）。false= blocking。
   */
  ratesOk: boolean | null;
  /** 率合計の段階。null=未評価 */
  ratesSeverity: SleepBalanceRateSeverity | null;
  /** 覚醒+レム+浅い+深い（分）。評価できないとき null */
  stageSumMinutes: number | null;
  /** 睡眠時間（分・参考）。ゲート分母ではない */
  sleepMinutes: number | null;
  /** 全就床時間（分）。時間ゲートの分母 */
  timeInBedMinutes: number | null;
  durationDiffMinutes: number | null;
  rateSum: number | null;
  rateDiffFrom100: number | null;
  failedChecks: Array<"duration" | "rates">;
  messages: string[];
};

function classifyRateSumSeverity(
  rateDiffFrom100: number,
  isOura: boolean,
): SleepBalanceRateSeverity {
  if (isOura) {
    return rateDiffFrom100 <= SLEEP_BALANCE_RATE_TOLERANCE_PCT
      ? "ok"
      : "blocking";
  }
  if (rateDiffFrom100 <= SLEEP_BALANCE_RATE_SOXAI_OK_PCT) return "ok";
  if (rateDiffFrom100 <= SLEEP_BALANCE_RATE_SOXAI_WARN_PCT) return "warning";
  return "blocking";
}

const labelOf = (key: MetricFieldKey): string =>
  SOXAI_METRIC_FIELDS.find((f) => f.key === key)?.label ?? key;

function resolveTimeInBedMinutes(
  metrics: AnalysisMetrics,
  options?: ConsistencyCheckOptions,
): number | null {
  const fromMetrics = parseDurationMinutes(metrics.timeInBed);
  if (fromMetrics != null && fromMetrics > 0) return fromMetrics;
  const fromOptions = options?.timeInBedMinutes;
  if (fromOptions != null && Number.isFinite(fromOptions) && fromOptions > 0) {
    return fromOptions;
  }
  return null;
}

/**
 * PDF③・確認画面ゲート用。
 * - 全就床があるとき: |（覚醒+レム+浅い+深い）−全就床| / 全就床 ≤ 8%
 * - 全就床が無いとき: 時間検証はスキップ（率のみ）
 * - 率合計: Oura は |合計−100| ≤ 1pt（レム+浅い+深い）
 *   SOXAI は |合計−100| ≤ 3 問題なし / ≤ 6 warning（PDF可）/ 超え blocking
 * 評価できる側で blocking があれば ok=false。
 */
export function evaluateSleepBalanceGate(
  metrics: AnalysisMetrics,
  options?: ConsistencyCheckOptions,
): SleepBalanceGateResult {
  const isOura = options?.inputSource === "oura";
  const sleepMinutes = parseDurationMinutes(metrics.sleepDuration);
  const remMin = parseDurationMinutes(metrics.remSleep);
  const lightMin = parseDurationMinutes(metrics.lightSleep);
  const deepMin = parseDurationMinutes(metrics.deepSleep);
  const awakeMin = parseDurationMinutes(metrics.awakenings);
  const remP = parsePercent(metrics.remSleepRate);
  const lightP = parsePercent(metrics.lightSleepRate);
  const deepP = parsePercent(metrics.deepSleepRate);
  const awakeP = parsePercent(metrics.awakeningRate);
  const timeInBedMinutes = resolveTimeInBedMinutes(metrics, options);

  const stagesComplete =
    awakeMin != null && remMin != null && lightMin != null && deepMin != null;
  const stageSumMinutes = stagesComplete
    ? awakeMin! + remMin! + lightMin! + deepMin!
    : null;

  const durationEvaluated =
    timeInBedMinutes != null &&
    stagesComplete &&
    stageSumMinutes != null;

  const durationDiffMinutes =
    durationEvaluated && stageSumMinutes != null && timeInBedMinutes != null
      ? Math.abs(stageSumMinutes - timeInBedMinutes)
      : null;

  const durationOk =
    !durationEvaluated || timeInBedMinutes == null || durationDiffMinutes == null
      ? null
      : (durationDiffMinutes / timeInBedMinutes) * 100 <=
        SLEEP_BALANCE_DURATION_TOLERANCE_PCT;

  let ratesEvaluated: boolean;
  let rateSum: number | null;
  if (isOura) {
    // Oura: レム+浅い+深いのみ（覚醒率は就床寄りで別表示・合計に含めない）
    ratesEvaluated = remP != null && lightP != null && deepP != null;
    rateSum = ratesEvaluated ? remP! + lightP! + deepP! : null;
  } else {
    ratesEvaluated =
      remP != null && lightP != null && deepP != null && awakeP != null;
    rateSum = ratesEvaluated
      ? remP! + lightP! + deepP! + awakeP!
      : null;
  }
  const rateDiffFrom100 =
    rateSum == null ? null : Math.abs(rateSum - 100);
  const ratesSeverity =
    rateDiffFrom100 == null
      ? null
      : classifyRateSumSeverity(rateDiffFrom100, isOura);
  // warning 帯は PDF をブロックしない
  const ratesOk =
    ratesSeverity == null ? null : ratesSeverity !== "blocking";

  const failedChecks: Array<"duration" | "rates"> = [];
  const messages: string[] = [];

  if (
    durationOk === false &&
    stageSumMinutes != null &&
    timeInBedMinutes != null &&
    durationDiffMinutes != null
  ) {
    failedChecks.push("duration");
    const pct =
      Math.round((durationDiffMinutes / timeInBedMinutes) * 1000) / 10;
    messages.push(
      `ステージ合計${Math.round(stageSumMinutes)}分（覚醒+レム+浅い+深い）/ 全就床${Math.round(timeInBedMinutes)}分（差${Math.round(durationDiffMinutes)}分・${pct}%）`,
    );
  }
  if (ratesSeverity === "blocking" && rateSum != null) {
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
    ratesSeverity,
    stageSumMinutes,
    sleepMinutes,
    timeInBedMinutes,
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
  options?: ConsistencyCheckOptions,
): MetricConsistencyWarning[] {
  const warnings: MetricConsistencyWarning[] = [];
  const isOura = options?.inputSource === "oura";

  const sleepMin = parseDurationMinutes(metrics.sleepDuration);
  const remMin = parseDurationMinutes(metrics.remSleep);
  const lightMin = parseDurationMinutes(metrics.lightSleep);
  const deepMin = parseDurationMinutes(metrics.deepSleep);
  const awakeMin = parseDurationMinutes(metrics.awakenings);
  const timeInBedMin = resolveTimeInBedMinutes(metrics, options);

  const gate = evaluateSleepBalanceGate(metrics, options);
  if (gate.durationOk === false) {
    warnings.push({
      keys: [
        "timeInBed",
        "awakenings",
        "remSleep",
        "lightSleep",
        "deepSleep",
      ],
      message: `睡眠ステージ時間の合計（${Math.round(gate.stageSumMinutes ?? 0)}分＝覚醒+レム+浅い+深い）と全就床時間（${Math.round(gate.timeInBedMinutes ?? 0)}分）が一致しません（許容±${SLEEP_BALANCE_DURATION_TOLERANCE_PCT}%）。画像を照合して修正してください。`,
      severity: "blocking",
    });
  }

  if (gate.ratesSeverity === "blocking" || gate.ratesSeverity === "warning") {
    const shown =
      gate.rateSum == null
        ? "?"
        : Number.isInteger(gate.rateSum)
          ? String(gate.rateSum)
          : String(Math.round(gate.rateSum * 10) / 10);
    const rateKeys: MetricFieldKey[] = isOura
      ? ["remSleepRate", "lightSleepRate", "deepSleepRate"]
      : [
          "remSleepRate",
          "lightSleepRate",
          "deepSleepRate",
          "awakeningRate",
        ];
    if (isOura) {
      warnings.push({
        keys: rateKeys,
        message: `レム・浅い・深い睡眠の割合の合計が ${shown}% です（期待 100%・許容±${SLEEP_BALANCE_RATE_TOLERANCE_PCT}%）。画像を照合して修正してください。`,
        severity: "blocking",
      });
    } else if (gate.ratesSeverity === "blocking") {
      warnings.push({
        keys: rateKeys,
        message: `睡眠ステージ割合の合計が ${shown}% です（期待 100%・許容±${SLEEP_BALANCE_RATE_SOXAI_WARN_PCT}%を超過）。覚醒・レム・浅い・深いの率を画像と照合してください。`,
        severity: "blocking",
      });
    } else {
      warnings.push({
        keys: rateKeys,
        message: `睡眠ステージ割合の合計が ${shown}% です（期待 100%・丸め許容±${SLEEP_BALANCE_RATE_SOXAI_OK_PCT}%をやや超過）。印刷は可能ですが、画像と照合してください。`,
        severity: "warning",
      });
    }
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
  // SOXAIの%分母は全就床時間。取れないときは睡眠時間比較をしない（必ず外れるため）。
  // Oura のみ全就床が無いときの睡眠時間フォールバックを残す。
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

  const hasTimeInBed = timeInBedMin != null && timeInBedMin > 0;
  const rateDenom = hasTimeInBed
    ? timeInBedMin
    : isOura
      ? sleepMin
      : null;
  const rateDenomKey: MetricFieldKey = hasTimeInBed
    ? "timeInBed"
    : "sleepDuration";
  if (rateDenom != null && rateDenom > 0) {
    for (const pair of pairs) {
      // Oura: 覚醒率は就床寄り。睡眠時間基準の対応チェックはしない
      if (
        isOura &&
        pair.rateKey === "awakeningRate" &&
        rateDenomKey === "sleepDuration"
      ) {
        continue;
      }
      if (pair.dur == null || pair.rate == null) continue;
      const expected = (pair.dur / rateDenom) * 100;
      if (Math.abs(expected - pair.rate) > 12) {
        warnings.push({
          keys: [pair.durKey, pair.rateKey, rateDenomKey],
          message: `${labelOf(pair.durKey)}と${labelOf(pair.rateKey)}が${labelOf(rateDenomKey)}から見た割合と大きく食い違います。`,
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
