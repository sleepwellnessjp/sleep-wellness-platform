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

/**
 * 画面種別ごとに「この画面から取る」項目を固定。
 * ここに無い項目は、その画面からの採用を大幅に下げる（他画面に正しい値がある場合は捨てる）。
 */
export const SCREEN_PRIMARY_METRICS: Record<
  SoxaiScreenType,
  readonly MetricFieldKey[]
> = {
  home: [
    "sleepScore",
    "sleepDuration",
    "qol",
    "yesterdayQol",
    "conditionScore",
    "restingHeartRate",
  ],
  sleep_overview: ["sleepScore", "sleepDuration"],
  sleep_detail: [
    "sleepDuration",
    "bedtime",
    "wakeTime",
    "sleepEfficiency",
    "sleepDebt",
    "sleepLatency",
    "circadianRhythm",
  ],
  bed_wake: ["bedtime", "wakeTime", "sleepLatency"],
  sleep_stages: [
    "awakenings",
    "awakeningRate",
    "remSleep",
    "remSleepRate",
    "lightSleep",
    "lightSleepRate",
    "deepSleep",
    "deepSleepRate",
    "spo2",
  ],
  circadian: ["circadianRhythm"],
  stress: ["stress"],
  skin_temp: ["skinTemperature"],
  respiration: ["respiratoryRate", "spo2"],
  rhr: ["restingHeartRate"],
  hrv: ["hrv"],
  other: [],
};

/**
 * ホーム画面の代表値。ホームから取れたら他画面より絶対優先し、
 * 他画面との差は競合にしない。
 */
export const HOME_AUTHORITATIVE_KEYS: readonly MetricFieldKey[] = [
  "sleepScore",
  "sleepDuration",
  "qol",
  "yesterdayQol",
  "conditionScore",
] as const;

export function isHomeAuthoritativeKey(key: MetricFieldKey): boolean {
  return (HOME_AUTHORITATIVE_KEYS as readonly string[]).includes(key);
}

/**
 * 正しい画面から取れたら、別画面の値で絶対に上書きしないキー。
 * （ラベル一致が強くても二次画面は採用しない）
 *
 * - sleepScore … ホーム「睡眠」→ 睡眠概要。詳細・ステージ等では上書きしない
 * - bedtime / wakeTime … 入眠／起床画面 or 睡眠詳細。ステージ端点・体内時計等では上書きしない
 */
export const LOCKED_SCREEN_KEYS: Partial<
  Record<MetricFieldKey, readonly SoxaiScreenType[]>
> = {
  sleepScore: ["home", "sleep_overview"],
  bedtime: ["bed_wake", "sleep_detail"],
  wakeTime: ["bed_wake", "sleep_detail"],
};

export function lockedScreensForKey(
  key: MetricFieldKey,
): readonly SoxaiScreenType[] | null {
  return LOCKED_SCREEN_KEYS[key] ?? null;
}

export function isLockedAuthoritativeScreen(
  key: MetricFieldKey,
  screen: SoxaiScreenType,
): boolean {
  const locked = lockedScreensForKey(key);
  return locked ? locked.includes(screen) : false;
}

/** 各メトリクスの画面優先順位（先頭が最優先） */
export const METRIC_SCREEN_PRIORITY: Partial<
  Record<MetricFieldKey, readonly SoxaiScreenType[]>
> = {
  // 正: bed_wake / sleep_detail のみ。他は空のときの最終フォールバック
  bedtime: ["bed_wake", "sleep_detail", "circadian"],
  wakeTime: ["bed_wake", "sleep_detail", "circadian"],
  skinTemperature: ["skin_temp", "sleep_detail"],
  stress: ["stress", "sleep_detail"],
  sleepLatency: ["sleep_detail", "bed_wake"],
  // ホームに睡眠時間があれば最優先。無い場合は詳細・概要へフォールバック
  sleepDuration: ["home", "sleep_detail", "sleep_overview"],
  sleepEfficiency: ["sleep_detail"],
  sleepDebt: ["sleep_detail"],
  circadianRhythm: ["circadian", "sleep_detail"],
  remSleep: ["sleep_stages"],
  remSleepRate: ["sleep_stages"],
  lightSleep: ["sleep_stages"],
  lightSleepRate: ["sleep_stages"],
  deepSleep: ["sleep_stages"],
  deepSleepRate: ["sleep_stages"],
  awakenings: ["sleep_stages", "sleep_detail"],
  awakeningRate: ["sleep_stages"],
  spo2: ["respiration", "sleep_stages"],
  respiratoryRate: ["respiration"],
  restingHeartRate: ["rhr", "home"],
  hrv: ["hrv"],
  // 正: ホーム → 睡眠概要。詳細画面のスコアでは上書きしない
  sleepScore: ["home", "sleep_overview"],
  qol: ["home"],
  yesterdayQol: ["home"],
  conditionScore: ["home"],
};

export function normalizeScreenType(raw: unknown): SoxaiScreenType {
  if (typeof raw !== "string") return "other";
  const v = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if ((SCREEN_ENUM as readonly string[]).includes(v)) {
    return v as SoxaiScreenType;
  }
  if (/睡眠概要|overview|summary/.test(v)) return "sleep_overview";
  if (/ステージ|stage|hypnogram/.test(v)) return "sleep_stages";
  if (/睡眠詳細|detail/.test(v)) return "sleep_detail";
  if (/入眠|起床|bed.?wake|onset/.test(v)) return "bed_wake";
  if (/体内時計|circadian/.test(v)) return "circadian";
  if (/ストレス|stress/.test(v)) return "stress";
  if (/呼吸|respirat|spo2|spo₂/.test(v)) return "respiration";
  if (/安静時|resting|rhr/.test(v)) return "rhr";
  if (/hrv|心拍変動/.test(v)) return "hrv";
  if (/皮膚温|skin.?temp|体表温/.test(v)) return "skin_temp";
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

  // 皮膚温度・ストレスは単独画面が多いので先に判定
  if (/皮膚温|体表温|skintemp|体温偏差|温度偏差/.test(joined)) {
    return "skin_temp";
  }
  if (
    /ストレス/.test(joined) &&
    !/睡眠効率|睡眠負債|入眠潜時|レム睡眠|浅い睡眠/.test(joined)
  ) {
    return "stress";
  }
  if (
    /入眠時間|起床時間|睡眠開始|睡眠終了/.test(joined) &&
    readings.length <= 8 &&
    !/睡眠効率|睡眠負債|レム睡眠/.test(joined)
  ) {
    return "bed_wake";
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

export function isPrimaryMetricForScreen(
  screen: SoxaiScreenType,
  key: MetricFieldKey,
): boolean {
  return SCREEN_PRIMARY_METRICS[screen]?.includes(key) ?? false;
}

/** 画面優先リスト上の順位（0=最優先、大きいほど低い。未掲載は 99） */
export function metricScreenRank(
  key: MetricFieldKey,
  screen: SoxaiScreenType,
): number {
  const list = METRIC_SCREEN_PRIORITY[key];
  if (!list) return screen === "other" ? 50 : 40;
  const idx = list.indexOf(screen);
  return idx >= 0 ? idx : 80;
}

/**
 * 画面種別 × メトリクス適合スコア（高いほどその画面の値を優先）
 * 一次画面: +70〜90 / 二次: +20〜40 / 対象外: 0 または負
 */
export function screenAffinityScore(
  screen: SoxaiScreenType,
  key: MetricFieldKey,
): number {
  // ロック対象キー: 正しい画面からの候補を大幅加点
  if (isLockedAuthoritativeScreen(key, screen)) {
    if (key === "sleepScore") {
      return screen === "home" ? 130 : 100;
    }
    if (key === "bedtime" || key === "wakeTime") {
      return screen === "bed_wake" ? 100 : 90;
    }
  }

  // ホーム代表値はホーム画面から取れた時点で他画面を上回る
  if (screen === "home" && isHomeAuthoritativeKey(key)) {
    return 120;
  }

  if (isPrimaryMetricForScreen(screen, key)) {
    // 重点4項目は特に高く
    if (
      key === "bedtime" ||
      key === "wakeTime" ||
      key === "skinTemperature" ||
      key === "stress"
    ) {
      return screen === "bed_wake" ||
        screen === "skin_temp" ||
        screen === "stress"
        ? 90
        : 75;
    }
    return 70;
  }

  const rank = metricScreenRank(key, screen);
  if (rank <= 1) return 40;
  if (rank <= 3) return 15;

  // 誤画面からの採用を強く抑制（入眠・起床の混同防止）
  if (key === "bedtime" || key === "wakeTime") {
    if (
      screen === "sleep_stages" ||
      screen === "stress" ||
      screen === "skin_temp" ||
      screen === "home" ||
      screen === "rhr" ||
      screen === "hrv" ||
      screen === "respiration" ||
      screen === "sleep_overview" ||
      screen === "other"
    ) {
      return -60;
    }
  }

  // 睡眠スコアはホーム／概要以外から取らない（詳細・ステージ等で上書き禁止）
  if (key === "sleepScore") {
    if (
      screen === "sleep_detail" ||
      screen === "sleep_stages" ||
      screen === "bed_wake" ||
      screen === "stress" ||
      screen === "skin_temp" ||
      screen === "rhr" ||
      screen === "hrv" ||
      screen === "respiration" ||
      screen === "circadian" ||
      screen === "other"
    ) {
      return -50;
    }
  }

  if (key === "skinTemperature" && screen !== "skin_temp" && screen !== "other") {
    return -20;
  }
  if (key === "stress" && screen !== "stress" && screen !== "other") {
    return -15;
  }

  return 0;
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

/** 画面種別に応じた Vision 再スキャン用の必須ラベル文言 */
export function screenCriticalLabels(screen: SoxaiScreenType): string {
  switch (screen) {
    case "skin_temp":
      return "皮膚温度 / 皮膚温 / 平均 / 偏差 / ±0.x℃（明示数値のみ）";
    case "stress":
      return "ストレス / 平均ストレス / ストレスレベル（明示数値のみ。平均の捏造禁止）";
    case "bed_wake":
    case "sleep_detail":
      return "入眠時間 / 起床時間（HH:mm）。潜時・就床・覚醒時間と混同しない";
    case "sleep_stages":
      return "覚醒・レム・浅い・深い（時間と%は別） / SpO₂";
    case "home":
      return "QoL / 昨日のスコア / 睡眠 / 体調 / 心拍数";
    case "rhr":
      return "安静時心拍数（平均を優先。最小・最大は別）";
    case "hrv":
      return "HRV / 心拍変動（平均）";
    case "respiration":
      return "呼吸速度 / 平均酸素レベル（SpO₂）";
    case "circadian":
      return "体内時計 / 位相";
    default:
      return "入眠時間 / 起床時間 / 皮膚温度 / ストレス";
  }
}
