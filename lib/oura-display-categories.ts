/**
 * Oura 専用: 取得できた項目だけを7カテゴリーへ整理する。
 * 未取得項目は一覧に含めない（UI 非表示用）。SOXAI とは完全分離。
 */

import { formatDurationDisplay } from "@/lib/soxai-display-normalize";
import type {
  OuraDeviceSpecificMetrics,
  OuraVisionMetrics,
} from "@/lib/oura-vision-schema";

export type OuraDisplayItem = {
  key: string;
  label: string;
  value: string;
};

export type OuraDisplayCategory = {
  id: string;
  title: string;
  items: OuraDisplayItem[];
};

function minutesDisplay(minutes: number | null | undefined): string | null {
  if (minutes == null || !Number.isFinite(minutes)) return null;
  if (minutes < 0) return null;
  return formatDurationDisplay(`${Math.round(minutes)}分`);
}

function percentDisplay(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value * 10) / 10}%`;
}

function bpmDisplay(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value)} bpm`;
}

function msDisplay(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value)} ms`;
}

function rpmDisplay(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value * 10) / 10} /分`;
}

function tempDisplay(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value * 100) / 100}℃`;
}

function scoreDisplay(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return String(Math.round(value));
}

function textDisplay(value: string | null | undefined): string | null {
  const text = value?.trim();
  return text ? text : null;
}

function kcalDisplay(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value)} kcal`;
}

function stepsDisplay(value: number | null | undefined): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  return `${Math.round(value)} 歩`;
}

function pushItem(
  items: OuraDisplayItem[],
  key: string,
  label: string,
  value: string | null,
) {
  if (!value) return;
  items.push({ key, label, value });
}

/**
 * Vision 結果から、取得できた項目だけを Oura 専用7カテゴリーへ整理する。
 */
export function buildOuraDisplayCategories(args: {
  vision: OuraVisionMetrics | null | undefined;
  deviceSpecific?: OuraDeviceSpecificMetrics | null;
}): OuraDisplayCategory[] {
  const v = args.vision;
  if (!v) return [];

  const scores: OuraDisplayItem[] = [];
  pushItem(scores, "sleepScore", "睡眠スコア", scoreDisplay(v.sleepScore));
  pushItem(
    scores,
    "readinessScore",
    "コンディションスコア",
    scoreDisplay(v.readinessScore),
  );
  pushItem(
    scores,
    "activityScore",
    "アクティビティスコア",
    scoreDisplay(v.activityScore),
  );

  const sleep: OuraDisplayItem[] = [];
  pushItem(sleep, "totalSleep", "合計睡眠", minutesDisplay(v.totalSleep));
  pushItem(sleep, "timeInBed", "ベッドにいた時間", minutesDisplay(v.timeInBed));
  pushItem(
    sleep,
    "sleepEfficiency",
    "睡眠効率",
    percentDisplay(v.sleepEfficiency),
  );
  pushItem(sleep, "sleepLatency", "入眠潜時", minutesDisplay(v.sleepLatency));
  pushItem(sleep, "restfulness", "安眠度", textDisplay(v.restfulness));

  const stages: OuraDisplayItem[] = [];
  {
    const awake =
      minutesDisplay(v.awakeDuration) ??
      (v.awakeTime && /(\d+)\s*時間|(\d+)\s*分/.test(v.awakeTime)
        ? v.awakeTime.trim()
        : null);
    pushItem(stages, "awakeDuration", "覚醒時間", awake);
  }
  pushItem(stages, "remDuration", "REM睡眠時間", minutesDisplay(v.remDuration));
  pushItem(stages, "remPercent", "REM睡眠割合", percentDisplay(v.remPercent));
  pushItem(
    stages,
    "lightSleepDuration",
    "浅い睡眠時間",
    minutesDisplay(v.lightSleepDuration),
  );
  pushItem(
    stages,
    "lightSleepPercent",
    "浅い睡眠割合",
    percentDisplay(v.lightSleepPercent),
  );
  pushItem(
    stages,
    "deepSleepDuration",
    "深い睡眠時間",
    minutesDisplay(v.deepSleepDuration),
  );
  pushItem(
    stages,
    "deepSleepPercent",
    "深い睡眠割合",
    percentDisplay(v.deepSleepPercent),
  );

  const heart: OuraDisplayItem[] = [];
  pushItem(
    heart,
    "restingHeartRate",
    "安静時心拍数",
    bpmDisplay(v.restingHeartRate),
  );
  pushItem(
    heart,
    "lowestHeartRate",
    "最低心拍数",
    bpmDisplay(v.lowestHeartRate),
  );
  pushItem(
    heart,
    "averageHeartRate",
    "平均心拍数",
    bpmDisplay(v.averageHeartRate),
  );
  pushItem(heart, "averageHrv", "平均HRV（心拍変動）", msDisplay(v.averageHrv));
  pushItem(heart, "maximumHrv", "最大HRV", msDisplay(v.maximumHrv));

  const breath: OuraDisplayItem[] = [];
  pushItem(
    breath,
    "respiratoryRate",
    "呼吸速度",
    rpmDisplay(v.respiratoryRate),
  );
  pushItem(
    breath,
    "averageSpO2",
    "平均血中酸素ウェルネス",
    percentDisplay(v.averageSpO2),
  );
  pushItem(
    breath,
    "breathingRegularity",
    "夜間の呼吸状態",
    textDisplay(v.breathingRegularity) ??
      textDisplay(v.breathingDisturbances),
  );
  pushItem(
    breath,
    "bodyTemperatureDeviation",
    "体表温変化",
    tempDisplay(v.bodyTemperatureDeviation),
  );

  const debt: OuraDisplayItem[] = [];
  pushItem(
    debt,
    "sleepDebtMinutes",
    "睡眠負債",
    minutesDisplay(v.sleepDebtMinutes),
  );
  pushItem(
    debt,
    "sleepNeedMinutes",
    "必要な睡眠量",
    minutesDisplay(v.sleepNeedMinutes),
  );
  pushItem(
    debt,
    "recoveryIndex",
    "回復指数",
    scoreDisplay(v.recoveryIndex),
  );
  pushItem(
    debt,
    "hrvBalance",
    "心拍変動バランス",
    textDisplay(v.hrvBalance) ?? scoreDisplay(v.hrvBalanceScore),
  );
  pushItem(
    debt,
    "sleepRegularity",
    "睡眠規則性",
    textDisplay(v.sleepRegularity) ?? textDisplay(v.sleepTiming),
  );

  const stress: OuraDisplayItem[] = [];
  pushItem(
    stress,
    "daytimeStressMinutes",
    "ストレス時間",
    minutesDisplay(v.daytimeStressMinutes),
  );
  {
    const recovery =
      minutesDisplay(v.daytimeRecoveryMinutes) ?? textDisplay(v.recoveryTime);
    pushItem(stress, "daytimeRecoveryMinutes", "回復時間", recovery);
  }
  pushItem(
    stress,
    "daytimeRelaxMinutes",
    "リラックス時間",
    minutesDisplay(v.daytimeRelaxMinutes),
  );
  pushItem(stress, "caloriesBurned", "消費カロリー", kcalDisplay(v.caloriesBurned));
  pushItem(
    stress,
    "activityTimeMinutes",
    "活動時間",
    minutesDisplay(v.activityTimeMinutes),
  );
  pushItem(stress, "steps", "歩数", stepsDisplay(v.steps));

  const categories: OuraDisplayCategory[] = [
    { id: "scores", title: "1. スコア", items: scores },
    { id: "sleep", title: "2. 睡眠", items: sleep },
    { id: "stages", title: "3. 睡眠ステージ", items: stages },
    { id: "heart", title: "4. 心拍・HRV", items: heart },
    { id: "breath", title: "5. 呼吸・体表温", items: breath },
    { id: "debt", title: "6. 睡眠負債・回復", items: debt },
    { id: "stress", title: "7. ストレス・活動", items: stress },
  ];

  // 表示可能なデータが1件もないカテゴリーは除外
  return categories.filter((category) => category.items.length > 0);
}

export function countOuraPresentItems(
  categories: readonly OuraDisplayCategory[],
): number {
  return categories.reduce((sum, category) => sum + category.items.length, 0);
}
