import {
  emptyMetrics,
  isMetricPresent,
  normalizeMetrics,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";

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
  valueHint?: "percent" | "duration" | "time" | "score" | "any";
};

function normalizeLabel(label: string): string {
  return label
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s　_\-：:（）()【】\[\]「」『』]/g, "");
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
      /睡眠スコア|sleepscore|総合スコア/.test(l) ||
      /^睡眠$/.test(l) ||
      (/^スコア$|^score$/.test(l) &&
        !/qol|昨日|体調|コンディション|condition/.test(l)),
    valueHint: "score",
  },
  {
    key: "qol",
    test: (l) =>
      /^qol$/.test(l) ||
      /qualityoflife|現在のqol|きょうのqol|今日のqol/.test(l) ||
      /^現在のスコア$/.test(l),
    valueHint: "score",
  },
  {
    key: "yesterdayQol",
    test: (l) =>
      /昨日のqol|昨日のスコア|きのうのスコア|yesterdayqol|yesterdayscore/.test(
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
      /安静時心拍|心拍数|^心拍$|^hr$|^rhr$|restinghr|restingheartrate|heartrate/.test(
        l,
      ) && !/変動|hrv/.test(l),
  },
  // —— ステージ詳細（睡眠時間より先に判定）——
  {
    key: "awakeningRate",
    test: (l) => /覚醒率|awake%|awakepercent/.test(l),
    valueHint: "percent",
  },
  {
    key: "awakenings",
    test: (l) => /覚醒時間|中途覚醒|^覚醒$|^awake$|awaketime/.test(l),
  },
  {
    key: "remSleepRate",
    test: (l) => /レム睡眠率|rem率|rem%|rempercent/.test(l),
    valueHint: "percent",
  },
  {
    key: "remSleep",
    test: (l) =>
      /レム睡眠時間|レム時間|rem時間|レム睡眠|^レム$|^rem$|remsleep/.test(l) &&
      !/率|%|percent/.test(l),
    valueHint: "duration",
  },
  {
    key: "lightSleepRate",
    test: (l) => /浅い睡眠率|light%|lightpercent/.test(l),
    valueHint: "percent",
  },
  {
    key: "lightSleep",
    test: (l) =>
      /浅い睡眠時間|浅い時間|light時間|浅い睡眠|^light$|lightsleep/.test(l) &&
      !/率|%|percent/.test(l),
    valueHint: "duration",
  },
  {
    key: "deepSleepRate",
    test: (l) => /深い睡眠率|deep%|deeppercent/.test(l),
    valueHint: "percent",
  },
  {
    key: "deepSleep",
    test: (l) =>
      /深い睡眠時間|深い時間|deep時間|深い睡眠|^deep$|deepsleep/.test(l) &&
      !/率|%|percent/.test(l),
    valueHint: "duration",
  },
  // —— 総睡眠（レム/浅い/深い を除外）——
  {
    key: "sleepDuration",
    test: (l) =>
      (/睡眠時間|総睡眠|totalsleep|実際の睡眠|^睡眠$/.test(l) ||
        (/sleep/.test(l) && /duration|total/.test(l))) &&
      !/レム|rem|浅い|light|深い|deep|負債|効率|スコア|潜時/.test(l),
    valueHint: "duration",
  },
  // —— 入眠潜時を入眠より先に ——
  {
    key: "sleepLatency",
    test: (l) => /入眠潜時|潜時|latency|sleeplatency/.test(l),
  },
  {
    key: "bedtime",
    test: (l) =>
      (/入眠時間|就寝|睡眠開始|fellasleep|sleeponset|^入眠$/.test(l) ||
        (/bedtime|sleepstart/.test(l) && !/latency|潜時/.test(l))) &&
      !/潜時|latency/.test(l),
    valueHint: "time",
  },
  {
    key: "wakeTime",
    test: (l) =>
      /起床時間|起床|睡眠終了|gotup|^wake$|waketime/.test(l) &&
      !/覚醒時間|中途|awake/.test(l),
    valueHint: "time",
  },
  {
    key: "sleepEfficiency",
    test: (l) => /睡眠効率|efficiency/.test(l),
  },
  {
    key: "sleepDebt",
    test: (l) => /睡眠負債|sleepdebt|^負債$/.test(l),
  },
  {
    key: "circadianRhythm",
    test: (l) => /体内時計|circadian|クロノ/.test(l),
  },
  {
    key: "respiratoryRate",
    test: (l) => /呼吸速度|呼吸数|respiratory|respiration/.test(l),
  },
  {
    key: "spo2",
    test: (l) => /spo2|spo₂|血中酸素|酸素飽和|酸素レベル|平均酸素/.test(l),
  },
  {
    key: "hrv",
    test: (l) => /^hrv$|心拍変動|rmssd|sdnn/.test(l),
  },
  {
    key: "skinTemperature",
    test: (l) => /皮膚温|skintemp|体温/.test(l),
  },
  {
    key: "stress",
    test: (l) => /^ストレス$|^stress$|ストレスレベル|ストレス指数/.test(l),
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
      if (/入眠時間|睡眠開始|sleeponset|fellasleep/.test(l)) return 100;
      if (/^入眠$|就寝|bedtime/.test(l)) return 80;
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
    key === "circadianRhythm" ||
    key === "bedtime" ||
    key === "wakeTime"
  ) {
    if (isSleepDetail) score += 30;
  }

  return score;
}

/**
 * visibleReadings → metrics + 出典ラベル
 * 同一キーはラベル一致スコアが高い方を採用（first-wins しない）
 */
export function mapVisibleReadingsToMetricsDetailed(
  readings: VisibleReading[],
): MappedImageReadings {
  const next = emptyMetrics();
  const provenance: MetricProvenance = {};
  const bestLabelScore: Partial<Record<MetricFieldKey, number>> = {};
  const mappedLabels: string[] = [];
  const skippedLabels: string[] = [];

  for (const reading of readings) {
    const label = reading.label?.trim() ?? "";
    const value = reading.value?.trim() ?? "";
    if (!label || !value) continue;

    const key = matchKey(label, value);
    if (!key) {
      skippedLabels.push(label);
      continue;
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
      next[key] = value;
      provenance[key] = label;
      bestLabelScore[key] = matchScore;
      mappedLabels.push(`${label}→${key}`);
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[soxai-reading-map] mapped", {
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
