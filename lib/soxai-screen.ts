import type { VisibleReading } from "@/lib/soxai-reading-map";
import type { MetricFieldKey } from "@/lib/soxai-metrics";

/** SOXAI画面種別（Vision / ルール判定の共通） */
export type SoxaiScreenType =
  | "sleep_overview"
  | "sleep_stages"
  | "sleep_detail"
  | "bed_wake"
  | "circadian"
  | "stress"
  | "respiration"
  | "rhr"
  | "hrv"
  | "skin_temp"
  | "home"
  | "other";

export const SOXAI_SCREEN_LABELS: Record<SoxaiScreenType, string> = {
  sleep_overview: "睡眠概要",
  sleep_stages: "睡眠ステージ",
  sleep_detail: "睡眠詳細",
  bed_wake: "入眠／起床時刻",
  circadian: "体内時計",
  stress: "ストレス",
  respiration: "睡眠時呼吸",
  rhr: "安静時心拍",
  hrv: "HRV",
  skin_temp: "皮膚温度",
  home: "ホーム",
  other: "その他",
};

const SCREEN_ENUM = [
  "sleep_overview",
  "sleep_stages",
  "sleep_detail",
  "bed_wake",
  "circadian",
  "stress",
  "respiration",
  "rhr",
  "hrv",
  "skin_temp",
  "home",
  "other",
] as const;

export function normalizeScreenType(raw: unknown): SoxaiScreenType {
  if (typeof raw !== "string") return "other";
  const v = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((SCREEN_ENUM as readonly string[]).includes(v)) {
    return v as SoxaiScreenType;
  }
  // 日本語・表記ゆれ
  if (/睡眠概要|overview|summary/.test(v)) return "sleep_overview";
  if (/ステージ|stage|hypnogram/.test(v)) return "sleep_stages";
  if (/睡眠詳細|detail/.test(v)) return "sleep_detail";
  if (/入眠|起床|bed.?wake|onset/.test(v)) return "bed_wake";
  if (/体内時計|circadian/.test(v)) return "circadian";
  if (/ストレス|stress/.test(v)) return "stress";
  if (/呼吸|respirat|spo2|spo₂/.test(v)) return "respiration";
  if (/安静時|resting|rhr/.test(v)) return "rhr";
  if (/hrv|心拍変動/.test(v)) return "hrv";
  if (/皮膚温|skin.?temp/.test(v)) return "skin_temp";
  if (/ホーム|home|qol/.test(v)) return "home";
  return "other";
}

/** ラベル群から画面種別を推定（Vision未返却時のフォールバック） */
export function inferScreenTypeFromReadings(
  readings: VisibleReading[],
): SoxaiScreenType {
  const joined = readings
    .map((r) => r.label.normalize("NFKC").toLowerCase())
    .join("|");

  if (/入眠時間|起床時間|睡眠開始|睡眠終了/.test(joined) && readings.length <= 8) {
    return "bed_wake";
  }
  if (/皮膚温/.test(joined)) return "skin_temp";
  if (/ストレス/.test(joined) && !/睡眠効率|睡眠負債/.test(joined)) {
    return "stress";
  }
  if (/体内時計|circadian/.test(joined)) return "circadian";
  if (/心拍変動|^hrv$|rmssd/.test(joined)) return "hrv";
  if (/安静時心拍/.test(joined)) return "rhr";
  if (/呼吸速度|平均酸素|spo2|spo₂/.test(joined)) return "respiration";
  if (/レム睡眠|浅い睡眠|深い睡眠|覚醒時間|覚醒率/.test(joined)) {
    return "sleep_stages";
  }
  if (/睡眠効率|睡眠負債|入眠潜時|全就床|睡眠時間/.test(joined)) {
    return "sleep_detail";
  }
  if (/^qol$|昨日のスコア|昨日のqol|体調/.test(joined)) return "home";
  if (/睡眠スコア|^睡眠$/.test(joined)) return "sleep_overview";
  return "other";
}

/**
 * 画面種別 × メトリクス適合スコア（高いほどその画面の値を優先）
 */
export function screenAffinityScore(
  screen: SoxaiScreenType,
  key: MetricFieldKey,
): number {
  const table: Partial<Record<SoxaiScreenType, Partial<Record<MetricFieldKey, number>>>> = {
    bed_wake: { bedtime: 50, wakeTime: 50, sleepLatency: 20 },
    sleep_detail: {
      bedtime: 45,
      wakeTime: 45,
      sleepDuration: 40,
      sleepEfficiency: 40,
      sleepDebt: 40,
      sleepLatency: 40,
      circadianRhythm: 25,
    },
    sleep_stages: {
      remSleep: 45,
      remSleepRate: 45,
      lightSleep: 45,
      lightSleepRate: 45,
      deepSleep: 45,
      deepSleepRate: 45,
      awakenings: 45,
      awakeningRate: 45,
      spo2: 30,
      bedtime: 15,
      wakeTime: 15,
    },
    sleep_overview: {
      sleepScore: 40,
      sleepDuration: 20,
      bedtime: 10,
      wakeTime: 10,
    },
    circadian: { circadianRhythm: 50, bedtime: 20, wakeTime: 20 },
    stress: { stress: 55 },
    skin_temp: { skinTemperature: 55 },
    rhr: { restingHeartRate: 50 },
    hrv: { hrv: 50 },
    respiration: { respiratoryRate: 50, spo2: 45 },
    home: {
      sleepScore: 35,
      qol: 40,
      yesterdayQol: 40,
      conditionScore: 40,
      restingHeartRate: 25,
    },
  };

  return table[screen]?.[key] ?? 0;
}

/** 4重点項目 */
export const CRITICAL_OCR_KEYS: MetricFieldKey[] = [
  "bedtime",
  "wakeTime",
  "skinTemperature",
  "stress",
];

export function isCriticalOcrKey(key: MetricFieldKey): boolean {
  return CRITICAL_OCR_KEYS.includes(key);
}
