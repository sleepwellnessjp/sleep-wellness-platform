import {
  emptyMetrics,
  isMetricPresent,
  normalizeMetrics,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import {
  BEDTIME_EXCLUDE,
  COMPOUND_BED_WAKE_PATTERNS,
  expandLabelCandidates,
  inferKeyFromUnitValue,
  isWeakContextLabel,
  matchCriticalLabel,
  normalizeOcrLabel,
  RECOVERABLE_METRIC_KEYS,
  weakLabelFitsCritical,
  WAKETIME_EXCLUDE,
} from "@/lib/soxai-ocr-dictionary";
import type { SoxaiScreenType } from "@/lib/soxai-screen";
import { normalizeTimeToHHMM } from "@/lib/soxai-structured-metrics";
import { normalizeMetricDisplayValue } from "@/lib/soxai-display-normalize";
import { parseDurationMinutes } from "@/lib/soxai-graphs";

export type VisibleReading = {
  label: string;
  value: string;
};

/** 1画像内でメトリクスへ写したときの出典ラベル */
export type MetricProvenance = Partial<Record<MetricFieldKey, string>>;

export type MappedImageReadings = {
  metrics: AnalysisMetrics;
  provenance: MetricProvenance;
};

type MappingRule = {
  key: MetricFieldKey;
  /** ラベル正規化後にマッチ */
  test: (label: string) => boolean;
  /** 値の形状でさらに絞る（任意） */
  valueHint?: "percent" | "duration" | "time" | "score" | "temp" | "any";
};

export type MapReadingsOptions = {
  screenType?: SoxaiScreenType;
};

function normalizeLabel(label: string): string {
  return normalizeOcrLabel(label);
}

function normalizeValue(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/％/g, "%")
    .replace(/：/g, ":")
    .replace(/°\s*[cｃ]/gi, "℃")
    .replace(/\bBPM\b/g, "bpm")
    .replace(/\bRPM\b/g, "rpm")
    .replace(/\bBRPM\b/g, "brpm")
    .replace(/\bMS\b/g, "ms");
}

function looksPercent(value: string): boolean {
  return /%|％/.test(value) || /^\s*\d{1,3}(\.\d+)?\s*$/.test(value.trim());
}

function looksDuration(value: string): boolean {
  const v = value.normalize("NFKC").trim();
  if (!v || /%|％/.test(v)) return false;
  if (/時間|分|h|hr|min/i.test(v)) return true;
  // 「0:49」「1:15」「6:22」はステージ時間として duration
  if (/^\d{1,2}\s*[:：]\s*\d{2}$/.test(v)) {
    const mins = parseDurationMinutes(v);
    return mins != null && mins >= 0 && mins <= 16 * 60;
  }
  return false;
}

function looksBpm(value: string): boolean {
  return /bpm|拍\/分/i.test(value) || /^\s*\d{2,3}(\.\d+)?\s*$/.test(value.trim());
}

function looksHrvMs(value: string): boolean {
  return /\bms\b|ミリ秒/i.test(value) || /^\s*\d{1,3}(\.\d+)?\s*$/.test(value.trim());
}

function looksRespiratory(value: string): boolean {
  return /\brpm\b|\bbrpm\b|呼吸\/分|回\/分/i.test(value) ||
    /^\s*\d{1,2}(\.\d+)?\s*$/.test(value.trim());
}

/** HH:mm / 23時40分 / 午後11:40 などを時刻と判定 */
export function looksTime(value: string): boolean {
  const v = value.normalize("NFKC").trim();
  if (!v) return false;
  if (/(午前|午後|AM|PM|am|pm)\s*\d{1,2}/.test(v)) return true;
  if (/^\s*\d{1,2}\s*時\s*\d{1,2}\s*分/.test(v)) return true;
  if (/^\s*\d{1,2}\s*時\s*$/.test(v)) return true;
  if (/^\s*\d{1,2}\s*[:：]\s*\d{2}/.test(v)) {
    // 「12分」っぽい短い duration と区別: 分だけの表記は time ではない
    // 時計として妥当な HH:mm
    const normalized = normalizeTimeToHHMM(v);
    return /^\d{2}:\d{2}$/.test(normalized);
  }
  // 正規化後に HH:mm になるか
  const normalized = normalizeTimeToHHMM(v);
  return /^\d{2}:\d{2}$/.test(normalized);
}

/**
 * キーと値の形状が矛盾していないか（取り違え防止）
 * false ならそのマッピングを捨てる
 */
export function valueShapeFitsKey(key: MetricFieldKey, value: string): boolean {
  const v = value.normalize("NFKC").trim();
  if (!v) return false;

  switch (key) {
    case "sleepScore":
    case "qol":
    case "yesterdayQol":
    case "conditionScore":
      return looksScore(v);

    case "bedtime":
    case "wakeTime": {
      const t = extractTimeToken(v) || normalizeTimeToHHMM(v);
      if (!/^\d{2}:\d{2}$/.test(t)) return false;
      // 「12分」「45分」だけの潜時を時刻にしない
      if (/^\d+\s*分/.test(v) && !/[:：]|時/.test(v)) return false;
      return true;
    }

    case "sleepDuration":
    case "remSleep":
    case "lightSleep":
    case "deepSleep":
    case "awakenings":
    case "sleepDebt":
    case "sleepLatency":
      if (looksPercent(v) && !looksDuration(v)) return false;
      return looksDuration(v) || parseDurationMinutes(v) != null;

    case "sleepEfficiency":
    case "awakeningRate":
    case "remSleepRate":
    case "lightSleepRate":
    case "deepSleepRate":
    case "spo2":
      if (looksDuration(v) && !/%|％/.test(v)) return false;
      return looksPercent(v);

    case "skinTemperature":
      return looksSkinTemperature(v);

    case "restingHeartRate":
      return looksBpm(v);

    case "hrv":
      return looksHrvMs(v);

    case "respiratoryRate":
      return looksRespiratory(v);

    case "stress":
      return /^\s*\d{1,3}(\.\d+)?/.test(v);

    default:
      return true;
  }
}

function looksScore(value: string): boolean {
  const n = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 && n <= 100;
}

/** 皮膚温度（絶対値 36.x℃ または差分 ±0.x） */
export function looksSkinTemperature(value: string): boolean {
  const v = normalizeSkinTemperatureValue(value);
  if (!v) return false;
  if (/^[+-]\s*\d+(\.\d+)?\s*℃?$/i.test(v)) return true;
  if (/\d+(\.\d+)?\s*℃/i.test(v)) return true;
  // SOXAIは単位なしの +0.2 / -0.1 を出すことがある
  if (/^[+-]\s*\d+(\.\d+)?$/.test(v)) {
    const n = Math.abs(Number(v.replace(/[^\d.-]/g, "")));
    return Number.isFinite(n) && n <= 5;
  }
  // 絶対値（単位なし）36〜38 付近
  const abs = Number(v.replace(/[^\d.-]/g, ""));
  if (Number.isFinite(abs) && abs >= 34 && abs <= 39) return true;
  return false;
}

/** NFKC で ℃ → °C に分解されるため、表示単位を ℃ に戻す */
export function normalizeSkinTemperatureValue(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/°\s*[cｃ]/gi, "℃")
    .replace(/\s+/g, " ");
}

function parseSleepScore(value: string): number | null {
  const n = Number(value.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return null;
  if (n < 0 || n > 100) return null;
  return n;
}

/**
 * SOXAIラベル → metrics キー
 * より具体的なルールを先に書く（入眠潜時 > 入眠、レム睡眠時間 > 睡眠時間 など）
 */
const MAPPING_RULES: MappingRule[] = [
  // —— ホーム画面カード ——
  {
    key: "sleepScore",
    test: (l) =>
      /睡眠スコア|sleepscore|総合スコア|昨夜のスコア|本日の睡眠/.test(l) ||
      /^睡眠$/.test(l) ||
      (/^スコア$|^score$/.test(l) &&
        !/qol|昨日|体調|コンディション|condition/.test(l)),
    valueHint: "score",
  },
  {
    key: "qol",
    test: (l) =>
      /^qol$/.test(l) ||
      /qualityoflife|現在のqol|きょうのqol|今日のqol|現在のスコア|クオリティオブライフ/.test(
        l,
      ),
    valueHint: "score",
  },
  {
    key: "yesterdayQol",
    test: (l) =>
      /昨日のqol|昨日のスコア|昨日スコア|きのうのスコア|きのうのqol|yesterdayqol|yesterdayscore/.test(
        l,
      ),
    valueHint: "score",
  },
  {
    key: "conditionScore",
    test: (l) =>
      /^体調$/.test(l) ||
      /体調スコア|コンディションスコア|conditionscore|^コンディション$|^condition$/.test(
        l,
      ),
    valueHint: "score",
  },
  {
    key: "restingHeartRate",
    test: (l) =>
      (/安静時心拍|心拍数|^心拍$|^hr$|^rhr$|restinghr|restingheartrate|heartrate|平均心拍|^bpm$/.test(
        l,
      ) &&
        !/変動|hrv|rmssd|sdnn/.test(l)),
  },
  {
    key: "hrv",
    test: (l) =>
      (/^hrv$|心拍変動|rmssd|sdnn|heartratevariability|heart rate variability/.test(
        l,
      ) &&
        !/最小|最大|min|max/.test(l)) ||
      (/心拍変動|hrv/.test(l) && /平均|avg|mean/.test(l)),
  },
  // —— ステージ詳細（睡眠時間より先に判定）——
  {
    key: "awakeningRate",
    test: (l) =>
      /覚醒率|awake%|awakepercent|覚醒割合|覚醒%|覚醒％|^覚醒$/.test(l) &&
      !/時間|中途/.test(l),
    valueHint: "percent",
  },
  {
    key: "awakenings",
    test: (l) =>
      /覚醒時間|中途覚醒|覚醒の時間|^覚醒$|^awake$|awaketime|中途覚醒時間/.test(
        l,
      ),
  },
  {
    key: "remSleepRate",
    test: (l) =>
      /レム睡眠率|レム率|rem率|rem%|rempercent|レム割合|レム%|レム％/.test(l),
    valueHint: "percent",
  },
  {
    key: "remSleep",
    test: (l) =>
      /レム睡眠時間|レム時間|rem時間|レム睡眠|^レム$|^rem$|remsleep/.test(l) &&
      !/率|percent|割合/.test(l),
    valueHint: "duration",
  },
  {
    key: "lightSleepRate",
    test: (l) =>
      /浅い睡眠率|light%|lightpercent|浅い割合|浅い%|浅い％|浅%|^浅い$/.test(l),
    valueHint: "percent",
  },
  {
    key: "lightSleep",
    test: (l) =>
      /浅い睡眠時間|浅い時間|light時間|浅い睡眠|^浅い$|^light$|lightsleep/.test(
        l,
      ) && !/率|percent|割合/.test(l),
    valueHint: "duration",
  },
  {
    key: "deepSleepRate",
    test: (l) =>
      /深い睡眠率|deep%|deeppercent|深い割合|深い%|深い％|深%|^深い$/.test(l),
    valueHint: "percent",
  },
  {
    key: "deepSleep",
    test: (l) =>
      /深い睡眠時間|深い時間|deep時間|深い睡眠|^深い$|^deep$|deepsleep/.test(
        l,
      ) && !/率|percent|割合/.test(l),
    valueHint: "duration",
  },
  // —— 総睡眠（レム/浅い/深い を除外）——
  {
    key: "sleepDuration",
    test: (l) =>
      (/睡眠時間|総睡眠|totalsleep|実際の睡眠|総睡眠時間|^睡眠$|sleeptime|sleepduration/.test(
        l,
      ) ||
        (/sleep/.test(l) && /duration|total/.test(l))) &&
      !/レム|rem|浅い|light|深い|deep|負債|効率|スコア|潜時|全就床|就床/.test(l),
    valueHint: "duration",
  },
  {
    key: "sleepLatency",
    test: (l) =>
      /入眠潜時|潜時|latency|sleeplatency|入眠までの時間|入眠にかかった時間/.test(
        l,
      ),
    valueHint: "duration",
  },
  {
    key: "bedtime",
    test: (l) =>
      matchCriticalLabel(l) === "bedtime" ||
      ((/入眠時間|入眠時刻|入眠した時刻|入眠した時間|睡眠開始時刻|睡眠開始時間|睡眠開始|眠り始め|fellasleep|sleeponset|sleepstart|asleepat|^入眠$|^就寝$|就寝時刻|就寝時間/.test(
        l,
      ) ||
        (/bedtime|sleeponset|sleepstart|asleep/.test(l) &&
          !BEDTIME_EXCLUDE.test(l))) &&
        !BEDTIME_EXCLUDE.test(l)),
    valueHint: "time",
  },
  {
    key: "wakeTime",
    test: (l) =>
      matchCriticalLabel(l) === "wakeTime" ||
      ((/起床時間|起床時刻|起床した時刻|起床した時間|起きた時刻|起きた時間|目覚め|^起床$|睡眠終了|睡眠終了時刻|睡眠終了時間|gotup|waketime|wakeuptime|^rise$/.test(
        l,
      ) ||
        (/^wake$|wakeup|waketime/.test(l) && !WAKETIME_EXCLUDE.test(l))) &&
        !WAKETIME_EXCLUDE.test(l)),
    valueHint: "time",
  },
  {
    key: "sleepEfficiency",
    test: (l) => /睡眠効率|sleepefficiency|efficiency|^効率$/.test(l),
    valueHint: "percent",
  },
  {
    key: "sleepDebt",
    test: (l) => /睡眠負債|sleepdebt|^負債$|睡眠の負債/.test(l),
    valueHint: "duration",
  },
  {
    key: "circadianRhythm",
    test: (l) => /体内時計|circadian|クロノ|位相|サーカディアン/.test(l),
  },
  {
    key: "respiratoryRate",
    test: (l) =>
      /呼吸速度|呼吸数|respiratory|respiration|平均呼吸|^呼吸$|^brpm$|^rpm$|呼吸rpm/.test(
        l,
      ),
  },
  {
    key: "spo2",
    test: (l) =>
      /spo2|spo₂|血中酸素|酸素飽和|酸素飽和度|血中酸素濃度|酸素レベル|平均酸素|平均spo|平均酸素レベル/.test(
        l,
      ),
    valueHint: "percent",
  },
  {
    key: "skinTemperature",
    test: (l) =>
      matchCriticalLabel(l) === "skinTemperature" ||
      (/皮膚温度|皮膚温|皮虜温|皮虜温度|スキンテンプ|体表温|体表温度|skintemperature|skintemp|体温偏差|体温差|皮膚温度偏差|温度偏差|delta温度|温度delta|ベースライン偏差|baseline偏差|平均皮膚温/.test(
        l,
      ) &&
        !/環境|室温|気温|天候/.test(l)),
    valueHint: "temp",
  },
  {
    key: "stress",
    test: (l) =>
      matchCriticalLabel(l) === "stress" ||
      /^ストレス$|^stress$|ストレスレベル|ストレス指数|ストレススコア|ストレス値|ストレス度|ストレス平均|平均ストレス|現在のストレス|夜間ストレス|ストレスモニター|ストレス平均|stresslevel|stressscore|stressindex|stressavg|averagestress|stressaverage/.test(
        l,
      ),
  },
];

function labelMatchesRule(
  rule: MappingRule,
  label: string,
): boolean {
  const candidates = expandLabelCandidates(label);
  return candidates.some((normalized) => rule.test(normalized));
}

function matchKey(
  label: string,
  value: string,
  siblingLabels: string[] = [],
): MetricFieldKey | null {
  for (const rule of MAPPING_RULES) {
    if (!labelMatchesRule(rule, label)) continue;

    if (rule.valueHint === "score" && !looksScore(value)) {
      if (rule.key === "sleepScore" && looksDuration(value)) {
        return "sleepDuration";
      }
      continue;
    }
    if (
      rule.valueHint === "percent" &&
      !looksPercent(value) &&
      looksDuration(value)
    ) {
      continue;
    }
    if (
      rule.valueHint === "duration" &&
      looksPercent(value) &&
      !looksDuration(value)
    ) {
      if (rule.key === "remSleep") return "remSleepRate";
      if (rule.key === "lightSleep") return "lightSleepRate";
      if (rule.key === "deepSleep") return "deepSleepRate";
      if (rule.key === "awakenings") return "awakeningRate";
      continue;
    }
    if (rule.key === "awakenings" && looksPercent(value) && !looksDuration(value)) {
      return "awakeningRate";
    }
    if (
      rule.key === "remSleep" &&
      looksPercent(value) &&
      !looksDuration(value)
    ) {
      return "remSleepRate";
    }
    if (
      rule.key === "lightSleep" &&
      looksPercent(value) &&
      !looksDuration(value)
    ) {
      return "lightSleepRate";
    }
    if (
      rule.key === "deepSleep" &&
      looksPercent(value) &&
      !looksDuration(value)
    ) {
      return "deepSleepRate";
    }
    if (rule.valueHint === "time" && !looksTime(value)) {
      // 「入眠 23:40」のような複合値から時刻だけ取り出す
      const extracted = extractTimeToken(value);
      if (!extracted) continue;
    }
    if (rule.valueHint === "temp" && !looksSkinTemperature(value)) {
      // ラベルが皮膚温でも値が見えない場合はスキップ
      continue;
    }

    // 最終ゲート: キーと値形状の取り違えを防ぐ
    const candidateValue =
      rule.valueHint === "time" && !looksTime(value)
        ? extractTimeToken(value)
        : value;
    if (!valueShapeFitsKey(rule.key, candidateValue)) {
      continue;
    }

    return rule.key;
  }

  // 弱ラベル / 単位付き数値のみ → 周辺ラベルから推定
  if (!normalizeLabel(label) || isWeakContextLabel(label)) {
    const inferred = inferKeyFromUnitValue(value, siblingLabels);
    if (inferred && valueShapeFitsKey(inferred, value)) {
      return inferred;
    }
  }

  // ラベルが単位っぽい（bpm / ms / rpm / ℃）で値が数値の場合も推定
  const unitAsLabel = inferKeyFromUnitValue(label, siblingLabels);
  if (unitAsLabel && /^\s*[+-]?\d+(\.\d+)?/.test(value)) {
    const combined = `${value} ${label}`;
    if (valueShapeFitsKey(unitAsLabel, combined)) {
      return unitAsLabel;
    }
  }

  const fromValueUnit = inferKeyFromUnitValue(value, [
    ...siblingLabels,
    label,
  ]);
  if (
    fromValueUnit &&
    valueShapeFitsKey(fromValueUnit, value) &&
    (isWeakContextLabel(label) ||
      /平均|現在|偏差|avg|mean|値/.test(normalizeLabel(label)))
  ) {
    return fromValueUnit;
  }

  return null;
}

/** 文字列から最初の時刻トークンを HH:mm で返す */
export function extractTimeToken(value: string): string {
  const normalized = normalizeTimeToHHMM(value);
  if (/^\d{2}:\d{2}$/.test(normalized)) return normalized;

  const text = value.normalize("NFKC");
  const hm = text.match(/(\d{1,2})\s*[:：]\s*(\d{2})/);
  if (hm) {
    return normalizeTimeToHHMM(`${hm[1]}:${hm[2]}`);
  }
  const jp = text.match(/(\d{1,2})\s*時\s*(\d{1,2})\s*分/);
  if (jp) {
    return normalizeTimeToHHMM(`${jp[1]}時${jp[2]}分`);
  }
  return "";
}

/**
 * 1つの reading（label+value）や複合テキストから重点4項目を抽出
 */
export function extractCriticalFromCompoundText(
  label: string,
  value: string,
): Partial<Record<"bedtime" | "wakeTime" | "skinTemperature" | "stress", string>> {
  const out: Partial<
    Record<"bedtime" | "wakeTime" | "skinTemperature" | "stress", string>
  > = {};
  const blob = `${label} ${value}`.normalize("NFKC");

  for (const pattern of COMPOUND_BED_WAKE_PATTERNS) {
    const re = new RegExp(
      `${pattern.labelRe.source}\\s*(\\d{1,2}\\s*[:：]\\s*\\d{2}|\\d{1,2}\\s*時\\s*\\d{1,2}\\s*分?)`,
      "i",
    );
    const m = blob.match(re);
    if (m?.[1]) {
      const t = extractTimeToken(m[1]);
      if (t) out[pattern.key] = t;
    }
  }

  // 「23:40 - 06:20」や「23:40〜6:20」形式（ラベルが睡眠時間帯）
  if (!out.bedtime || !out.wakeTime) {
    const range = blob.match(
      /(\d{1,2}\s*[:：]\s*\d{2})\s*[-~〜～–—]\s*(\d{1,2}\s*[:：]\s*\d{2})/,
    );
    if (range) {
      const a = extractTimeToken(range[1]);
      const b = extractTimeToken(range[2]);
      if (a && b) {
        // 夜側を入眠、朝側を起床とみなす
        const aHour = Number(a.slice(0, 2));
        const bHour = Number(b.slice(0, 2));
        if (aHour >= 18 || aHour <= 5) {
          if (!out.bedtime) out.bedtime = a;
          if (!out.wakeTime) out.wakeTime = b;
        } else if (bHour >= 18 || bHour <= 5) {
          if (!out.bedtime) out.bedtime = b;
          if (!out.wakeTime) out.wakeTime = a;
        } else {
          if (!out.bedtime) out.bedtime = a;
          if (!out.wakeTime) out.wakeTime = b;
        }
      }
    }
  }

  return out;
}

/**
 * 同一キーに複数ラベルが当たったときの優先度（高いほど採用）。
 * ラベル一致の質で決める。
 */
export function labelMatchScore(key: MetricFieldKey, label: string): number {
  const l = normalizeLabel(label);
  if (!l) return 0;

  switch (key) {
    case "sleepScore":
      if (/睡眠スコア|sleepscore|総合スコア/.test(l)) return 100;
      if (/^睡眠$/.test(l)) return 55;
      if (/^スコア$|^score$/.test(l)) return 35;
      return 20;

    case "restingHeartRate":
      if (/安静時心拍/.test(l) && /平均|avg|average|mean/.test(l)) return 110;
      if (/安静時心拍/.test(l) && /(最小|min|最大|max)/.test(l)) return 25;
      if (/安静時心拍|restinghr|restingheartrate|^rhr$/.test(l)) return 100;
      if (/心拍数|heartrate|^心拍$|^hr$/.test(l)) return 50;
      return 20;

    case "sleepDuration":
      if (/総睡眠|totalsleep|実際の睡眠/.test(l)) return 110;
      if (/睡眠時間/.test(l) && !/レム|rem|浅い|light|深い|deep/.test(l))
        return 100;
      if (/^睡眠$/.test(l)) return 45;
      return 20;

    case "remSleep":
      if (/レム睡眠時間|レム時間|rem時間/.test(l)) return 100;
      if (/レム睡眠|remsleep|^レム$|^rem$/.test(l)) return 80;
      return 20;

    case "lightSleep":
      if (/浅い睡眠時間|浅い時間|light時間/.test(l)) return 100;
      if (/浅い睡眠|lightsleep|^light$/.test(l)) return 80;
      return 20;

    case "deepSleep":
      if (/深い睡眠時間|深い時間|deep時間/.test(l)) return 100;
      if (/深い睡眠|deepsleep|^deep$/.test(l)) return 80;
      return 20;

    case "awakenings":
      if (/覚醒時間|awaketime|中途覚醒/.test(l)) return 100;
      if (/^覚醒$|^awake$/.test(l)) return 60;
      return 20;

    case "sleepLatency":
      if (/入眠潜時|sleeplatency/.test(l)) return 100;
      if (/潜時|latency/.test(l)) return 80;
      return 20;

    case "bedtime":
      if (
        /入眠時間|入眠時刻|睡眠開始時刻|sleeponset|fellasleep|入眠した時刻|asleepat|sleepstart/.test(
          l,
        )
      )
        return 110;
      if (/^入眠$|睡眠開始|^就寝$|就寝時刻|就寝時間/.test(l) && !/予定|目標/.test(l))
        return 95;
      if (/bedtime|sleeponset|sleepstart|asleep/.test(l) && !/latency|潜時/.test(l))
        return 70;
      if (/^開始$|開始時刻|開始時間/.test(l)) return 45;
      if (/就寝/.test(l) && !/予定|目標/.test(l)) return 40;
      if (/就床|全就床/.test(l)) return 5;
      return 20;

    case "wakeTime":
      if (/起床時間|起床時刻|睡眠終了|waketime|gotup|起床した時刻|wakeuptime/.test(l))
        return 110;
      if (/^起床$|^wake$|wakeup|^rise$/.test(l) && !/awake|覚醒/.test(l)) return 90;
      if (/^終了$|終了時刻|終了時間/.test(l)) return 45;
      if (/覚醒時間|中途覚醒|awake/.test(l)) return 5;
      return 20;

    case "skinTemperature":
      if (/皮膚温度|皮膚温|体表温|skintemp/.test(l) && /平均|avg|mean/.test(l))
        return 115;
      if (/皮膚温度|皮膚温|体表温|skintemperature|skintemp|平均皮膚温/.test(l))
        return 110;
      if (/体温偏差|温度偏差|ベースライン偏差|tempdeviation|baseline/.test(l))
        return 100;
      if (/^平均$|^現在$|^偏差$|^avg$|^delta$/.test(l)) return 55;
      return 20;

    case "stress":
      if (/ストレス平均|平均ストレス|stress.*avg|avg.*stress|averagestress/.test(l))
        return 115;
      if (/ストレスレベル|stresslevel|ストレス度|ストレス指数/.test(l)) return 100;
      if (/^ストレス$|^stress$|ストレス値|ストレススコア|stressscore/.test(l))
        return 95;
      if (/ストレスモニター/.test(l)) return 70;
      if (/^平均$|^現在$|^avg$|^レベル$|^level$/.test(l)) return 50;
      return 20;

    case "hrv":
      if (/心拍変動/.test(l) && /平均|avg|average|mean/.test(l)) return 110;
      if (/心拍変動|hrv|rmssd|sdnn/.test(l) && /(最小|min|最大|max)/.test(l))
        return 25;
      if (/^hrv$|心拍変動|rmssd|sdnn/.test(l)) return 100;
      return 20;

    default:
      // ラベルが空でなく、キー名っぽい語を含めば加点
      if (l.length >= 2) return 40;
      return 10;
  }
}

/**
 * 画面種別スコア（詳細 > 概要）。高いほどその画面の値を優先。
 */
export function screenTypeScore(
  readings: VisibleReading[],
  key: MetricFieldKey,
): number {
  const labels = readings.map((r) => normalizeLabel(r.label));
  const joined = labels.join("|");

  const isHomeOverview =
    labels.some((l) => /^qol$|昨日のqol|昨日のスコア/.test(l)) &&
    labels.some((l) => /^睡眠$|睡眠スコア|体調|心拍数/.test(l));

  const isSleepDetail =
    /睡眠時間|睡眠効率|睡眠負債|入眠潜時|体内時計|全就床/.test(joined);

  const isStageDetail =
    /レム睡眠|浅い睡眠|深い睡眠|覚醒時間|覚醒率|平均酸素/.test(joined);

  const isVitalsDetail =
    /安静時心拍|心拍変動|^hrv$|皮膚温|呼吸速度|ストレス/.test(joined);

  const isChartFragment =
    labels.some((l) => /^平均$|^最大$|^最小$|^avg$|^max$|^min$/.test(l)) &&
    readings.length <= 8 &&
    !isSleepDetail &&
    !isStageDetail &&
    !isHomeOverview;

  let score = 40;

  if (isHomeOverview) score = 50;
  if (isSleepDetail) score = 85;
  if (isStageDetail) score = 90;
  if (isVitalsDetail) score = 90;
  if (isChartFragment) score = 15;

  // キー別の画面適合（ホーム代表値はホームを最優先）
  if (key === "sleepScore") {
    if (isHomeOverview && labels.some((l) => /^睡眠$|睡眠スコア/.test(l))) {
      score += 80;
    } else if (
      labels.some((l) => /睡眠スコア|sleepscore/.test(l)) &&
      !isChartFragment
    ) {
      score += 40;
    }
    if (isChartFragment) score -= 50;
  }

  if (key === "sleepDuration") {
    if (isHomeOverview) score += 50;
    if (isSleepDetail) score += 35;
    if (isStageDetail) score -= 25; // ステージ画面の「○睡眠時間」は総睡眠ではない
  }

  if (key === "restingHeartRate") {
    if (isVitalsDetail) score += 35;
    if (isHomeOverview) score += 15;
    if (labels.some((l) => /安静時心拍/.test(l))) score += 20;
  }

  if (
    key === "remSleep" ||
    key === "lightSleep" ||
    key === "deepSleep" ||
    key === "awakenings" ||
    key === "remSleepRate" ||
    key === "lightSleepRate" ||
    key === "deepSleepRate" ||
    key === "awakeningRate"
  ) {
    if (isStageDetail) score += 30;
  }

  if (
    key === "sleepEfficiency" ||
    key === "sleepDebt" ||
    key === "sleepLatency" ||
    key === "circadianRhythm"
  ) {
    if (isSleepDetail) score += 30;
  }

  if (key === "bedtime" || key === "wakeTime") {
    if (isSleepDetail) score += 40;
    if (/入眠時間|起床時間|睡眠開始|睡眠終了/.test(joined)) score += 35;
    if (isStageDetail) score -= 35; // hypnogram端点と混同しやすい
    if (isHomeOverview) score -= 20;
    if (isChartFragment) score -= 40;
  }

  if (key === "skinTemperature") {
    if (/皮膚温|体表温|体温偏差|温度偏差/.test(joined)) score += 50;
    if (isVitalsDetail) score += 25;
    if (isHomeOverview) score -= 20;
  }

  if (key === "stress") {
    if (/ストレス/.test(joined)) score += 45;
    if (isVitalsDetail || /ストレスモニター/.test(joined)) score += 25;
    if (isHomeOverview) score -= 15;
  }

  return score;
}

/**
 * 画面種別コンテキストでの追加マッピング（辞書に載らない「平均」「偏差」など）
 */
function applyScreenContextFallbacks(
  readings: VisibleReading[],
  screenType: SoxaiScreenType | undefined,
  next: AnalysisMetrics,
  provenance: MetricProvenance,
  bestLabelScore: Partial<Record<MetricFieldKey, number>>,
): void {
  const siblingLabels = readings.map((r) => r.label);

  const trySet = (
    key: MetricFieldKey,
    label: string,
    value: string,
    score: number,
  ) => {
    const prev = bestLabelScore[key] ?? -1;
    if (score <= prev) return;
    if (key === "sleepScore") return;
    let stored = value;
    if (key === "bedtime" || key === "wakeTime") {
      stored = extractTimeToken(value) || normalizeTimeToHHMM(value);
      if (!/^\d{2}:\d{2}$/.test(stored)) return;
    }
    if (key === "skinTemperature") {
      stored = normalizeSkinTemperatureValue(value);
    }
    next[key] = stored;
    provenance[key] = label;
    bestLabelScore[key] = score;
  };

  // 複合テキストから入眠・起床を優先抽出
  for (const reading of readings) {
    const compound = extractCriticalFromCompoundText(
      reading.label ?? "",
      reading.value ?? "",
    );
    if (compound.bedtime && !String(next.bedtime).trim()) {
      trySet("bedtime", reading.label || "複合:入眠", compound.bedtime, 85);
    }
    if (compound.wakeTime && !String(next.wakeTime).trim()) {
      trySet("wakeTime", reading.label || "複合:起床", compound.wakeTime, 85);
    }
  }

  if (screenType === "skin_temp" && !String(next.skinTemperature).trim()) {
    for (const reading of readings) {
      const label = reading.label?.trim() ?? "";
      const value = normalizeValue(reading.value ?? "");
      if (!label || !value || !looksSkinTemperature(value)) continue;
      const l = normalizeLabel(label);
      if (
        /皮膚|体表|温度|偏差|平均|現在|avg|mean|delta|temp/.test(l) ||
        /^[+-]/.test(value) ||
        weakLabelFitsCritical("skinTemperature", label, siblingLabels)
      ) {
        trySet(
          "skinTemperature",
          label,
          value,
          labelMatchScore("skinTemperature", label) || 60,
        );
        break;
      }
    }
  }

  // 画面種別が other でも、兄弟ラベルに皮膚温があれば弱ラベルを採用
  if (!String(next.skinTemperature).trim()) {
    for (const reading of readings) {
      const label = reading.label?.trim() ?? "";
      const value = normalizeValue(reading.value ?? "");
      if (!label || !value || !looksSkinTemperature(value)) continue;
      if (
        matchCriticalLabel(label) === "skinTemperature" ||
        weakLabelFitsCritical("skinTemperature", label, siblingLabels)
      ) {
        trySet(
          "skinTemperature",
          label,
          value,
          labelMatchScore("skinTemperature", label) || 58,
        );
        break;
      }
    }
  }

  if (screenType === "stress" && !String(next.stress).trim()) {
    for (const reading of readings) {
      const label = reading.label?.trim() ?? "";
      const value = normalizeValue(reading.value ?? "");
      if (!label || !value) continue;
      const l = normalizeLabel(label);
      if (
        /ストレス|stress|平均|現在|レベル|avg|mean|level/.test(l) ||
        weakLabelFitsCritical("stress", label, siblingLabels)
      ) {
        if (looksTime(value) && !looksScore(value)) continue;
        trySet("stress", label, value, labelMatchScore("stress", label) || 55);
        break;
      }
    }
  }

  if (!String(next.stress).trim()) {
    for (const reading of readings) {
      const label = reading.label?.trim() ?? "";
      const value = normalizeValue(reading.value ?? "");
      if (!label || !value) continue;
      if (looksTime(value) && !looksScore(value)) continue;
      if (
        matchCriticalLabel(label) === "stress" ||
        weakLabelFitsCritical("stress", label, siblingLabels)
      ) {
        trySet("stress", label, value, labelMatchScore("stress", label) || 55);
        break;
      }
    }
  }

  if (
    (screenType === "bed_wake" || screenType === "sleep_detail") &&
    (!String(next.bedtime).trim() || !String(next.wakeTime).trim())
  ) {
    for (const reading of readings) {
      const label = reading.label?.trim() ?? "";
      const value = normalizeValue(reading.value ?? "");
      if (!label || !value) continue;
      const time = extractTimeToken(value);
      if (!time) continue;
      const l = normalizeLabel(label);
      if (
        !next.bedtime.trim() &&
        (/入眠|睡眠開始|onset|fellasleep|bedtime|就寝|開始/.test(l) &&
          !/潜時|latency|就床|覚醒|予定|目標/.test(l))
      ) {
        trySet("bedtime", label, time, labelMatchScore("bedtime", label) || 70);
      }
      if (
        !next.wakeTime.trim() &&
        (/起床|睡眠終了|gotup|wakeup|waketime|終了|^rise$/.test(l) &&
          !/覚醒時間|中途|awake|率/.test(l))
      ) {
        trySet("wakeTime", label, time, labelMatchScore("wakeTime", label) || 70);
      }
    }
  }
}

/**
 * visibleReadings → metrics + 出典ラベル
 * 同一キーはラベル一致スコアが高い方を採用（first-wins しない）
 */
export function mapVisibleReadingsToMetricsDetailed(
  readings: VisibleReading[],
  options?: MapReadingsOptions,
): MappedImageReadings {
  const next = emptyMetrics();
  const provenance: MetricProvenance = {};
  const bestLabelScore: Partial<Record<MetricFieldKey, number>> = {};
  const mappedLabels: string[] = [];
  const skippedLabels: string[] = [];
  const screenType = options?.screenType;
  const siblingLabelsForMap = readings.map((r) => r.label?.trim() ?? "").filter(Boolean);

  for (const reading of readings) {
    const label = reading.label?.trim() ?? "";
    const value = normalizeValue(reading.value ?? "");
    if (!value) continue;
    // 数値のみ（ラベル空）も周辺ラベルから推定するため通す
    if (!label && !/^\s*[+-]?\d/.test(value) && !looksTime(value)) continue;

    const key = matchKey(label, value, siblingLabelsForMap);
    if (!key) {
      skippedLabels.push(label || `(value:${value})`);
      continue;
    }

    // ステージ画面の端点時刻を入眠・起床に誤マップしない
    if (
      screenType === "sleep_stages" &&
      (key === "bedtime" || key === "wakeTime")
    ) {
      skippedLabels.push(`${label}(blocked:${screenType})`);
      continue;
    }

    // 体内時計・概要・ホームから入眠・起床を採らない（bed_wake / sleep_detail を正とする）
    if (
      (key === "bedtime" || key === "wakeTime") &&
      (screenType === "circadian" ||
        screenType === "sleep_overview" ||
        screenType === "home" ||
        screenType === "stress" ||
        screenType === "skin_temp" ||
        screenType === "rhr" ||
        screenType === "hrv" ||
        screenType === "respiration")
    ) {
      skippedLabels.push(`${label}(blocked:${screenType})`);
      continue;
    }

    // 睡眠スコアはホーム／睡眠概要のみ（詳細・ステージ等では採らない）
    if (
      key === "sleepScore" &&
      screenType !== "home" &&
      screenType !== "sleep_overview" &&
      screenType !== "other" &&
      screenType != null
    ) {
      skippedLabels.push(`${label}(blocked:${screenType}:sleepScore)`);
      continue;
    }

    // ホーム画面から皮膚温・ストレスを取らない（専用画面を待つ）
    if (
      screenType === "home" &&
      (key === "skinTemperature" || key === "stress")
    ) {
      const score = labelMatchScore(key, label);
      if (score < 90) {
        skippedLabels.push(`${label}(blocked:home)`);
        continue;
      }
    }

    const matchScore = labelMatchScore(key, label);

    if (key === "sleepScore") {
      const score = parseSleepScore(value);
      if (score == null) {
        skippedLabels.push(label);
        continue;
      }
      const prev = bestLabelScore.sleepScore ?? -1;
      if (matchScore > prev) {
        next.sleepScore = score;
        provenance.sleepScore = label;
        bestLabelScore.sleepScore = matchScore;
        mappedLabels.push(`${label}→sleepScore`);
      }
      continue;
    }

    const prev = bestLabelScore[key] ?? -1;
    if (matchScore > prev || (matchScore === prev && !next[key]?.trim())) {
      if (key === "bedtime" || key === "wakeTime") {
        const time = extractTimeToken(value) || normalizeTimeToHHMM(value);
        if (!/^\d{2}:\d{2}$/.test(time)) {
          skippedLabels.push(`${label}(invalid-time)`);
          continue;
        }
        next[key] = time;
      } else if (key === "skinTemperature") {
        next[key] = normalizeSkinTemperatureValue(value);
      } else {
        // 時間・割合などの表記を統一（推測補完はしない）
        next[key] = normalizeMetricDisplayValue(key, value);
      }
      provenance[key] = label;
      bestLabelScore[key] = matchScore;
      mappedLabels.push(`${label}→${key}`);
    }
  }

  applyScreenContextFallbacks(
    readings,
    screenType,
    next,
    provenance,
    bestLabelScore,
  );

  if (process.env.NODE_ENV === "development") {
    console.info("[soxai-reading-map] mapped", {
      screenType: screenType ?? null,
      input: readings.length,
      mapped: mappedLabels,
      skipped: skippedLabels,
      provenance,
      critical: {
        bedtime: next.bedtime,
        wakeTime: next.wakeTime,
        skinTemperature: next.skinTemperature,
        stress: next.stress,
      },
    });
  }

  return {
    metrics: normalizeMetrics(next),
    provenance,
  };
}

export function mapVisibleReadingsToMetrics(
  readings: VisibleReading[],
): AnalysisMetrics {
  return mapVisibleReadingsToMetricsDetailed(readings).metrics;
}

/**
 * 全画像の visibleReadings から重点4項目だけを再マッピングして不足を埋める。
 * 画面種別ヒントがある場合はそれを優先コンテキストにする。
 */
export function recoverCriticalMetricsFromReadings(
  readings: VisibleReading[],
  screenHints: SoxaiScreenType[] = [],
): AnalysisMetrics {
  const preferred =
    screenHints.find((s) =>
      ["bed_wake", "sleep_detail", "skin_temp", "stress"].includes(s),
    ) ??
    screenHints[0] ??
    inferBestScreenHint(readings);

  const mapped = mapVisibleReadingsToMetricsDetailed(readings, {
    screenType: preferred,
  });

  // さらに複合抽出を全体 blob に対して実行
  const next = { ...mapped.metrics };
  for (const reading of readings) {
    const compound = extractCriticalFromCompoundText(
      reading.label ?? "",
      reading.value ?? "",
    );
    if (!next.bedtime.trim() && compound.bedtime) next.bedtime = compound.bedtime;
    if (!next.wakeTime.trim() && compound.wakeTime) {
      next.wakeTime = compound.wakeTime;
    }
  }

  // 画面ゲートなしの ungated パス（誤判定でブロックされた critical を救済）
  if (
    !next.bedtime.trim() ||
    !next.wakeTime.trim() ||
    !String(next.skinTemperature).trim() ||
    !String(next.stress).trim()
  ) {
    const ungated = mapVisibleReadingsToMetricsDetailed(readings, {
      screenType: "other",
    });
    if (!next.bedtime.trim() && ungated.metrics.bedtime.trim()) {
      next.bedtime = ungated.metrics.bedtime;
    }
    if (!next.wakeTime.trim() && ungated.metrics.wakeTime.trim()) {
      next.wakeTime = ungated.metrics.wakeTime;
    }
    if (
      !String(next.skinTemperature).trim() &&
      ungated.metrics.skinTemperature.trim()
    ) {
      next.skinTemperature = ungated.metrics.skinTemperature;
    }
    if (!String(next.stress).trim() && ungated.metrics.stress.trim()) {
      next.stress = ungated.metrics.stress;
    }
  }

  // 全 readings を1 blob として複合抽出
  if (!next.bedtime.trim() || !next.wakeTime.trim()) {
    const blob = readings
      .map((r) => `${r.label ?? ""} ${r.value ?? ""}`)
      .join(" / ");
    const compound = extractCriticalFromCompoundText("睡眠", blob);
    if (!next.bedtime.trim() && compound.bedtime) next.bedtime = compound.bedtime;
    if (!next.wakeTime.trim() && compound.wakeTime) {
      next.wakeTime = compound.wakeTime;
    }
  }

  return normalizeMetrics(next);
}

/**
 * 不足している全メトリクスを、画面ゲートを緩めた再マッピングで埋める。
 * 既存値は上書きしない。
 */
export function recoverMissingMetricsFromReadings(
  current: AnalysisMetrics,
  readings: VisibleReading[],
): AnalysisMetrics {
  if (readings.length === 0) return current;

  const next = { ...current };
  const screens: Array<SoxaiScreenType | undefined> = [
    "other",
    "home",
    "sleep_detail",
    "sleep_stages",
    "bed_wake",
    "skin_temp",
    "stress",
    "hrv",
    "rhr",
    "respiration",
    undefined,
  ];

  for (const screenType of screens) {
    const mapped = mapVisibleReadingsToMetricsDetailed(readings, {
      screenType,
    });
    for (const key of RECOVERABLE_METRIC_KEYS) {
      if (isMetricPresent(next, key)) continue;
      if (!isMetricPresent(mapped.metrics, key)) continue;
      if (key === "sleepScore") {
        next.sleepScore = mapped.metrics.sleepScore;
      } else {
        next[key] = mapped.metrics[key];
      }
    }
  }

  // 複合入眠・起床
  if (!next.bedtime.trim() || !next.wakeTime.trim()) {
    const blob = readings
      .map((r) => `${r.label ?? ""} ${r.value ?? ""}`)
      .join(" / ");
    const compound = extractCriticalFromCompoundText("睡眠", blob);
    if (!next.bedtime.trim() && compound.bedtime) next.bedtime = compound.bedtime;
    if (!next.wakeTime.trim() && compound.wakeTime) {
      next.wakeTime = compound.wakeTime;
    }
  }

  return normalizeMetrics(next);
}

function inferBestScreenHint(readings: VisibleReading[]): SoxaiScreenType {
  const joined = readings.map((r) => normalizeLabel(r.label)).join("|");
  if (/皮膚温|体表温|skintemp|体温偏差/.test(joined)) return "skin_temp";
  if (/ストレス|stress/.test(joined)) return "stress";
  if (/入眠|起床|睡眠開始|睡眠終了/.test(joined)) return "bed_wake";
  if (/睡眠効率|睡眠負債|入眠潜時/.test(joined)) return "sleep_detail";
  return "other";
}

/**
 * API（画像ごとOCR→ラベル/画面種別マージ済み）の metrics を正とし、
 * 不足キーのみ visibleReadings の再マッピングで補完する。
 */
export function mergeMetricsFromVisibleReadings(
  apiMetrics: Partial<AnalysisMetrics> | undefined,
  readings: VisibleReading[],
): AnalysisMetrics {
  const fromApi = normalizeMetrics(apiMetrics);
  if (readings.length === 0) return fromApi;

  const fromReadings = mapVisibleReadingsToMetrics(readings);
  const merged = emptyMetrics();

  for (const key of Object.keys(merged) as MetricFieldKey[]) {
    if (isMetricPresent(fromApi, key)) {
      if (key === "sleepScore") {
        merged.sleepScore = fromApi.sleepScore;
      } else {
        merged[key] = fromApi[key];
      }
      continue;
    }
    if (isMetricPresent(fromReadings, key)) {
      if (key === "sleepScore") {
        merged.sleepScore = fromReadings.sleepScore;
      } else {
        merged[key] = fromReadings[key];
      }
    }
  }

  return normalizeMetrics(merged);
}

export function normalizeVisibleReadings(raw: unknown): VisibleReading[] {
  if (!Array.isArray(raw)) return [];

  const readings: VisibleReading[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    let label = String(
      record.label ?? record.name ?? record.key ?? "",
    )
      .normalize("NFKC")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/[\r\n\t]+/g, " ")
      .trim()
      .replace(/\s+/g, " ");
    let valueRaw = record.value ?? record.val ?? record.number;
    let value =
      valueRaw == null
        ? ""
        : typeof valueRaw === "number"
          ? String(valueRaw)
          : String(valueRaw)
              .normalize("NFKC")
              .replace(/[\r\n\t]+/g, " ")
              .trim()
              .replace(/\s+/g, " ");

    // ラベルと値が逆（label="58", value="bpm" / label="42", value="ms"）
    if (
      label &&
      value &&
      /^\d+(\.\d+)?$/.test(label) &&
      /^(bpm|ms|rpm|brpm|℃|%|％)$/i.test(value)
    ) {
      value = `${label} ${value}`;
      label = value.toLowerCase().includes("bpm")
        ? "心拍数"
        : value.toLowerCase().includes("ms")
          ? "HRV"
          : /rpm|brpm/i.test(value)
            ? "呼吸速度"
            : /℃/.test(value)
              ? "皮膚温度"
              : "平均";
    }

    // 数値のみ（ラベル無し）も保持し、後段で周辺ラベルから推定
    if (!value) continue;
    if (!label) {
      if (/bpm/i.test(value)) label = "心拍数";
      else if (/\bms\b/i.test(value)) label = "HRV";
      else if (/rpm|brpm/i.test(value)) label = "呼吸速度";
      else if (/℃|°\s*c/i.test(value) || /^[+-]\s*\d+(\.\d+)?$/.test(value))
        label = "皮膚温度";
      else if (/%|％/.test(value)) label = "平均";
      else if (/^\d+(\.\d+)?$/.test(value)) label = "平均";
      else continue;
    }

    const dedupe = `${normalizeLabel(label)}::${value}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    readings.push({ label, value });
  }

  return readings;
}
