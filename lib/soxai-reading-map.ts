import {
  emptyMetrics,
  isMetricPresent,
  normalizeMetrics,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import type { SoxaiScreenType } from "@/lib/soxai-screen";

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
  return label
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s　_\-－—–：:（）()【】\[\]「」『』・･./／]/g, "");
}

function normalizeValue(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/％/g, "%")
    .replace(/：/g, ":");
}

function looksPercent(value: string): boolean {
  return /%|％/.test(value) || /^\s*\d{1,3}(\.\d+)?\s*$/.test(value.trim());
}

function looksDuration(value: string): boolean {
  return /時間|分|時|h|hr|min|:/.test(value) && !/%|％/.test(value);
}

function looksTime(value: string): boolean {
  return /^\s*\d{1,2}[:：]\d{2}/.test(value);
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
      /qualityoflife|現在のqol|きょうのqol|今日のqol|現在のスコア/.test(l),
    valueHint: "score",
  },
  {
    key: "yesterdayQol",
    test: (l) =>
      /昨日のqol|昨日のスコア|きのうのスコア|きのうのqol|yesterdayqol|yesterdayscore/.test(
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
      /安静時心拍|心拍数|^心拍$|^hr$|^rhr$|restinghr|restingheartrate|heartrate|平均心拍/.test(
        l,
      ) && !/変動|hrv/.test(l),
  },
  {
    key: "hrv",
    test: (l) =>
      (/^hrv$|心拍変動|rmssd|sdnn|heart rate variability/.test(l) &&
        !/最小|最大|min|max/.test(l)) ||
      (/心拍変動|hrv/.test(l) && /平均|avg|mean/.test(l)),
  },
  // —— ステージ詳細（睡眠時間より先に判定）——
  {
    key: "awakeningRate",
    test: (l) => /覚醒率|awake%|awakepercent|覚醒割合/.test(l),
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
    test: (l) => /レム睡眠率|レム率|rem率|rem%|rempercent|レム割合/.test(l),
    valueHint: "percent",
  },
  {
    key: "remSleep",
    test: (l) =>
      /レム睡眠時間|レム時間|rem時間|レム睡眠|^レム$|^rem$|remsleep/.test(l) &&
      !/率|%|percent|割合/.test(l),
    valueHint: "duration",
  },
  {
    key: "lightSleepRate",
    test: (l) => /浅い睡眠率|light%|lightpercent|浅い割合/.test(l),
    valueHint: "percent",
  },
  {
    key: "lightSleep",
    test: (l) =>
      /浅い睡眠時間|浅い時間|light時間|浅い睡眠|^light$|lightsleep/.test(l) &&
      !/率|%|percent|割合/.test(l),
    valueHint: "duration",
  },
  {
    key: "deepSleepRate",
    test: (l) => /深い睡眠率|deep%|deeppercent|深い割合/.test(l),
    valueHint: "percent",
  },
  {
    key: "deepSleep",
    test: (l) =>
      /深い睡眠時間|深い時間|deep時間|深い睡眠|^deep$|deepsleep/.test(l) &&
      !/率|%|percent|割合/.test(l),
    valueHint: "duration",
  },
  // —— 総睡眠（レム/浅い/深い を除外）——
  {
    key: "sleepDuration",
    test: (l) =>
      (/睡眠時間|総睡眠|totalsleep|実際の睡眠|^睡眠$/.test(l) ||
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
  },
  {
    key: "bedtime",
    test: (l) =>
      (/入眠時間|入眠時刻|入眠した時刻|睡眠開始時刻|睡眠開始時間|睡眠開始|fellasleep|sleeponset|sleepstart|^入眠$/.test(
        l,
      ) ||
        (/bedtime|sleeponset/.test(l) && !/latency|潜時/.test(l))) &&
      !/潜時|latency|就床|全就床|就寝予定|起床|覚醒|中途/.test(l),
    valueHint: "time",
  },
  {
    key: "wakeTime",
    test: (l) =>
      (/起床時間|起床時刻|起床した時刻|^起床$|睡眠終了|睡眠終了時刻|睡眠終了時間|gotup|waketime|wakeuptime/.test(
        l,
      ) ||
        (/^wake$|wakeup/.test(l) && !/awake|覚醒/.test(l))) &&
      !/覚醒時間|中途覚醒|awake|覚醒率|覚醒の/.test(l),
    valueHint: "time",
  },
  {
    key: "sleepEfficiency",
    test: (l) => /睡眠効率|sleepefficiency|efficiency/.test(l),
  },
  {
    key: "sleepDebt",
    test: (l) => /睡眠負債|sleepdebt|^負債$|睡眠の負債/.test(l),
  },
  {
    key: "circadianRhythm",
    test: (l) => /体内時計|circadian|クロノ|位相/.test(l),
  },
  {
    key: "respiratoryRate",
    test: (l) => /呼吸速度|呼吸数|respiratory|respiration|平均呼吸/.test(l),
  },
  {
    key: "spo2",
    test: (l) =>
      /spo2|spo₂|血中酸素|酸素飽和|酸素レベル|平均酸素|平均spo/.test(l),
  },
  {
    key: "skinTemperature",
    test: (l) =>
      /皮膚温度|皮膚温|体表温|体表温度|skintemperature|skintemp|体温偏差|皮膚温度偏差|温度偏差|delta温度|温度delta|ベースライン偏差|baseline偏差/.test(
        l,
      ) && !/環境|室温|気温|天候/.test(l),
    valueHint: "temp",
  },
  {
    key: "stress",
    test: (l) =>
      /^ストレス$|^stress$|ストレスレベル|ストレス指数|ストレススコア|ストレス値|ストレス平均|平均ストレス|現在のストレス|夜間ストレス|ストレスモニター|stresslevel|stressscore|stressindex|stressavg|averagestress/.test(
        l,
      ),
  },
];

function matchKey(label: string, value: string): MetricFieldKey | null {
  const normalized = normalizeLabel(label);

  for (const rule of MAPPING_RULES) {
    if (!rule.test(normalized)) continue;

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
    if (
      rule.valueHint === "time" &&
      !looksTime(value) &&
      looksDuration(value)
    ) {
      continue;
    }
    if (rule.valueHint === "temp" && !looksSkinTemperature(value)) {
      // ラベルが皮膚温でも値が見えない場合はスキップ
      continue;
    }

    return rule.key;
  }

  return null;
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
      if (/入眠時間|入眠時刻|睡眠開始時刻|sleeponset|fellasleep|入眠した時刻/.test(l))
        return 110;
      if (/^入眠$|睡眠開始/.test(l)) return 95;
      if (/bedtime/.test(l) && !/latency|潜時/.test(l)) return 70;
      if (/就寝/.test(l) && !/予定|目標/.test(l)) return 25;
      if (/就床|全就床/.test(l)) return 5;
      return 20;

    case "wakeTime":
      if (/起床時間|起床時刻|睡眠終了|waketime|gotup|起床した時刻/.test(l))
        return 110;
      if (/^起床$|^wake$|wakeup/.test(l) && !/awake|覚醒/.test(l)) return 90;
      if (/覚醒時間|中途覚醒|awake/.test(l)) return 5;
      return 20;

    case "skinTemperature":
      if (/皮膚温度|皮膚温|体表温|skintemp/.test(l) && /平均|avg|mean/.test(l))
        return 115;
      if (/皮膚温度|皮膚温|体表温|skintemperature|skintemp/.test(l)) return 110;
      if (/体温偏差|温度偏差|ベースライン偏差/.test(l)) return 100;
      if (/^平均$|^現在$|^偏差$|^avg$/.test(l)) return 55;
      return 20;

    case "stress":
      if (/ストレス平均|平均ストレス|stress.*avg|avg.*stress/.test(l)) return 115;
      if (/ストレスレベル|stresslevel/.test(l)) return 100;
      if (/^ストレス$|^stress$|ストレス指数|ストレス値|ストレススコア/.test(l))
        return 95;
      if (/ストレスモニター/.test(l)) return 70;
      if (/^平均$|^現在$|^avg$/.test(l)) return 50;
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

  // キー別の画面適合
  if (key === "sleepScore") {
    if (labels.some((l) => /睡眠スコア|sleepscore/.test(l)) && !isChartFragment)
      score += 40;
    if (isHomeOverview && labels.some((l) => /^睡眠$/.test(l))) score += 25;
    if (isChartFragment) score -= 50;
  }

  if (key === "sleepDuration") {
    if (isSleepDetail) score += 35;
    if (isStageDetail) score -= 25; // ステージ画面の「○睡眠時間」は総睡眠ではない
    if (isHomeOverview) score += 5;
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
  if (!screenType || screenType === "other") return;

  const trySet = (
    key: MetricFieldKey,
    label: string,
    value: string,
    score: number,
  ) => {
    const prev = bestLabelScore[key] ?? -1;
    if (score <= prev) return;
    if (key === "sleepScore") return;
    next[key] =
      key === "skinTemperature" ? normalizeSkinTemperatureValue(value) : value;
    provenance[key] = label;
    bestLabelScore[key] = score;
  };

  if (screenType === "skin_temp" && !String(next.skinTemperature).trim()) {
    for (const reading of readings) {
      const label = reading.label?.trim() ?? "";
      const value = normalizeValue(reading.value ?? "");
      if (!label || !value || !looksSkinTemperature(value)) continue;
      const l = normalizeLabel(label);
      // 画面が皮膚温度専用なら、平均/現在/偏差/+値 を採用
      if (
        /皮膚|体表|温度|偏差|平均|現在|avg|mean|delta|temp/.test(l) ||
        /^[+-]/.test(value)
      ) {
        trySet("skinTemperature", label, value, labelMatchScore("skinTemperature", label) || 60);
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
      if (/ストレス|stress|平均|現在|レベル|avg|mean/.test(l)) {
        // 時刻だけの値は除外
        if (looksTime(value) && !looksScore(value)) continue;
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
      if (!label || !value || !looksTime(value)) continue;
      const l = normalizeLabel(label);
      if (
        !next.bedtime.trim() &&
        /入眠|睡眠開始|onset|fellasleep|bedtime/.test(l) &&
        !/潜時|latency|就床|覚醒/.test(l)
      ) {
        trySet("bedtime", label, value, labelMatchScore("bedtime", label));
      }
      if (
        !next.wakeTime.trim() &&
        /起床|睡眠終了|gotup|wakeup|waketime/.test(l) &&
        !/覚醒時間|中途|awake|率/.test(l)
      ) {
        trySet("wakeTime", label, value, labelMatchScore("wakeTime", label));
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

  for (const reading of readings) {
    const label = reading.label?.trim() ?? "";
    const value = normalizeValue(reading.value ?? "");
    if (!label || !value) continue;

    const key = matchKey(label, value);
    if (!key) {
      skippedLabels.push(label);
      continue;
    }

    // ステージ画面の端点時刻を入眠・起床に誤マップしない
    if (
      screenType === "sleep_stages" &&
      (key === "bedtime" || key === "wakeTime")
    ) {
      const l = normalizeLabel(label);
      if (!/入眠時間|入眠時刻|起床時間|起床時刻|睡眠開始|睡眠終了/.test(l)) {
        skippedLabels.push(`${label}(blocked:${screenType})`);
        continue;
      }
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
      next[key] =
        key === "skinTemperature"
          ? normalizeSkinTemperatureValue(value)
          : value;
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
    const label = String(
      record.label ?? record.name ?? record.key ?? "",
    ).trim();
    const valueRaw = record.value ?? record.val ?? record.number;
    const value =
      valueRaw == null
        ? ""
        : typeof valueRaw === "number"
          ? String(valueRaw)
          : String(valueRaw).trim();
    if (!label || !value) continue;

    const dedupe = `${normalizeLabel(label)}::${value}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    readings.push({ label, value });
  }

  return readings;
}
