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
    "qol",
    "yesterdayQol",
    "conditionScore",
    // 睡眠時間は睡眠概要画面のみ。ホームの「心拍数/最新」は安静時心拍ではない
  ],
  sleep_overview: ["sleepScore", "sleepDuration"],
  sleep_detail: [
    "bedtime",
    "wakeTime",
    "sleepDuration",
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
    // 深い睡眠＝ノンレム。浅い睡眠は別項目。呼吸速度は呼吸画面のみ
    "lightSleep",
    "lightSleepRate",
    "deepSleep",
    "deepSleepRate",
    "nonRemSleep",
    "nonRemSleepRate",
    "spo2",
  ],
  circadian: ["circadianRhythm", "bedtime", "wakeTime"],
  stress: ["stress"],
  skin_temp: ["skinTemperature"],
  // 呼吸画面: 呼吸速度・安静時心拍（HRV/SpO₂ の既存画面割当は維持）
  respiration: [
    "respiratoryRate",
    "restingHeartRate",
    "restingHeartRateMin",
    "restingHeartRateMax",
    "spo2",
  ],
  rhr: [
    "restingHeartRate",
    "restingHeartRateMin",
    "restingHeartRateMax",
    "respiratoryRate",
  ],
  hrv: [
    "hrv",
    "hrvMax",
    "hrvMin",
    // UI「呼吸・心拍」スロット: 同居スクショの酸素・呼吸・安静時も一次項目
    "respiratoryRate",
    "spo2",
    "restingHeartRate",
    "restingHeartRateMin",
    "restingHeartRateMax",
  ],
  other: [],
};

/**
 * ホーム画面の代表値。ホームから取れたら他画面より絶対優先し、
 * 他画面との差は競合にしない。
 * （睡眠時間は睡眠概要固定のため含めない）
 */
export const HOME_AUTHORITATIVE_KEYS: readonly MetricFieldKey[] = [
  "sleepScore",
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
 * - deep / nonRem … 睡眠ステージのみ（深い睡眠＝ノンレム）
 * ※ sleepDuration / respiratoryRate / restingHeartRate は明示ラベル優先（画面ロックしない）
 */
export const LOCKED_SCREEN_KEYS: Partial<
  Record<MetricFieldKey, readonly SoxaiScreenType[]>
> = {
  sleepScore: ["home", "sleep_overview"],
  bedtime: ["bed_wake", "sleep_detail"],
  wakeTime: ["bed_wake", "sleep_detail"],
  deepSleep: ["sleep_stages"],
  deepSleepRate: ["sleep_stages"],
  nonRemSleep: ["sleep_stages"],
  nonRemSleepRate: ["sleep_stages"],
};

/**
 * 固定画面以外からのフォールバック禁止キー。
 * ロック画面に候補が無いとき、他画面の OCR で埋めない。
 * ※ sleepDuration / respiratoryRate / restingHeartRate は明示ラベルで他画面からも可
 */
export const STRICT_SOURCE_SCREEN_KEYS: readonly MetricFieldKey[] = [
  "deepSleep",
  "deepSleepRate",
  "nonRemSleep",
  "nonRemSleepRate",
] as const;

export function isStrictSourceScreenKey(key: MetricFieldKey): boolean {
  return (STRICT_SOURCE_SCREEN_KEYS as readonly string[]).includes(key);
}

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
  // 睡眠時間: 明示「睡眠時間」ラベル優先。画面はソフト優先のみ
  sleepDuration: ["sleep_overview", "sleep_detail", "other"],
  sleepEfficiency: ["sleep_detail"],
  sleepDebt: ["sleep_detail"],
  circadianRhythm: ["circadian", "sleep_detail"],
  remSleep: ["sleep_stages"],
  remSleepRate: ["sleep_stages"],
  nonRemSleep: ["sleep_stages"],
  nonRemSleepRate: ["sleep_stages"],
  lightSleep: ["sleep_stages"],
  lightSleepRate: ["sleep_stages"],
  deepSleep: ["sleep_stages"],
  deepSleepRate: ["sleep_stages"],
  awakenings: ["sleep_stages", "sleep_detail"],
  awakeningRate: ["sleep_stages"],
  spo2: ["respiration", "sleep_stages"],
  // 呼吸速度: 明示ラベル優先。HRV誤分類画面からも可
  respiratoryRate: ["respiration", "rhr", "hrv", "other"],
  // 安静時心拍: 明示「安静時心拍数」優先。HRV/呼吸同居画面からも可
  restingHeartRate: ["rhr", "respiration", "hrv", "other"],
  hrv: ["hrv"],
  hrvMax: ["hrv"],
  // 正: ホーム → 睡眠概要。HRV棒グラフ画面の履歴スコアでは上書きしない
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

  // 皮膚温度は単独画面が多いので先に判定
  if (/皮膚温|体表温|skintemp|体温偏差|温度偏差/.test(joined)) {
    return "skin_temp";
  }
  // ステージ行がある画面は sleep_stages 優先（下部に呼吸速度があってもステージを落さない）
  if (
    /レム睡眠|ノンレム|浅い睡眠|深い睡眠|覚醒時間|覚醒率/.test(joined)
  ) {
    return "sleep_stages";
  }
  // 呼吸・安静時心拍・HRV はストレスより先（同一スクショ誤分類防止）
  if (/呼吸速度/.test(joined)) return "respiration";
  if (/安静時心拍/.test(joined)) return "rhr";
  if (/心拍変動|^hrv$|rmssd|平均hrv|最大hrv|最小hrv/.test(joined)) {
    return "hrv";
  }
  // Vision が「心拍数」+ ms と誤ラベルしても HRV 画面と判定
  if (
    readings.some((r) => {
      const label = (r.label ?? "").normalize("NFKC");
      const value = String(r.value ?? "").normalize("NFKC");
      return (
        /\bms\b|ミリ秒/i.test(value) &&
        /心拍|hrv|rmssd|平均|最大|最小/i.test(label)
      );
    })
  ) {
    return "hrv";
  }
  if (/平均酸素|spo2|spo₂/.test(joined) && !/ストレスモニター/.test(joined)) {
    return "respiration";
  }
  if (
    /ストレス/.test(joined) &&
    !/睡眠効率|睡眠負債|入眠潜時|レム睡眠|浅い睡眠|呼吸速度|安静時心拍|心拍変動/.test(
      joined,
    )
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
  if (/レム睡眠|ノンレム|浅い睡眠|深い睡眠|覚醒時間|覚醒率/.test(joined)) {
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
    if (key === "sleepDuration") {
      return 120;
    }
    if (
      key === "deepSleep" ||
      key === "deepSleepRate" ||
      key === "nonRemSleep" ||
      key === "nonRemSleepRate"
    ) {
      return 110;
    }
    if (key === "respiratoryRate") {
      return 120;
    }
    if (key === "restingHeartRate") {
      return screen === "rhr" ? 120 : 100;
    }
  }

  // ホーム代表値はホーム画面から取れた時点で他画面を上回る
  if (screen === "home" && isHomeAuthoritativeKey(key)) {
    return 120;
  }

  // 安静時心拍: 明示ラベル優先。HRV 同居画面も許容（ホーム最新は弱く）
  if (key === "restingHeartRate") {
    if (screen === "rhr") return 100;
    if (screen === "respiration") return 90;
    if (screen === "hrv") return 70;
    if (screen === "home") return -40;
    return 40;
  }

  // 呼吸速度: 明示ラベル優先。HRV 誤分類画面も許容
  if (key === "respiratoryRate") {
    if (screen === "respiration") return 100;
    if (screen === "rhr") return 85;
    if (screen === "hrv") return 70;
    return 40;
  }

  // 睡眠時間: 概要を優先しつつ、明示「睡眠時間」があれば他画面もソフト許容
  if (key === "sleepDuration") {
    if (screen === "sleep_overview") return 120;
    if (screen === "sleep_detail") return 50;
    return 20;
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
      return "入眠時間 / 起床時間（HH:mm）。潜時・就床・覚醒時間と混同しない";
    case "sleep_detail":
      return "入眠時間 / 起床時間（HH:mm）/ 睡眠時間 / 睡眠効率（%）/ 睡眠負債（時間分）/ 入眠潜時（分）/ 体内時計。潜時・就床と混同しない";
    case "sleep_stages":
      return "覚醒・レム・浅い・深い（ラベル直後の%が率。右端比較は昨日差）。深い睡眠率は深い睡眠行の%のみ / SpO₂。睡眠時間をノンレム・浅いにしない";
    case "home":
    case "sleep_overview":
      return "睡眠スコア（カード行。QoL円・昨日・体調・心拍数と取り違えない）/ 睡眠時間（見出し「睡眠時間」のみ。全就床・ベッド滞在・必要睡眠と取り違えない。値を就寝時刻にしない）";
    case "rhr":
      return "安静時心拍数: 小さめの「平均 NN」と大きめの「最小 NN bpm」を別エントリで返す。平均を最小にしない。最大が見えれば最大も返す";
    case "hrv":
      return "平均酸素レベル / 呼吸速度 / 安静時心拍数の平均・最小 / 平均HRV（ms）/ 最大HRV / 最小HRV。同居スクショでも全部取る。bpmとmsを取り違えない";
    case "respiration":
      return "呼吸速度（rpm）/ 平均酸素レベル（SpO₂）/ 安静時心拍数の平均・最小を別ラベルで。平均酸素を「平均状態」と誤らない";
    case "circadian":
      return "体内時計 / 入眠時間 / 起床時間 / 位相";
    default:
      return "入眠時間 / 起床時間 / 皮膚温度 / ストレス";
  }
}
