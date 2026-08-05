/**
 * Sleep Wellness Platform 独自の Sleep Wellness Score。
 *
 * SleepAnalysisData のみを入力とし、デバイス（SOXAI / Oura / 将来デバイス）
 * 共通で 100 点満点を返す。AI コメントは含まない。
 *
 * 欠測項目は除外し、取得済み項目の重みを再正規化して総合点を算出する。
 */

import type {
  SleepAnalysisData,
  SleepAnalysisDevice,
} from "@/lib/sleep-analysis/sleep-analysis-model";
import {
  scoreDeepSleep,
  scoreHrvMs,
  scoreRecoveryIndex,
  scoreRecoveryMinutes,
  scoreRem,
  scoreRespiratoryRate,
  scoreRestingHeartRateBpm,
  scoreSleepDurationMinutes,
  scoreSleepEfficiencyPercent,
  scoreStressMinutes,
  scoreTemperatureDeviation,
} from "@/lib/sleep-analysis/sleep-wellness-factor-scores";
import {
  SLEEP_WELLNESS_FACTOR_KEYS,
  SLEEP_WELLNESS_FACTOR_LABELS,
  SLEEP_WELLNESS_SCORE_VERSION,
  SLEEP_WELLNESS_WEIGHTS,
  type SleepWellnessScoreFactorKey,
} from "@/lib/sleep-analysis/sleep-wellness-weights";

export type { SleepWellnessScoreFactorKey };

export type SleepWellnessGrade = "A" | "B" | "C" | "D" | "E";

export type SleepWellnessScoreFactor = {
  key: SleepWellnessScoreFactorKey;
  label: string;
  /** 設計上の基準重み（合計 1.0） */
  baseWeight: number;
  /** 欠測除外後の実効重み。未計測は null */
  effectiveWeight: number | null;
  /** 項目スコア 0–100。未計測は null */
  score: number | null;
  /** 総合への寄与（effectiveWeight × score）。未計測は null */
  contribution: number | null;
  available: boolean;
  /** 評価に使った生値 */
  inputValue: number | null;
  unit: string | null;
};

export type SleepWellnessScore = {
  /** 総合点 0–100。有効項目が 0 のとき null */
  total: number | null;
  grade: SleepWellnessGrade | null;
  factors: SleepWellnessScoreFactor[];
  coverage: {
    available: number;
    total: number;
  };
  device: SleepAnalysisDevice;
  meta: {
    version: string;
    renormalized: boolean;
    missingKeys: SleepWellnessScoreFactorKey[];
  };
};

function finiteOrNull(n: number | null | undefined): number | null {
  if (n == null) return null;
  return Number.isFinite(n) ? n : null;
}

function gradeOf(total: number): SleepWellnessGrade {
  if (total >= 85) return "A";
  if (total >= 70) return "B";
  if (total >= 55) return "C";
  if (total >= 40) return "D";
  return "E";
}

type FactorEval = {
  key: SleepWellnessScoreFactorKey;
  score: number | null;
  inputValue: number | null;
  unit: string | null;
};

function evaluateFactors(data: SleepAnalysisData): FactorEval[] {
  const totalSleep = finiteOrNull(data.totalSleepMinutes);
  const rem = finiteOrNull(data.remMinutes);
  const deep = finiteOrNull(data.deepMinutes);
  const duration = finiteOrNull(data.totalSleepMinutes);
  const efficiency = finiteOrNull(data.sleepEfficiency);
  const hrv = finiteOrNull(data.hrv);
  const rhr =
    finiteOrNull(data.restingHeartRate) ?? finiteOrNull(data.lowestHeartRate);
  const resp = finiteOrNull(data.respiratoryRate);
  const temp = finiteOrNull(data.temperatureDeviation);
  const stress = finiteOrNull(data.stressMinutes);
  const recoveryMins = finiteOrNull(data.recoveryMinutes);
  const resilience = finiteOrNull(data.resilienceScore);

  // rawMetrics に Oura recoveryIndex がある場合のフォールバック
  let recoveryIndex: number | null = null;
  const rawVision = data.rawMetrics?.visionMetrics;
  if (rawVision && typeof rawVision === "object") {
    const idx = (rawVision as { recoveryIndex?: unknown }).recoveryIndex;
    if (typeof idx === "number" && Number.isFinite(idx)) {
      recoveryIndex = idx;
    }
  }

  let recoveryScore: number | null = null;
  let recoveryInput: number | null = null;
  let recoveryUnit: string | null = null;
  if (recoveryMins != null) {
    recoveryScore = scoreRecoveryMinutes(recoveryMins);
    recoveryInput = recoveryMins;
    recoveryUnit = "min";
  } else if (recoveryIndex != null) {
    recoveryScore = scoreRecoveryIndex(recoveryIndex);
    recoveryInput = recoveryIndex;
    recoveryUnit = "index";
  } else if (resilience != null) {
    recoveryScore = scoreRecoveryIndex(resilience);
    recoveryInput = resilience;
    recoveryUnit = "score";
  }

  return [
    {
      key: "sleepDuration",
      score: duration != null ? scoreSleepDurationMinutes(duration) : null,
      inputValue: duration,
      unit: duration != null ? "min" : null,
    },
    {
      key: "sleepEfficiency",
      score:
        efficiency != null ? scoreSleepEfficiencyPercent(efficiency) : null,
      inputValue: efficiency,
      unit: efficiency != null ? "%" : null,
    },
    {
      key: "rem",
      score: rem != null ? scoreRem(rem, totalSleep) : null,
      inputValue: rem,
      unit: rem != null ? "min" : null,
    },
    {
      key: "deepSleep",
      score: deep != null ? scoreDeepSleep(deep, totalSleep) : null,
      inputValue: deep,
      unit: deep != null ? "min" : null,
    },
    {
      key: "hrv",
      score: hrv != null ? scoreHrvMs(hrv) : null,
      inputValue: hrv,
      unit: hrv != null ? "ms" : null,
    },
    {
      key: "restingHeartRate",
      score: rhr != null ? scoreRestingHeartRateBpm(rhr) : null,
      inputValue: rhr,
      unit: rhr != null ? "bpm" : null,
    },
    {
      key: "respiratoryRate",
      score: resp != null ? scoreRespiratoryRate(resp) : null,
      inputValue: resp,
      unit: resp != null ? "rpm" : null,
    },
    {
      key: "temperatureDeviation",
      score: temp != null ? scoreTemperatureDeviation(temp) : null,
      inputValue: temp,
      unit: temp != null ? "°C" : null,
    },
    {
      key: "stress",
      score: stress != null ? scoreStressMinutes(stress) : null,
      inputValue: stress,
      unit: stress != null ? "min" : null,
    },
    {
      key: "recovery",
      score: recoveryScore,
      inputValue: recoveryInput,
      unit: recoveryUnit,
    },
  ];
}

/**
 * SleepAnalysisData から Sleep Wellness Score（100点満点）を算出する。
 */
export function computeSleepWellnessScore(
  data: SleepAnalysisData,
): SleepWellnessScore {
  const evaluated = evaluateFactors(data);
  const byKey = new Map(evaluated.map((e) => [e.key, e]));

  const availableEvals = evaluated.filter((e) => e.score != null);
  const weightSum = availableEvals.reduce(
    (sum, e) => sum + SLEEP_WELLNESS_WEIGHTS[e.key],
    0,
  );
  const renormalized = availableEvals.length > 0 && weightSum < 0.999;

  const factors: SleepWellnessScoreFactor[] = SLEEP_WELLNESS_FACTOR_KEYS.map(
    (key) => {
      const ev = byKey.get(key)!;
      const baseWeight = SLEEP_WELLNESS_WEIGHTS[key];
      const available = ev.score != null;
      const effectiveWeight =
        available && weightSum > 0 ? baseWeight / weightSum : null;
      const contribution =
        available && effectiveWeight != null && ev.score != null
          ? Math.round(effectiveWeight * ev.score * 10) / 10
          : null;
      return {
        key,
        label: SLEEP_WELLNESS_FACTOR_LABELS[key],
        baseWeight,
        effectiveWeight:
          effectiveWeight != null
            ? Math.round(effectiveWeight * 1000) / 1000
            : null,
        score: ev.score,
        contribution,
        available,
        inputValue: ev.inputValue,
        unit: ev.unit,
      };
    },
  );

  let total: number | null = null;
  if (weightSum > 0) {
    const raw = factors.reduce((sum, f) => {
      if (f.score == null || f.effectiveWeight == null) return sum;
      return sum + f.effectiveWeight * f.score;
    }, 0);
    total = Math.max(0, Math.min(100, Math.round(raw)));
  }

  const missingKeys = factors
    .filter((f) => !f.available)
    .map((f) => f.key);

  return {
    total,
    grade: total != null ? gradeOf(total) : null,
    factors,
    coverage: {
      available: availableEvals.length,
      total: SLEEP_WELLNESS_FACTOR_KEYS.length,
    },
    device: data.device,
    meta: {
      version: SLEEP_WELLNESS_SCORE_VERSION,
      renormalized,
      missingKeys,
    },
  };
}
