import {
  emptyMetrics,
  isMetricPresent,
  normalizeMetrics,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import { applyNonRemFromStageOcr } from "@/lib/soxai-merge";
import { isStrictSourceScreenKey } from "@/lib/soxai-screen";
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
import { parseDurationMinutes, parsePercent } from "@/lib/soxai-graphs";

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
  const v = value.normalize("NFKC").trim();
  if (/bpm|拍\/分/i.test(v)) return true;
  if (/^\s*\d{2,3}(\.\d+)?\s*$/.test(v)) return true;
  // OCR「平均63」など（皮膚温の +0.2 は除外）
  if (/^(平均|avg|mean)\s*\d{2,3}(\.\d+)?\s*(bpm|拍\/分)?$/i.test(v)) return true;
  return false;
}

/** 入眠潜時として妥当な長さか（通常 0〜90分。2時間超は比較値・就床時間の取り違えが多い） */
export function isPlausibleSleepLatency(value: string): boolean {
  const mins = parseDurationMinutes(value);
  if (mins == null) return false;
  return mins >= 0 && mins <= 120;
}

/** 入眠時刻として弱い候補か（潜時の取り違え: 入眠時間=0:30 など） */
export function looksLikeLatencyMisreadAsBedtime(
  value: string,
  label?: string,
): boolean {
  const raw = String(value ?? "").normalize("NFKC").trim();
  const ln = normalizeLabel(label ?? "");
  // 「30分」だけは bedtime にしない
  if (/^\d+\s*分/.test(raw) && !/[:：]|時/.test(raw)) return true;
  const m = raw.match(/^(\d{1,2})\s*[:：]\s*(\d{2})$/);
  if (!m) return false;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  // 0:MM は「入眠時間」ラベルで潜時と取り違えやすい。就寝ラベルは許可
  if (hh === 0 && mm > 0 && mm <= 90) {
    if (/就寝/.test(ln)) return false;
    if (/入眠|onset|asleep|sleeponset|sleepstart|bedtime/.test(ln)) return true;
    // ラベル不明時は潜時疑いとして弾く（マージ候補の比較値混入防止）
    if (!ln) return true;
  }
  return false;
}

/** 安静時カードの値から「平均 N」を取り出す（大きな最小表示と同居するとき） */
function extractRestingHrAverageToken(value: string): string | null {
  const v = String(value ?? "").normalize("NFKC");
  const m = v.match(/(?:平均|avg|mean)\s*[:=]?\s*(\d{2,3}(?:\.\d+)?)/i);
  if (!m?.[1]) return null;
  return looksBpm(m[1]) ? m[1] : null;
}

/** 心拍変動カードの複合値「平均 56 ms」「最大 101」を分解 */
function parseHrvCompoundValue(
  label: string,
  value: string,
): { key: "hrv" | "hrvMax" | "hrvMin"; value: string } | null {
  const ln = normalizeLabel(label);
  const raw = String(value ?? "").normalize("NFKC").trim();
  if (!raw) return null;
  // OCRが「心拍変動」を「心拍数」と誤読し、値が ms のケースも許容
  const isHrvLabel =
    (/心拍変動|hrv|rmssd|sdnn|心拍動/.test(ln) ||
      (/^心拍数$|^心拍$|^hr$/i.test(ln) && /\bms\b|ミリ秒/i.test(raw))) &&
    !/安静時心拍/.test(ln);
  if (
    !isHrvLabel &&
    !/^(平均|最大|最小|avg|max|min)$/.test(ln)
  ) {
    return null;
  }

  const maxM = raw.match(/(?:最大|max)\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(ms|ミリ秒)?/i);
  if (maxM?.[1] && (isHrvLabel || /最大|max/.test(ln))) {
    return { key: "hrvMax", value: maxM[2] ? `${maxM[1]} ${maxM[2]}` : maxM[1] };
  }
  const minM = raw.match(/(?:最小|min)\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(ms|ミリ秒)?/i);
  if (minM?.[1] && (isHrvLabel || /最小|min/.test(ln))) {
    return { key: "hrvMin", value: minM[2] ? `${minM[1]} ${minM[2]}` : minM[1] };
  }
  // ラベル側に最大/最小（値は裸数字や ms）
  if (/最大|max/.test(ln) && !/平均|avg|mean|最小|min/.test(ln)) {
    const n = raw.match(/(\d{1,3}(?:\.\d+)?)/);
    if (n?.[1] && (isHrvLabel || looksHrvMs(raw))) {
      return {
        key: "hrvMax",
        value: /\bms\b|ミリ秒/i.test(raw) ? `${n[1]} ms` : n[1],
      };
    }
  }
  if (/最小|min/.test(ln) && !/平均|avg|mean|最大|max/.test(ln)) {
    const n = raw.match(/(\d{1,3}(?:\.\d+)?)/);
    if (n?.[1] && (isHrvLabel || looksHrvMs(raw))) {
      return {
        key: "hrvMin",
        value: /\bms\b|ミリ秒/i.test(raw) ? `${n[1]} ms` : n[1],
      };
    }
  }
  const avgM = raw.match(/(?:平均|avg|mean)\s*[:=]?\s*(\d{1,3}(?:\.\d+)?)\s*(ms|ミリ秒)?/i);
  if (avgM?.[1] && (isHrvLabel || /平均|avg|mean/.test(ln))) {
    return {
      key: "hrv",
      value: avgM[2] ? `${avgM[1]} ${avgM[2]}` : `${avgM[1]} ms`,
    };
  }
  // 「心拍数」「心拍変動」＋裸の ms 値 → 平均HRV（最大/最小ラベルは除外）
  if (
    isHrvLabel &&
    /\bms\b|ミリ秒/i.test(raw) &&
    !/最大|最小|max|min/i.test(raw) &&
    !/最大|最小|max|min/i.test(ln)
  ) {
    const n = raw.match(/(\d{1,3}(?:\.\d+)?)/);
    if (n?.[1]) {
      return { key: "hrv", value: `${n[1]} ms` };
    }
  }
  return null;
}

/** 同一カード内の弱ラベル「最小/最大」を心拍・HRV に振り分ける */
function remapWeakMinMaxKey(
  key: MetricFieldKey,
  label: string,
  value: string,
  siblingLabels: string[],
): MetricFieldKey {
  const ln = normalizeLabel(label);
  const hasRhr = siblingLabels.some((x) =>
    /安静時心拍|resting\s*hr|^rhr$/i.test(x.normalize("NFKC")),
  );
  const hasHrv = siblingLabels.some((x) =>
    /心拍変動|hrv|rmssd|sdnn/i.test(x.normalize("NFKC")),
  );

  if (key === "restingHeartRate") {
    if (/最小|min/.test(ln) && !/平均|avg|mean|最大|max/.test(ln)) {
      return "restingHeartRateMin";
    }
    if (/最大|max/.test(ln) && !/平均|avg|mean|最小|min/.test(ln)) {
      return "restingHeartRateMax";
    }
  }

  if (
    (key === "hrv" || key === "hrvMax" || key === "hrvMin") &&
    /^(最大|max)$/.test(ln) &&
    hasHrv &&
    !hasRhr
  ) {
    return "hrvMax";
  }
  if (
    (key === "hrv" || key === "hrvMax" || key === "hrvMin") &&
    /^(最小|min)$/.test(ln) &&
    hasHrv &&
    !hasRhr
  ) {
    return "hrvMin";
  }

  // 弱ラベルのみで matchKey が restingHeartRate に落ちた場合
  // 同一バッチに HRV があるとき、裸の「最大」は HRV 側（安静時最大の誤採用防止）
  if (/^(最小|min)$/.test(ln) && hasRhr && looksBpm(value) && !/\bms\b/i.test(value)) {
    if (hasHrv) return key;
    return "restingHeartRateMin";
  }
  if (/^(最大|max)$/.test(ln) && hasRhr && looksBpm(value) && !/\bms\b/i.test(value)) {
    if (hasHrv) return "hrvMax";
    return "restingHeartRateMax";
  }
  if (/^(最大|max)$/.test(ln) && hasHrv && looksHrvMs(value)) {
    return "hrvMax";
  }
  if (/^(最小|min)$/.test(ln) && hasHrv && looksHrvMs(value)) {
    return "hrvMin";
  }

  return key;
}

/** 同一ラベルの安静時心拍が複数あるとき、最小より平均（高い方）を残す */
function preferRestingHeartRateValue(previous: string, nextValue: string): boolean {
  const prevN = Number(String(previous).replace(/[^\d.-]/g, ""));
  const nextN = Number(String(nextValue).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(prevN) || !Number.isFinite(nextN)) return false;
  if (nextN < 35 || nextN > 110 || prevN < 35 || prevN > 110) return false;
  return nextN > prevN + 2;
}

function looksHrvMs(value: string): boolean {
  return /\bms\b|ミリ秒/i.test(value) || /^\s*\d{1,3}(\.\d+)?\s*$/.test(value.trim());
}

/** 平均HRVとして採用する値（ms または値内の平均。裸の SpO₂ 数字を排除） */
function isAcceptableAvgHrvValue(value: string): boolean {
  const v = String(value ?? "").normalize("NFKC").trim();
  if (!v || !looksHrvMs(v)) return false;
  if (/\bms\b|ミリ秒/i.test(v)) return true;
  if (/平均|avg|mean/i.test(v) && /\d/.test(v)) return true;
  return false;
}

/** 安静時カード内の「平均」行か（皮膚温の平均 +0.2 などは除外） */
function isRestingHrAvgSiblingReading(reading: {
  label?: string;
  value?: string;
}): boolean {
  const rl = (reading.label ?? "").normalize("NFKC").trim();
  const rv = String(reading.value ?? "").normalize("NFKC").trim();
  if (!rl || !rv) return false;
  if (/安静時心拍|resting\s*hr|^rhr$/i.test(rl) && /平均|avg|mean/i.test(rl)) {
    return looksBpm(rv);
  }
  if (/^(平均|avg|mean)$/i.test(rl)) {
    if (/^[+-]/.test(rv) || /℃|°/.test(rv)) return false;
    return looksBpm(rv);
  }
  return false;
}

/** 平均HRV ラベル、または同一カード「心拍変動」＋値の平均 */
function isAvgHrvLabelOrSameCard(
  label: string,
  value: string,
): boolean {
  const ln = normalizeLabel(label);
  const raw = String(value ?? "");
  if (/最小|最大|min|max/.test(ln) && !/平均|avg|mean/.test(ln)) return false;
  if (
    /平均hrv|hrv平均|平均心拍変動|心拍変動平均|平均rmssd|^rmssd$/.test(ln)
  ) {
    return true;
  }
  if (
    /心拍変動|hrv|rmssd|sdnn|心拍動/.test(ln) &&
    /平均|avg|mean/.test(ln)
  ) {
    return true;
  }
  // 同一カード: ラベルが心拍変動系で、値側に「平均 … ms」
  if (
    /^(心拍変動|心拍動|hrv|rmssd)$/.test(ln) &&
    /平均|avg|mean/i.test(raw)
  ) {
    return true;
  }
  return false;
}

/** SpO₂ など他カードの % 数値を HRV にしない（裸の 94 等） */
function isHrvSpo2Collision(
  value: string,
  readings: Array<{ label?: string; value?: string }>,
): boolean {
  const raw = String(value ?? "").normalize("NFKC").trim();
  if (/\bms\b|ミリ秒/i.test(raw)) return false;
  const num = Number(raw.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(num)) return false;
  return readings.some((r) => {
    const rl = (r.label ?? "").normalize("NFKC");
    if (!/酸素|spo2|spo₂|saturation|血中酸素/i.test(rl)) return false;
    const rv = Number(String(r.value ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(rv) && Math.round(rv) === Math.round(num);
  });
}

function looksRespiratory(value: string): boolean {
  const v = value.normalize("NFKC").trim();
  if (!v) return false;
  if (/\brpm\b|\bbrpm\b|呼吸\/分|回\/分/i.test(v)) return true;
  // 「12.6」「12.6回」など単位欠落・部分単位も許容
  if (/^\s*\d{1,2}([.,]\d+)?\s*(回)?\s*$/.test(v)) return true;
  return false;
}

function looksBareMinutes(value: string): boolean {
  const n = Number(value.trim().replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0 && n <= 300;
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
    case "nonRemSleep":
    case "lightSleep":
    case "deepSleep":
    case "awakenings":
    case "sleepDebt":
      if (looksPercent(v) && !looksDuration(v)) return false;
      // OCRで単位「分」が落ちるケースを許容（負債のみ）
      if (key === "sleepDebt" && looksBareMinutes(v)) {
        return true;
      }
      return looksDuration(v) || parseDurationMinutes(v) != null;

    case "sleepLatency":
      if (looksPercent(v) && !looksDuration(v)) return false;
      if (looksBareMinutes(v) || looksDuration(v) || parseDurationMinutes(v) != null) {
        return isPlausibleSleepLatency(v);
      }
      return false;

    case "sleepEfficiency":
    case "awakeningRate":
    case "remSleepRate":
    case "nonRemSleepRate":
    case "lightSleepRate":
    case "deepSleepRate":
    case "spo2":
      if (looksDuration(v) && !/%|％/.test(v)) return false;
      return looksPercent(v);

    case "skinTemperature":
      return looksSkinTemperature(v);

    case "restingHeartRate":
    case "restingHeartRateMin":
    case "restingHeartRateMax":
      return looksBpm(v);

    case "hrv":
    case "hrvMax":
    case "hrvMin":
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
    key: "restingHeartRateMin",
    test: (l) =>
      (/安静時心拍|resting\s*hr|restinghr|restingheartrate|^rhr$/.test(l) &&
        /最小|min/.test(l) &&
        !/変動|hrv|rmssd|sdnn|平均|avg|mean|最大|max/.test(l)) ||
      /^最小心拍$|^最小rhr$|^rhrmin$|^安静時心拍数最小$/.test(l),
  },
  {
    key: "restingHeartRateMax",
    test: (l) =>
      (/安静時心拍|resting\s*hr|restinghr|restingheartrate|^rhr$/.test(l) &&
        /最大|max/.test(l) &&
        !/変動|hrv|rmssd|sdnn|平均|avg|mean|最小|min/.test(l)) ||
      /^最大心拍$|^最大rhr$|^rhrmax$|^安静時心拍数最大$/.test(l),
  },
  {
    key: "restingHeartRate",
    // 「安静時心拍」明示、または「安静時心拍数平均」
    test: (l) =>
      /^安静時心拍数平均$|^安静時心拍平均$|^rhr平均$|^平均rhr$/.test(l) ||
      (/安静時心拍|resting\s*hr|restinghr|restingheartrate|^rhr$/.test(l) &&
        !/変動|hrv|rmssd|sdnn/.test(l) &&
        !(/^(最小|最大|平均|min|max|avg)$/.test(l))),
  },
  {
    key: "hrvMax",
    test: (l) =>
      (/心拍変動|hrv|rmssd|sdnn|heartratevariability/.test(l) &&
        /最大|max/.test(l)) ||
      /^最大hrv$|^hrvmax$|^maxhrv$/.test(l),
  },
  {
    key: "hrvMin",
    test: (l) =>
      (/心拍変動|hrv|rmssd|sdnn|heartratevariability/.test(l) &&
        /最小|min/.test(l)) ||
      /^最小hrv$|^hrvmin$|^minhrv$/.test(l),
  },
  {
    key: "hrv",
    // 「平均HRV」「心拍変動平均」「RMSSD」など平均明示。裸の最大・最小は不可
    test: (l) =>
      !/最小|最大|min|max/.test(l) &&
      (/平均hrv|hrv平均|平均心拍変動|心拍変動平均|平均rmssd|^rmssd$/.test(l) ||
        ((/心拍変動|hrv|rmssd|sdnn/.test(l) && /平均|avg|mean/.test(l)))),
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
    key: "nonRemSleepRate",
    test: (l) =>
      /ノンレム睡眠率|ノンレム率|nrem率|nrem%|nrempercent|ノンレム割合|ノンレム%|ノンレム％|nonrem%|nonrempercent/.test(
        l,
      ) ||
      (/ノンレム|nrem|non.?rem/.test(l) && /率|%|percent|割合/.test(l)),
    valueHint: "percent",
  },
  {
    key: "nonRemSleep",
    test: (l) =>
      (/ノンレム睡眠時間|ノンレム時間|nrem時間|ノンレム睡眠|^ノンレム$|^nrem$|nonremsleep|nremsleep|nonrem/.test(
        l,
      ) ||
        /ノンレム|nrem|non.?rem/.test(l)) &&
      !/率|percent|割合/.test(l),
    valueHint: "duration",
  },
  {
    key: "remSleepRate",
    test: (l) =>
      /レム睡眠率|レム率|rem率|rem%|rempercent|レム割合|レム%|レム％/.test(l) &&
      !/ノンレム|nrem|non.?rem/.test(l),
    valueHint: "percent",
  },
  {
    key: "remSleep",
    test: (l) =>
      /レム睡眠時間|レム時間|rem時間|レム睡眠|^レム$|^rem$|remsleep/.test(l) &&
      !/率|percent|割合/.test(l) &&
      !/ノンレム|nrem|non.?rem/.test(l),
    valueHint: "duration",
  },
  {
    key: "lightSleepRate",
    test: (l) =>
      /浅い睡眠率|light%|lightpercent|浅い割合|浅い%|浅い％|浅%|^浅い$|^浅い率$|^浅率$/.test(
        l,
      ),
    valueHint: "percent",
  },
  {
    key: "lightSleep",
    // 裸の「浅い」は比較矢印・他行との混同が多いので不可
    test: (l) =>
      /浅い睡眠時間|浅い時間|light時間|浅い睡眠|lightsleep/.test(l) &&
      !/^浅い$|^light$/i.test(l) &&
      !/率|percent|割合/.test(l),
    valueHint: "duration",
  },
  {
    key: "deepSleepRate",
    // 「深い睡眠率」明示。深い％ / 深い率 も可。裸の「深い」は不可
    test: (l) =>
      /深い睡眠率|深い睡眠%|深い睡眠％|深い割合|深い%|深い％|^深い率$|^深率$/.test(
        l,
      ) ||
      (/深い睡眠/.test(l) && /率|%|percent|割合/.test(l)),
    valueHint: "percent",
  },
  {
    key: "deepSleep",
    // 裸の「深い」は比較矢印・覚醒時間との取り違えが多いので不可
    test: (l) =>
      /深い睡眠時間|深い時間|deep時間|深い睡眠|deepsleep/.test(l) &&
      !/^深い$|^deep$/i.test(l) &&
      !/率|percent|割合/.test(l),
    valueHint: "duration",
  },
  // —— 総睡眠（見出し「睡眠時間」、または「○h ○○min 睡眠」カード）——
  {
    key: "sleepDuration",
    test: (l) =>
      (/^睡眠時間$/.test(l) ||
        // 詳細カード「5h 43min 睡眠」でラベルが「睡眠」になるケース
        /^睡眠$/.test(l)) &&
      !/レム|rem|浅い|light|深い|deep|負債|効率|スコア|潜時|全就床|就床|ノンレム|nrem|必要|目標|推奨|全体|ベッド|滞在/.test(
        l,
      ),
    valueHint: "duration",
  },
  {
    key: "sleepLatency",
    test: (l) =>
      /入眠潜時|入眠潜伏|潜時|latency|sleeplatency|入眠までの時間|入眠にかかった時間|寝つき時間/.test(
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
    test: (l) =>
      /睡眠負債|sleepdebt|^負債$|睡眠の負債|睡眠不足|不足睡眠|睡眠借金/.test(l),
    valueHint: "duration",
  },
  {
    key: "circadianRhythm",
    test: (l) => /体内時計|circadian|クロノ|位相|サーカディアン/.test(l),
  },
  {
    key: "respiratoryRate",
    test: (l) =>
      /呼吸速度|呼吸数|呼吸レート|respiratoryrate|respirationrate|平均呼吸/.test(
        l,
      ),
  },
  {
    key: "spo2",
    test: (l) =>
      /spo2|spo₂|血中酸素|酸素飽和|酸素飽和度|血中酸素濃度|酸素レベル|平均酸素|平均spo|平均酸素レベル|平均状態レベル|平均状熊レベル|状態レベル|平均酸素素レベル|酸素素レベル/.test(
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
      if (rule.key === "nonRemSleep") return "nonRemSleepRate";
      if (rule.key === "lightSleep") return "lightSleepRate";
      if (rule.key === "deepSleep") {
        const ln = normalizeLabel(label);
        // 裸の「深い」+ % は不可。「深い睡眠」に隣接する % のみ
        if (/^深い$|^deep$/i.test(ln)) continue;
        if (/深い睡眠/.test(ln)) return "deepSleepRate";
        continue;
      }
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
      rule.key === "nonRemSleep" &&
      looksPercent(value) &&
      !looksDuration(value)
    ) {
      return "nonRemSleepRate";
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
      // 裸の「深い」+ % は比較値・他行と取り違えやすいので deepSleepRate にしない
      const ln = normalizeLabel(label);
      if (/^深い$|^deep$/i.test(ln)) continue;
      // 「深い睡眠」に隣接する % のみ率として採用
      if (/深い睡眠/.test(ln)) return "deepSleepRate";
      continue;
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

  // 同一カード: 「心拍変動」＋値に平均 → 平均HRV（ラベル距離優先）
  if (
    isAvgHrvLabelOrSameCard(label, value) &&
    isAcceptableAvgHrvValue(value) &&
    valueShapeFitsKey("hrv", value)
  ) {
    return "hrv";
  }

  // 弱ラベル / 単位付き数値のみ → 周辺ラベルから推定
  if (!normalizeLabel(label) || isWeakContextLabel(label)) {
    // 「平均」＋安静時カード: ms なしの数値は HRV より安静時を優先
    if (
      /^(平均|avg|mean)$/i.test(normalizeLabel(label)) &&
      siblingLabels.some((x) => /安静時心拍|resting\s*hr|^rhr$/i.test(x.normalize("NFKC"))) &&
      !/\bms\b|ミリ秒/i.test(value) &&
      /^\d{2,3}/.test(value.normalize("NFKC").trim()) &&
      valueShapeFitsKey("restingHeartRate", value)
    ) {
      return "restingHeartRate";
    }
    const inferred = inferKeyFromUnitValue(value, siblingLabels, label);
    if (inferred && valueShapeFitsKey(inferred, value)) {
      return inferred;
    }
  }

  // ラベルが単位そのもの（bpm / ms / rpm）で値が数値の場合のみ推定
  // 「深い％」など項目+% を単位扱いにしない（覚醒率への誤推定を防ぐ）
  if (/^(bpm|ms|rpm|brpm|℃)$/i.test(label.trim())) {
    const unitAsLabel = inferKeyFromUnitValue(label, siblingLabels, label);
    if (unitAsLabel && /^\s*[+-]?\d+(\.\d+)?/.test(value)) {
      const combined = `${value} ${label}`;
      if (valueShapeFitsKey(unitAsLabel, combined)) {
        return unitAsLabel;
      }
    }
  }

  const fromValueUnit = inferKeyFromUnitValue(value, siblingLabels, label);
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

  // 「23:40 - 06:20」「02:10|07:57」「02:10\n07:57」など（睡眠カード右の縦並び含む）
  if (!out.bedtime || !out.wakeTime) {
    const range = blob.match(
      /(\d{1,2}\s*[:：]\s*\d{2})\s*(?:[-~〜～–—|/／]|と|\s+)\s*(\d{1,2}\s*[:：]\s*\d{2})/,
    );
    if (range) {
      const a = extractTimeToken(range[1]);
      const b = extractTimeToken(range[2]);
      if (a && b && a !== b) {
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
      // ホーム行の「睡眠」は QoL 円と取り違えやすいので弱める
      if (/^睡眠$/.test(l)) return 40;
      if (/^スコア$|^score$/.test(l)) return 35;
      return 20;

    case "restingHeartRate":
      // カード見出し「安静時心拍数」＋平均説明を最優先。最小・最大は別キーへ
      if (/安静時心拍/.test(l) && /平均|avg|average|mean/.test(l)) return 120;
      if (/resting\s*hr|restinghr|restingheartrate|^rhr$/i.test(l) && /平均|avg|mean/.test(l))
        return 120;
      if (/^(平均|avg|mean)$/.test(l)) return 115; // 安静時カード内の弱ラベル（sibling で紐付け時のみ到達）
      if (/^安静時心拍数$|^安静時心拍$/.test(l)) return 110;
      if (/^resting\s*hr$|^restinghr$|^restingheartrate$|^rhr$/i.test(l)) return 110;
      if (/安静時心拍|restinghr|restingheartrate|^rhr$/.test(l)) return 100;
      if (/安静時心拍/.test(l) && /(最小|min|最大|max)/.test(l)) return 15;
      if (/^(最小|min|最大|max)$/.test(l)) return 5;
      if (/最新|latest/.test(l)) return 0;
      if (/心拍数|heartrate|^心拍$|^hr$|平均心拍/.test(l)) return 0;
      return 0;

    case "restingHeartRateMin":
      if (/安静時心拍/.test(l) && /最小|min/.test(l)) return 120;
      if (/^(最小|min)$/.test(l)) return 80;
      return 20;

    case "restingHeartRateMax":
      if (/安静時心拍/.test(l) && /最大|max/.test(l)) return 120;
      if (/^(最大|max)$/.test(l)) return 80;
      return 20;

    case "sleepDuration":
      if (/必要睡眠|目標睡眠|推奨睡眠|全就床|就床時間|全体睡眠|ベッド滞在|滞在時間/.test(l))
        return 0;
      // 見出し「睡眠時間」完全一致のみ
      if (/^睡眠時間$/.test(l)) return 120;
      return 0;

    case "remSleep":
      if (/ノンレム|nrem|non.?rem/.test(l)) return 0;
      if (/レム睡眠時間|レム時間|rem時間/.test(l)) return 100;
      if (/レム睡眠|remsleep/.test(l)) return 95;
      if (/^レム$|^rem$/.test(l)) return 55;
      return 20;

    case "nonRemSleep":
      if (/ノンレム睡眠時間|ノンレム時間|nrem時間/.test(l)) return 100;
      if (/ノンレム睡眠|nonremsleep|nremsleep|^ノンレム$|^nrem$|nonrem/.test(l))
        return 80;
      return 20;

    case "lightSleep":
      if (/浅い睡眠時間|浅い時間|light時間/.test(l)) return 100;
      if (/浅い睡眠|lightsleep/.test(l)) return 95;
      if (/^浅い$|^light$/.test(l)) return 20;
      return 20;

    case "deepSleep":
      if (/深い睡眠時間|深い時間|deep時間/.test(l)) return 100;
      if (/深い睡眠|deepsleep/.test(l)) return 95;
      // 単独「深い」は比較矢印・他行との混同が多い
      if (/^深い$|^deep$/.test(l)) return 10;
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
      if (/平均hrv|hrv平均|平均心拍変動|心拍変動平均|平均rmssd|^rmssd$/.test(l))
        return 120;
      if (
        /心拍変動|hrv|rmssd|sdnn|心拍動/.test(l) &&
        /平均|avg|average|mean/.test(l) &&
        !/(最小|min|最大|max)/.test(l)
      )
        return 110;
      // 同一カード「心拍変動」見出し（値側の平均は呼び出し側で加点）
      if (/^(心拍変動|心拍動|hrv|rmssd)$/.test(l)) return 95;
      if (/心拍変動|hrv|rmssd|sdnn/.test(l) && /(最小|min|最大|max)/.test(l))
        return 0;
      return 0;

    case "hrvMax":
      if (/心拍変動|hrv|rmssd|sdnn/.test(l) && /最大|max/.test(l)) return 115;
      if (/^最大hrv$|^hrvmax$|^maxhrv$/.test(l)) return 110;
      if (/^最大$|^max$/.test(l)) return 70;
      return 20;

    case "hrvMin":
      if (/心拍変動|hrv|rmssd|sdnn/.test(l) && /最小|min/.test(l)) return 115;
      if (/^最小hrv$|^hrvmin$|^minhrv$/.test(l)) return 110;
      if (/^最小$|^min$/.test(l)) return 70;
      return 20;

    case "remSleepRate":
      if (/ノンレム|nrem|non.?rem/.test(l)) return 0;
      if (/レム睡眠率/.test(l)) return 100;
      if (/レム率|rem%|rempercent|レム割合/.test(l)) return 70;
      if (/^レム$|^rem$/.test(l)) return 30;
      return 20;

    case "deepSleepRate":
      if (/深い睡眠率/.test(l)) return 120;
      if (/深い睡眠/.test(l) && /率|%|percent|割合/.test(l)) return 100;
      if (/深い率|深率|深い割合|深い%|深い％/.test(l)) return 90;
      // 裸の「深い」は率に使わない
      if (/^深い$|^deep$/.test(l)) return 0;
      return 0;

    case "lightSleepRate":
      if (/浅い睡眠率/.test(l)) return 100;
      if (/浅い率|light%|lightpercent|浅い割合/.test(l)) return 70;
      if (/^浅い$|^light$/.test(l)) return 30;
      return 20;

    case "respiratoryRate":
      if (/呼吸速度|呼吸レート|respiratoryrate/.test(l)) return 110;
      if (/呼吸数|respiration|brpm|^rpm$/.test(l)) return 90;
      if (/^呼吸$/.test(l)) return 50;
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
    /レム睡眠|ノンレム|浅い睡眠|深い睡眠|覚醒時間|覚醒率|平均酸素/.test(joined);

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
    key === "nonRemSleep" ||
    key === "lightSleep" ||
    key === "deepSleep" ||
    key === "awakenings" ||
    key === "remSleepRate" ||
    key === "nonRemSleepRate" ||
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

  if (key === "hrv" || key === "hrvMax" || key === "hrvMin") {
    if (isVitalsDetail || /心拍変動|^hrv$/.test(joined)) score += 35;
    if (labels.some((l) => /心拍変動|^hrv$/.test(l))) score += 20;
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
      if (
        key === "bedtime" &&
        (looksLikeLatencyMisreadAsBedtime(value, label) ||
          looksLikeLatencyMisreadAsBedtime(stored, label))
      ) {
        return;
      }
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

  // ROI OCR では「安静時心拍数」見出しが落ち、「平均」「最小」だけ返ることがある
  if (screenType === "rhr" || screenType === "respiration") {
    for (const reading of readings) {
      const label = reading.label?.trim() ?? "";
      const value = normalizeValue(reading.value ?? "");
      if (!label || !value || !looksBpm(value)) continue;
      if (/\bms\b|ミリ秒/i.test(value)) continue;
      const l = normalizeLabel(label);
      if (
        !String(next.restingHeartRate).trim() &&
        (/^(平均|avg|mean)$/.test(l) ||
          (/安静時心拍/.test(l) && /平均|avg|mean/.test(l)))
      ) {
        trySet(
          "restingHeartRate",
          label,
          value,
          labelMatchScore("restingHeartRate", `${label} 平均`) || 78,
        );
      }
      if (
        !String(next.restingHeartRateMin).trim() &&
        (/^(最小|min)$/.test(l) ||
          (/安静時心拍/.test(l) && /最小|min/.test(l)))
      ) {
        trySet(
          "restingHeartRateMin",
          label,
          value,
          labelMatchScore("restingHeartRateMin", label) || 78,
        );
      }
      if (
        !String(next.restingHeartRateMax).trim() &&
        (/^(最大|max)$/.test(l) ||
          (/安静時心拍/.test(l) && /最大|max/.test(l)))
      ) {
        trySet(
          "restingHeartRateMax",
          label,
          value,
          labelMatchScore("restingHeartRateMax", label) || 78,
        );
      }
    }
  }

  // HRV 画面: 「平均HRV」系 / カード内「心拍変動」+平均 / 「平均」(ms) のみ。SpO₂・安静時は不可
  if (screenType === "hrv") {
    const hasRestingSibling = siblingLabels.some((x) =>
      /安静時心拍|resting\s*hr|^rhr$/i.test(x.normalize("NFKC")),
    );
    const restingNums = new Set(
      readings
        .filter((r) => isRestingHrAvgSiblingReading(r) || /安静時心拍|resting\s*hr|^rhr$/i.test((r.label ?? "").normalize("NFKC")))
        .filter((r) => looksBpm(String(r.value ?? "")))
        .map((r) => Number(String(r.value ?? "").replace(/[^\d.-]/g, "")))
        .filter((n) => Number.isFinite(n))
        .map((n) => Math.round(n)),
    );
    for (const reading of readings) {
      const label = reading.label?.trim() ?? "";
      const value = normalizeValue(reading.value ?? "");
      if (!label || !value) continue;
      const l = normalizeLabel(label);
      // ROI で「最大」「最小」が裸数字だけ返る場合も HRV に割り当てる
      if (
        !String(next.hrvMax).trim() &&
        (/^(最大|max)$/.test(l) ||
          /最大hrv|hrvmax|最大心拍変動/.test(l) ||
          (/心拍変動|hrv/.test(l) && /最大|max/.test(l))) &&
        looksHrvMs(value) &&
        !/\bbpm\b/i.test(value)
      ) {
        trySet(
          "hrvMax",
          label,
          value,
          labelMatchScore("hrvMax", label) || 80,
        );
      }
      if (
        !String(next.hrvMin).trim() &&
        (/^(最小|min)$/.test(l) ||
          /最小hrv|hrvmin|最小心拍変動/.test(l) ||
          (/心拍変動|hrv/.test(l) && /最小|min/.test(l))) &&
        looksHrvMs(value) &&
        !/\bbpm\b/i.test(value)
      ) {
        trySet(
          "hrvMin",
          label,
          value,
          labelMatchScore("hrvMin", label) || 80,
        );
      }
      if (!looksHrvMs(value)) continue;
      if (isHrvSpo2Collision(value, readings)) continue;
      if (String(next.hrv).trim()) continue;
      if (!isAcceptableAvgHrvValue(value)) continue;
      if (/最大|max|最小|min/.test(l) && !/平均|avg|mean/.test(l)) continue;
      const num = Number(String(value).replace(/[^\d.-]/g, ""));
      if (
        hasRestingSibling &&
        Number.isFinite(num) &&
        restingNums.has(Math.round(num))
      ) {
        continue;
      }
      const isWeakAvgMs =
        /^(平均|avg|mean)$/.test(l) &&
        !/最大|max|最小|min/.test(l) &&
        !hasRestingSibling;
      if (
        isAvgHrvLabelOrSameCard(label, value) ||
        isWeakAvgMs ||
        /平均hrv|hrv平均|平均心拍変動/.test(l)
      ) {
        trySet("hrv", label, value, labelMatchScore("hrv", label) || 80);
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
    (screenType === "bed_wake" ||
      screenType === "sleep_detail" ||
      screenType === "sleep_overview") &&
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
    // 「HH:mm - HH:mm」範囲（睡眠カード右）を入眠・起床に分解
    if (!String(next.bedtime).trim() || !String(next.wakeTime).trim()) {
      for (const reading of readings) {
        const compound = extractCriticalFromCompoundText(
          reading.label ?? "",
          reading.value ?? "",
        );
        if (compound.bedtime && !String(next.bedtime).trim()) {
          trySet("bedtime", reading.label || "複合:入眠", compound.bedtime, 88);
        }
        if (compound.wakeTime && !String(next.wakeTime).trim()) {
          trySet("wakeTime", reading.label || "複合:起床", compound.wakeTime, 88);
        }
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
    let value = normalizeValue(reading.value ?? "");
    if (!value) continue;
    // 数値のみ（ラベル空）も周辺ラベルから推定するため通す
    if (!label && !/^\s*[+-]?\d/.test(value) && !looksTime(value)) continue;

    let key = matchKey(label, value, siblingLabelsForMap);
    const hrvCompound = parseHrvCompoundValue(label, value);
    if (hrvCompound) {
      key = hrvCompound.key;
      value = normalizeValue(hrvCompound.value);
    }
    if (!key) {
      skippedLabels.push(label || `(value:${value})`);
      continue;
    }
    key = remapWeakMinMaxKey(key, label, value, siblingLabelsForMap);

    // ステージ画面の端点時刻を入眠・起床に誤マップしない
    if (
      screenType === "sleep_stages" &&
      (key === "bedtime" || key === "wakeTime")
    ) {
      skippedLabels.push(`${label}(blocked:${screenType})`);
      continue;
    }

    // 体内時計・ホーム等から入眠・起床を採らない。
    // 睡眠概要は「HH:mm - HH:mm」が入眠/起床の実表示なので許可する。
    if (
      (key === "bedtime" || key === "wakeTime") &&
      (screenType === "circadian" ||
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

    // 睡眠スコアはホーム／睡眠概要のみ（詳細・ステージ・HRV棒グラフでは採らない）
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
    // HRV 画面に同居する履歴スコア棒は睡眠スコアにしない
    if (
      key === "sleepScore" &&
      siblingLabelsForMap.some((x) =>
        /心拍変動|hrv|rmssd/i.test(x.normalize("NFKC")),
      )
    ) {
      skippedLabels.push(`${label}(blocked:hrv-chart:sleepScore)`);
      continue;
    }
    // ホームの「心拍数/最新」は安静時心拍にしない
    if (
      key === "restingHeartRate" &&
      (screenType === "home" ||
        /最新|latest/i.test(label) ||
        (/^心拍数$|^心拍$|^hr$|平均心拍/i.test(label.normalize("NFKC").trim()) &&
          !/安静時/.test(label)))
    ) {
      skippedLabels.push(`${label}(blocked:not-resting-hr)`);
      continue;
    }
    // 明示「安静時心拍」/ Resting HR / RHR、またはカード内弱ラベル（平均）＋周辺に安静時心拍がある場合のみ
    if (key === "restingHeartRate") {
      const labelN = label.normalize("NFKC");
      const hasExplicit =
        /安静時心拍|resting\s*hr|restinghr|restingheartrate|^rhr$/i.test(
          labelN,
        );
      const weakAvg =
        /^(平均|avg|mean)$/i.test(labelN.trim()) &&
        siblingLabelsForMap.some((x) =>
          /安静時心拍|resting\s*hr|^rhr$/i.test(x.normalize("NFKC")),
        ) &&
        looksBpm(value);
      if (!hasExplicit && !weakAvg) {
        skippedLabels.push(`${label}(blocked:not-resting-hr-label)`);
        continue;
      }
    }
    // 安静時心拍の「最小」「最大」は別キーへ（上の remap で処理済み）。残った場合はスキップ
    if (
      key === "restingHeartRate" &&
      /(最小|最大|min|max)/i.test(label) &&
      !/平均|avg|mean/i.test(label)
    ) {
      skippedLabels.push(`${label}(blocked:rhr-minmax)`);
      continue;
    }
    // 見出し「安静時心拍数」の大きな数字は最小表示が多い。
    // 値内の「平均 N」または BPM 形状の平均行があれば平均を採用
    if (
      key === "restingHeartRate" &&
      /安静時心拍|resting\s*hr|^rhr$/i.test(label) &&
      !/平均|avg|mean/i.test(label)
    ) {
      const avgFromValue = extractRestingHrAverageToken(value);
      if (avgFromValue) {
        const display = normalizeMetricDisplayValue(
          "restingHeartRate",
          avgFromValue,
        );
        const matchScore = labelMatchScore("restingHeartRate", `${label} 平均`);
        const prev = bestLabelScore.restingHeartRate ?? -1;
        if (matchScore > prev || !String(next.restingHeartRate).trim()) {
          next.restingHeartRate = display;
          provenance.restingHeartRate = `${label}(平均)`;
          bestLabelScore.restingHeartRate = Math.max(matchScore, prev + 1);
          mappedLabels.push(`${label}→restingHeartRate(avg-in-value)`);
        }
        // 見出しの大きな数字は最小として保持
        const minNum = Number(String(value).replace(/[^\d.-]/g, ""));
        if (Number.isFinite(minNum) && !String(next.restingHeartRateMin).trim()) {
          next.restingHeartRateMin = normalizeMetricDisplayValue(
            "restingHeartRateMin",
            String(Math.round(minNum)),
          );
          provenance.restingHeartRateMin = label;
          bestLabelScore.restingHeartRateMin = 60;
        }
        continue;
      }
      const num = Number(String(value).replace(/[^\d.-]/g, ""));
      const avgSibling = readings.find((r) => isRestingHrAvgSiblingReading(r));
      if (avgSibling) {
        const avgNum = Number(
          String(avgSibling.value ?? "").replace(/[^\d.-]/g, ""),
        );
        const hasMinTwin =
          Number.isFinite(num) &&
          readings.some((r) => {
            const rl = (r.label ?? "").normalize("NFKC");
            const rv = Number(String(r.value ?? "").replace(/[^\d.-]/g, ""));
            return (
              /(最小|min)/i.test(rl) &&
              Number.isFinite(rv) &&
              Math.round(rv) === Math.round(num)
            );
          });
        // 平均と異なる、または最小行と同じ → 見出し側は最小表示として別キーへ
        if (
          (Number.isFinite(avgNum) && Math.round(avgNum) !== Math.round(num)) ||
          hasMinTwin
        ) {
          if (
            Number.isFinite(num) &&
            (!String(next.restingHeartRateMin).trim() ||
              (bestLabelScore.restingHeartRateMin ?? 0) < 70)
          ) {
            next.restingHeartRateMin = normalizeMetricDisplayValue(
              "restingHeartRateMin",
              String(Math.round(num)),
            );
            provenance.restingHeartRateMin = label;
            bestLabelScore.restingHeartRateMin = 70;
            mappedLabels.push(`${label}→restingHeartRateMin`);
          }
          skippedLabels.push(`${label}(blocked:rhr-min-display)`);
          continue;
        }
      }
      // 平均行が無い場合:
      // - rhr/respiration 画面（大きめ最小＋小さめ平均のUI）→ 見出しは最小扱い
      // - それ以外で最小シグナルも無い単純カード → 平均値として採用
      if (Number.isFinite(num)) {
        const hasMinSignal = readings.some((r) => {
          const rl = (r.label ?? "").normalize("NFKC");
          return /(最小|min)/i.test(rl) && !/平均|avg|mean/i.test(rl);
        });
        const treatAsMinCard =
          hasMinSignal ||
          screenType === "rhr" ||
          screenType === "respiration";
        if (treatAsMinCard) {
          if (
            !String(next.restingHeartRateMin).trim() ||
            (bestLabelScore.restingHeartRateMin ?? 0) < 65
          ) {
            next.restingHeartRateMin = normalizeMetricDisplayValue(
              "restingHeartRateMin",
              String(Math.round(num)),
            );
            provenance.restingHeartRateMin = label;
            bestLabelScore.restingHeartRateMin = 65;
            mappedLabels.push(`${label}→restingHeartRateMin(no-avg-sibling)`);
          }
          skippedLabels.push(`${label}(blocked:rhr-heading-without-avg)`);
          continue;
        }
      }
    }

    // 睡眠時間: 見出し「睡眠時間」完全一致のみ（就床・ベッド滞在・ステージ合計は不可）
    if (key === "sleepDuration") {
      const ln = normalizeLabel(label);
      if (
        !/^睡眠時間$/.test(ln) ||
        /ベッド|滞在|全就床|就床|必要|目標|推奨|レム|浅い|深い|ノンレム/.test(ln)
      ) {
        skippedLabels.push(`${label}(blocked:not-explicit-sleepDuration)`);
        continue;
      }
    }

    // 深い睡眠時間が覚醒時間と同値なら誤割当として捨てる
    if (key === "deepSleep") {
      const deepM = parseDurationMinutes(value);
      const awakeM = parseDurationMinutes(String(next.awakenings ?? ""));
      if (
        deepM != null &&
        awakeM != null &&
        Math.abs(deepM - awakeM) <= 1 &&
        !/深い睡眠/.test(normalizeLabel(label))
      ) {
        skippedLabels.push(`${label}(blocked:deep=awake)`);
        continue;
      }
      // 強い「深い睡眠」でも覚醒と同値なら比較値汚染の可能性 → 別候補待ち
      if (
        deepM != null &&
        awakeM != null &&
        Math.abs(deepM - awakeM) <= 1
      ) {
        skippedLabels.push(`${label}(blocked:deep=awake-strong)`);
        continue;
      }
    }
    // 深い睡眠率が浅い睡眠率と同値で、ラベルが弱い場合は捨てる
    if (key === "deepSleepRate") {
      const deepP = parsePercent(value);
      const lightP = parsePercent(String(next.lightSleepRate ?? ""));
      if (
        deepP != null &&
        lightP != null &&
        deepP === lightP &&
        !/深い睡眠率/.test(normalizeLabel(label))
      ) {
        skippedLabels.push(`${label}(blocked:deepRate=lightRate)`);
        continue;
      }
    }

    // 平均HRV: 平均HRV / 心拍変動の平均 / RMSSD、同一カードの心拍変動＋平均のみ。SpO₂の94は不可
    if (key === "hrv") {
      const isWeakAvgOnHrv =
        screenType === "hrv" &&
        /^(平均|avg|mean)$/.test(normalizeLabel(label)) &&
        looksHrvMs(value) &&
        !siblingLabelsForMap.some((x) =>
          /安静時心拍|resting\s*hr|^rhr$/i.test(x.normalize("NFKC")),
        );
      if (!isAvgHrvLabelOrSameCard(label, value) && !isWeakAvgOnHrv) {
        skippedLabels.push(`${label}(blocked:not-average-hrv)`);
        continue;
      }
      if (!isAcceptableAvgHrvValue(value)) {
        skippedLabels.push(`${label}(blocked:hrv-need-ms-or-avg)`);
        continue;
      }
      if (isHrvSpo2Collision(value, readings)) {
        skippedLabels.push(`${label}(blocked:spo2-as-hrv)`);
        continue;
      }
      // 安静時心拍数の数値を ms 付きで誤って HRV にしない
      if (
        siblingLabelsForMap.some((x) =>
          /安静時心拍|resting\s*hr|^rhr$/i.test(x.normalize("NFKC")),
        )
      ) {
        const hrvNum = Number(String(value).replace(/[^\d.-]/g, ""));
        const matchesResting = readings.some((r) => {
          const rl = (r.label ?? "").normalize("NFKC");
          if (
            !/安静時心拍|resting\s*hr|^rhr$|^(平均|avg|mean)$/i.test(rl)
          ) {
            return false;
          }
          if (/心拍変動|hrv/i.test(rl)) return false;
          if (/^(平均|avg|mean)$/i.test(rl.trim()) && !looksBpm(String(r.value ?? ""))) {
            return false;
          }
          const rv = Number(String(r.value ?? "").replace(/[^\d.-]/g, ""));
          return (
            Number.isFinite(hrvNum) &&
            Number.isFinite(rv) &&
            Math.round(hrvNum) === Math.round(rv)
          );
        });
        if (matchesResting) {
          skippedLabels.push(`${label}(blocked:rhr-as-hrv)`);
          continue;
        }
      }
    }

    // stress / skin_temp からステージ等を採らない（睡眠時間・呼吸・安静時は明示ラベルなら可）
    if (
      (screenType === "stress" || screenType === "skin_temp") &&
      (key === "awakenings" ||
        key === "awakeningRate" ||
        key === "remSleep" ||
        key === "remSleepRate" ||
        key === "lightSleep" ||
        key === "lightSleepRate" ||
        key === "deepSleep" ||
        key === "deepSleepRate" ||
        key === "nonRemSleep" ||
        key === "nonRemSleepRate" ||
        key === "sleepEfficiency" ||
        key === "sleepDebt" ||
        key === "sleepLatency" ||
        key === "circadianRhythm")
    ) {
      skippedLabels.push(`${label}(blocked:${screenType}:${key})`);
      continue;
    }
    // HRV 画面: ステージ汚染は防ぐが、呼吸速度・安静時心拍の明示ラベルは通す
    if (
      screenType === "hrv" &&
      (key === "sleepDuration" ||
        key === "awakenings" ||
        key === "awakeningRate" ||
        key === "remSleep" ||
        key === "remSleepRate" ||
        key === "lightSleep" ||
        key === "lightSleepRate" ||
        key === "deepSleep" ||
        key === "deepSleepRate" ||
        key === "nonRemSleep" ||
        key === "nonRemSleepRate" ||
        key === "sleepEfficiency" ||
        key === "sleepDebt" ||
        key === "sleepLatency" ||
        key === "circadianRhythm")
    ) {
      skippedLabels.push(`${label}(blocked:${screenType}:${key})`);
      continue;
    }

    // 呼吸速度: 明示ラベル必須。画面種別（hrv 含む）では落とさない
    if (
      key === "respiratoryRate" &&
      !/呼吸速度|呼吸レート|呼吸数|respiratoryrate/i.test(label)
    ) {
      skippedLabels.push(`${label}(blocked:weak-resp-label)`);
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

    const matchScore = (() => {
      let score = labelMatchScore(key, label);
      // 同一カード: 心拍変動＋値の平均はラベル距離として加点
      if (
        key === "hrv" &&
        /^(心拍変動|心拍動|hrv|rmssd)$/.test(normalizeLabel(label)) &&
        /平均|avg|mean/i.test(value)
      ) {
        score = Math.max(score, 115);
      }
      // ms 明示は裸数字よりラベル近傍として優先
      if (key === "hrv" && /\bms\b|ミリ秒/i.test(value)) {
        score += 5;
      }
      return score;
    })();

    if (key === "sleepScore") {
      const score = parseSleepScore(value);
      if (score == null) {
        skippedLabels.push(label);
        continue;
      }
      // 同一画面の心拍数と同一数値は睡眠スコアではない（ホーム「最新 76」の取り違え）
      const looksLikeHeartRate = readings.some((r) => {
        const rl = (r.label || "").normalize("NFKC");
        const rv = (r.value || "").normalize("NFKC");
        if (!/心拍|heartrate|^hr$|bpm/i.test(rl) && !/bpm/i.test(rv)) {
          return false;
        }
        const hn = Number(String(rv).replace(/[^\d.-]/g, ""));
        return Number.isFinite(hn) && Math.round(hn) === score;
      });
      if (looksLikeHeartRate && !/睡眠スコア|sleepscore/i.test(label)) {
        skippedLabels.push(`${label}(blocked:hr-collision:${score})`);
        continue;
      }
      // 「睡眠」単独より「睡眠スコア」を優先（既に実装の matchScore）
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
    const empty = !String(next[key] ?? "").trim();
    const betterRhr =
      key === "restingHeartRate" &&
      matchScore >= prev - 15 &&
      !/(最小|最大|min|max)/i.test(label) &&
      preferRestingHeartRateValue(String(next[key] ?? ""), value);
    // 平均HRV: ms 付き・同一カード平均を、SpO₂由来の裸数字より優先
    const betterHrv =
      key === "hrv" &&
      matchScore >= prev - 20 &&
      (() => {
        const prevRaw = String(next.hrv ?? "");
        if (!prevRaw.trim()) return false;
        const nextHasMs = /\bms\b|ミリ秒/i.test(value);
        const prevHasMs = /\bms\b|ミリ秒/i.test(prevRaw);
        if (nextHasMs && !prevHasMs) return true;
        if (
          /平均|avg|mean/i.test(value) &&
          !/平均|avg|mean/i.test(prevRaw) &&
          nextHasMs
        ) {
          return true;
        }
        return false;
      })();
    // 深い睡眠率: レム率と同値の誤読を、別の深い睡眠率候補で置き換え
    const betterDeepRate =
      key === "deepSleepRate" &&
      matchScore >= prev &&
      (() => {
        const remP = parsePercent(String(next.remSleepRate ?? ""));
        const awakeP = parsePercent(String(next.awakeningRate ?? ""));
        const prevP = parsePercent(String(next.deepSleepRate ?? ""));
        const nextP = parsePercent(value);
        if (nextP == null) return false;
        if (
          remP != null &&
          prevP === remP &&
          nextP !== remP &&
          /深い睡眠率/.test(label)
        ) {
          return true;
        }
        if (
          awakeP != null &&
          prevP === awakeP &&
          nextP !== awakeP &&
          /深い睡眠率/.test(label)
        ) {
          return true;
        }
        return false;
      })();
    if (
      matchScore > prev ||
      (matchScore === prev && empty) ||
      betterRhr ||
      betterHrv ||
      betterDeepRate
    ) {
      if (key === "bedtime" || key === "wakeTime") {
        const time = extractTimeToken(value) || normalizeTimeToHHMM(value);
        if (!/^\d{2}:\d{2}$/.test(time)) {
          skippedLabels.push(`${label}(invalid-time)`);
          continue;
        }
        if (
          key === "bedtime" &&
          (looksLikeLatencyMisreadAsBedtime(value, label) ||
            looksLikeLatencyMisreadAsBedtime(time, label))
        ) {
          skippedLabels.push(`${label}(blocked:latency-as-bedtime)`);
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

  // 睡眠時間: 見出し「睡眠時間」完全一致の値だけを対象（就床・ベッド滞在・計算は使わない）
  // HRV/ステージ等では睡眠時間を採らない（誤ラベル汚染防止）
  if (
    screenType == null ||
    screenType === "other" ||
    screenType === "sleep_overview" ||
    screenType === "sleep_detail" ||
    screenType === "home"
  ) {
    const durationVotes = new Map<
      number,
      { value: string; label: string; count: number }
    >();
    for (const reading of readings) {
      const label = normalizeLabel(reading.label ?? "");
      if (!/^睡眠時間$/.test(label)) continue;
      const raw = normalizeValue(reading.value ?? "");
      if (!raw || !valueShapeFitsKey("sleepDuration", raw)) continue;
      const minutes = parseDurationMinutes(raw);
      if (minutes == null) continue;
      const display = normalizeMetricDisplayValue("sleepDuration", raw);
      const prev = durationVotes.get(minutes);
      if (!prev) {
        durationVotes.set(minutes, { value: display, label, count: 1 });
      } else {
        prev.count += 1;
        // 同じ分なら「N時間M分」表記を優先
        if (/\d+\s*時間/.test(display) && !/\d+\s*時間/.test(prev.value)) {
          prev.value = display;
          prev.label = label;
        }
      }
    }
    if (durationVotes.size > 0) {
      const best = [...durationVotes.values()].sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return 0;
      })[0];
      if (best) {
        next.sleepDuration = best.value;
        provenance.sleepDuration = best.label;
        bestLabelScore.sleepDuration = labelMatchScore(
          "sleepDuration",
          best.label,
        );
      }
    }
  }

  // 平均HRV: 平均HRV / 心拍変動の平均 / 同一カード「心拍変動」+平均。SpO₂ 94 は除外
  if (screenType == null || screenType === "other" || screenType === "hrv") {
    const hasRestingSibling = readings.some((r) =>
      /安静時心拍|resting\s*hr|^rhr$/i.test((r.label ?? "").normalize("NFKC")),
    );
    const restingNums = new Set(
      readings
        .filter(
          (r) =>
            isRestingHrAvgSiblingReading(r) ||
            (/安静時心拍|resting\s*hr|^rhr$/i.test(
              (r.label ?? "").normalize("NFKC"),
            ) &&
              looksBpm(String(r.value ?? ""))),
        )
        .map((r) => Number(String(r.value ?? "").replace(/[^\d.-]/g, "")))
        .filter((n) => Number.isFinite(n))
        .map((n) => Math.round(n)),
    );
    const hrvVotes = new Map<
      string,
      { value: string; label: string; count: number; score: number }
    >();
    for (const reading of readings) {
      const label = normalizeLabel(reading.label ?? "");
      const raw = normalizeValue(reading.value ?? "");
      if (!raw || !looksHrvMs(raw)) continue;
      if (!isAcceptableAvgHrvValue(raw)) continue;
      if (isHrvSpo2Collision(raw, readings)) continue;
      if (/最小|最大|min|max/.test(label) && !/平均|avg|mean/.test(label)) {
        continue;
      }
      const isAvgHrv = isAvgHrvLabelOrSameCard(reading.label ?? "", raw);
      const isWeakAvg =
        screenType === "hrv" &&
        /^(平均|avg|mean)$/.test(label) &&
        !hasRestingSibling;
      if (!isAvgHrv && !isWeakAvg) continue;
      // 安静時心拍と同じ数字の ms は平均HRVにしない
      const num = Number(String(raw).replace(/[^\d.-]/g, ""));
      if (
        hasRestingSibling &&
        Number.isFinite(num) &&
        restingNums.has(Math.round(num))
      ) {
        continue;
      }
      const display = normalizeMetricDisplayValue("hrv", raw);
      const key = display.replace(/\s/g, "").toLowerCase();
      // ms 明示・同一カード平均を優先
      let score = isAvgHrv ? 2 : 1;
      if (/\bms\b|ミリ秒/i.test(raw)) score += 2;
      if (/平均|avg|mean/i.test(raw)) score += 1;
      const prev = hrvVotes.get(key);
      if (!prev) {
        hrvVotes.set(key, {
          value: display,
          label: reading.label ?? label,
          count: 1,
          score,
        });
      } else {
        prev.count += 1;
        if (score > prev.score) {
          prev.value = display;
          prev.label = reading.label ?? label;
          prev.score = score;
        }
      }
    }
    if (hrvVotes.size > 0) {
      const best = [...hrvVotes.values()].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.count !== a.count) return b.count - a.count;
        return 0;
      })[0];
      if (best) {
        next.hrv = best.value;
        provenance.hrv = best.label;
        bestLabelScore.hrv = labelMatchScore("hrv", best.label);
      }
    }
  }

  // 深い睡眠率: 明示「深い睡眠率」/「深い睡眠」+％だけを多数決（浅い率・計算・他画面は使わない）
  if (screenType == null || screenType === "other" || screenType === "sleep_stages") {
    const rateVotes = new Map<
      number,
      { value: string; label: string; count: number; score: number }
    >();
    for (const reading of readings) {
      const label = normalizeLabel(reading.label ?? "");
      const raw = normalizeValue(reading.value ?? "");
      if (!raw || !looksPercent(raw) || looksDuration(raw)) continue;
      const isExplicitRate = /深い睡眠率/.test(label);
      const isDeepSleepPct =
        /深い睡眠/.test(label) && !/浅い|レム|覚醒|ノンレム/.test(label);
      if (!isExplicitRate && !isDeepSleepPct) continue;
      if (/^深い$|^deep$/i.test(label)) continue;
      const pct = parsePercent(raw);
      if (pct == null) continue;
      // 浅い睡眠率と同値の候補は明示「深い睡眠率」以外捨てる
      const lightP = parsePercent(String(next.lightSleepRate ?? ""));
      if (
        lightP != null &&
        pct === lightP &&
        !isExplicitRate
      ) {
        continue;
      }
      const display = normalizeMetricDisplayValue("deepSleepRate", raw);
      const score = isExplicitRate ? 2 : 1;
      const prev = rateVotes.get(pct);
      if (!prev) {
        rateVotes.set(pct, { value: display, label, count: 1, score });
      } else {
        prev.count += 1;
        if (score > prev.score) {
          prev.value = display;
          prev.label = label;
          prev.score = score;
        }
      }
    }
    if (rateVotes.size > 0) {
      const best = [...rateVotes.values()].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.count !== a.count) return b.count - a.count;
        if (/深い睡眠率/.test(a.label) && !/深い睡眠率/.test(b.label)) return -1;
        if (/深い睡眠率/.test(b.label) && !/深い睡眠率/.test(a.label)) return 1;
        return 0;
      })[0];
      if (best) {
        next.deepSleepRate = best.value;
        provenance.deepSleepRate = best.label;
        bestLabelScore.deepSleepRate = labelMatchScore(
          "deepSleepRate",
          best.label,
        );
      }
    }
  }

  // 深い睡眠時間: 「深い睡眠」明示のみ多数決。覚醒時間と同値は除外
  if (screenType == null || screenType === "other" || screenType === "sleep_stages") {
    const durVotes = new Map<
      number,
      { value: string; label: string; count: number; score: number }
    >();
    const awakeM = parseDurationMinutes(String(next.awakenings ?? ""));
    for (const reading of readings) {
      const label = normalizeLabel(reading.label ?? "");
      const raw = normalizeValue(reading.value ?? "");
      if (!raw || !looksDuration(raw) || looksPercent(raw)) continue;
      if (!/深い睡眠/.test(label) || /浅い|レム|覚醒|ノンレム|率/.test(label)) {
        continue;
      }
      if (/^深い$|^deep$/i.test(label)) continue;
      const mins = parseDurationMinutes(raw);
      if (mins == null) continue;
      if (awakeM != null && Math.abs(mins - awakeM) <= 1) continue;
      const display = normalizeMetricDisplayValue("deepSleep", raw);
      const score = /深い睡眠時間|深い時間/.test(label) ? 2 : 1;
      const prev = durVotes.get(mins);
      if (!prev) {
        durVotes.set(mins, { value: display, label, count: 1, score });
      } else {
        prev.count += 1;
        if (score > prev.score) {
          prev.value = display;
          prev.label = label;
          prev.score = score;
        }
      }
    }
    if (durVotes.size > 0) {
      const best = [...durVotes.values()].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (b.count !== a.count) return b.count - a.count;
        return 0;
      })[0];
      if (best) {
        next.deepSleep = best.value;
        provenance.deepSleep = best.label;
        bestLabelScore.deepSleep = labelMatchScore("deepSleep", best.label);
      }
    }
  }

  // 浅い睡眠時間: 「浅い睡眠」明示。比較値（前日）より本日値を、睡眠時間整合で優先
  if (screenType == null || screenType === "other" || screenType === "sleep_stages") {
    const lightVotes: Array<{
      value: string;
      label: string;
      mins: number;
      score: number;
    }> = [];
    for (const reading of readings) {
      const label = normalizeLabel(reading.label ?? "");
      const raw = normalizeValue(reading.value ?? "");
      if (!raw || !looksDuration(raw) || looksPercent(raw)) continue;
      if (!/浅い睡眠/.test(label) || /深い|レム|覚醒|ノンレム|率/.test(label)) {
        continue;
      }
      if (/^浅い$|^light$/i.test(label)) continue;
      const mins = parseDurationMinutes(raw);
      if (mins == null) continue;
      const display = normalizeMetricDisplayValue("lightSleep", raw);
      const score = /浅い睡眠時間|浅い時間/.test(label) ? 2 : 1;
      lightVotes.push({ value: display, label, mins, score });
    }
    if (lightVotes.length > 0) {
      let sleepM = parseDurationMinutes(String(next.sleepDuration ?? ""));
      if (sleepM == null) {
        for (const reading of readings) {
          const label = normalizeLabel(reading.label ?? "");
          if (!/^睡眠時間$/.test(label)) continue;
          sleepM = parseDurationMinutes(normalizeValue(reading.value ?? ""));
          if (sleepM != null) break;
        }
      }
      const remM = parseDurationMinutes(String(next.remSleep ?? ""));
      const deepM = parseDurationMinutes(String(next.deepSleep ?? ""));
      const ranked = [...lightVotes].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        if (sleepM != null && remM != null && deepM != null) {
          const target = sleepM - remM - deepM;
          const da = Math.abs(a.mins - target);
          const db = Math.abs(b.mins - target);
          if (da !== db) return da - db;
        }
        // 同スコアで整合が取れないとき、同一ラベルの複数時間は短い方（比較値は前日で長いことが多い）
        return a.mins - b.mins;
      });
      const best = ranked[0];
      if (best) {
        next.lightSleep = best.value;
        provenance.lightSleep = best.label;
        bestLabelScore.lightSleep = labelMatchScore("lightSleep", best.label);
      }
    }
  }

  // 最終整合: 深い＝覚醒、深い率＝浅い率 なら破棄して再候補を探す
  {
    const awakeM = parseDurationMinutes(String(next.awakenings ?? ""));
    const deepM = parseDurationMinutes(String(next.deepSleep ?? ""));
    if (
      awakeM != null &&
      deepM != null &&
      Math.abs(awakeM - deepM) <= 1
    ) {
      next.deepSleep = "";
      delete provenance.deepSleep;
      delete bestLabelScore.deepSleep;
    }
    const lightP = parsePercent(String(next.lightSleepRate ?? ""));
    const deepP = parsePercent(String(next.deepSleepRate ?? ""));
    if (lightP != null && deepP != null && lightP === deepP) {
      const src = provenance.deepSleepRate ?? "";
      if (!/深い睡眠率/.test(src.normalize("NFKC"))) {
        next.deepSleepRate = "";
        delete provenance.deepSleepRate;
        delete bestLabelScore.deepSleepRate;
      }
    }
  }

  // HRV 最大/最小: 画面種別を問わず、心拍変動カード内の弱ラベル・複合値から取得
  {
    const hasHrvMsReading = readings.some((r) =>
      /\bms\b|ミリ秒/i.test(String(r.value ?? "")),
    );
    const hasHrv = siblingLabelsForMap.some((x) =>
      /心拍変動|hrv|rmssd|sdnn|心拍動/i.test(x.normalize("NFKC")),
    ) || hasHrvMsReading;
    if (hasHrv) {
      for (const reading of readings) {
        const label = reading.label?.trim() ?? "";
        const rawValue = normalizeValue(reading.value ?? "");
        if (!label || !rawValue) continue;
        const compound = parseHrvCompoundValue(label, rawValue);
        const l = normalizeLabel(label);
        const targets: Array<{ key: "hrv" | "hrvMax" | "hrvMin"; value: string; score: number }> =
          [];
        if (compound) {
          targets.push({
            key: compound.key,
            value: compound.value,
            score: labelMatchScore(compound.key, label) || 80,
          });
        } else if (looksHrvMs(rawValue) && !isHrvSpo2Collision(rawValue, readings)) {
          if (/平均|avg|mean/.test(l) && !/最大|max|最小|min/.test(l)) {
            targets.push({
              key: "hrv",
              value: rawValue,
              score: labelMatchScore("hrv", label) || 75,
            });
          }
          if (/最大|max/.test(l) && !/平均|avg|mean/.test(l)) {
            targets.push({
              key: "hrvMax",
              value: rawValue,
              score: labelMatchScore("hrvMax", label) || 75,
            });
          }
          if (/最小|min/.test(l) && !/平均|avg|mean/.test(l)) {
            targets.push({
              key: "hrvMin",
              value: rawValue,
              score: labelMatchScore("hrvMin", label) || 75,
            });
          }
        }
        for (const t of targets) {
          const prev = bestLabelScore[t.key] ?? -1;
          if (t.score > prev || !String(next[t.key]).trim()) {
            next[t.key] = normalizeMetricDisplayValue(t.key, t.value);
            provenance[t.key] = label;
            bestLabelScore[t.key] = t.score;
            mappedLabels.push(`${label}→${t.key}`);
          }
        }
      }
    }
  }

  // 安静時の最小/最大弱ラベル（カード内）
  {
    const hasRhr = siblingLabelsForMap.some((x) =>
      /安静時心拍|resting\s*hr|^rhr$/i.test(x.normalize("NFKC")),
    );
    const hasHrvCard = siblingLabelsForMap.some((x) =>
      /心拍変動|hrv|rmssd|sdnn|心拍動/i.test(x.normalize("NFKC")),
    );
    // HRV カードの「最大」は restingHeartRateMax にしない
    if (hasRhr && !(hasHrvCard && screenType === "hrv")) {
      for (const reading of readings) {
        const label = reading.label?.trim() ?? "";
        const value = normalizeValue(reading.value ?? "");
        if (!label || !value || !looksBpm(value)) continue;
        if (/\bms\b|ミリ秒/i.test(value)) continue;
        const l = normalizeLabel(label);
        if (
          !String(next.restingHeartRateMin).trim() &&
          (/^(最小|min)$/.test(l) ||
            (/安静時心拍/.test(l) && /最小|min/.test(l)))
        ) {
          next.restingHeartRateMin = normalizeMetricDisplayValue(
            "restingHeartRateMin",
            value,
          );
          provenance.restingHeartRateMin = label;
          bestLabelScore.restingHeartRateMin = 80;
        }
        if (
          !String(next.restingHeartRateMax).trim() &&
          (/安静時心拍/.test(l) && /最大|max/.test(l)) &&
          !hasHrvCard
        ) {
          next.restingHeartRateMax = normalizeMetricDisplayValue(
            "restingHeartRateMax",
            value,
          );
          provenance.restingHeartRateMax = label;
          bestLabelScore.restingHeartRateMax = 80;
        }
      }
    }
  }

  applyScreenContextFallbacks(
    readings,
    screenType,
    next,
    provenance,
    bestLabelScore,
  );

  // 入眠時間に潜時が残っていたら破棄（フォールバック経路の取り違え）
  if (
    String(next.bedtime).trim() &&
    looksLikeLatencyMisreadAsBedtime(
      String(next.bedtime),
      provenance.bedtime ?? "入眠時間",
    )
  ) {
    next.bedtime = "";
    delete provenance.bedtime;
    delete bestLabelScore.bedtime;
  }
  {
    const latM = parseDurationMinutes(String(next.sleepLatency ?? ""));
    const bed = String(next.bedtime ?? "").trim();
    if (latM != null && bed) {
      const bedAsDur = parseDurationMinutes(bed);
      if (bedAsDur != null && Math.abs(bedAsDur - latM) <= 1) {
        next.bedtime = "";
        delete provenance.bedtime;
        delete bestLabelScore.bedtime;
      }
    }
  }

  // 深い睡眠＝表示上のノンレム（浅いとの合算はしない）
  applyNonRemFromStageOcr(next);

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
    if (
      !next.bedtime.trim() &&
      compound.bedtime &&
      !looksLikeLatencyMisreadAsBedtime(
        compound.bedtime,
        reading.label || "入眠時間",
      )
    ) {
      next.bedtime = compound.bedtime;
    }
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
    if (
      !next.bedtime.trim() &&
      ungated.metrics.bedtime.trim() &&
      !looksLikeLatencyMisreadAsBedtime(
        ungated.metrics.bedtime,
        ungated.provenance.bedtime ?? "入眠時間",
      )
    ) {
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
    if (
      !next.bedtime.trim() &&
      compound.bedtime &&
      !looksLikeLatencyMisreadAsBedtime(compound.bedtime, "入眠時間")
    ) {
      next.bedtime = compound.bedtime;
    }
    if (!next.wakeTime.trim() && compound.wakeTime) {
      next.wakeTime = compound.wakeTime;
    }
  }

  // HRV 最大の誤流入を安静時最大から除去
  if (
    isMetricPresent(next, "restingHeartRateMax") &&
    isMetricPresent(next, "hrvMax")
  ) {
    const rhrMaxN = Number(
      String(next.restingHeartRateMax).replace(/[^\d.-]/g, ""),
    );
    const hrvMaxN = Number(String(next.hrvMax).replace(/[^\d.-]/g, ""));
    if (
      Number.isFinite(rhrMaxN) &&
      Number.isFinite(hrvMaxN) &&
      Math.round(rhrMaxN) === Math.round(hrvMaxN)
    ) {
      next.restingHeartRateMax = "";
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
 * 確認画面はこの結果をそのままフォーム初期値にする。
 */
export function mergeMetricsFromVisibleReadings(
  apiMetrics: Partial<AnalysisMetrics> | undefined,
  readings: VisibleReading[],
): AnalysisMetrics {
  const fromApi = normalizeMetrics(apiMetrics);

  if (readings.length === 0) {
    applyNonRemFromStageOcr(fromApi);
    return fromApi;
  }

  const fromReadings = mapVisibleReadingsToMetrics(readings);
  const merged = emptyMetrics();

  for (const key of Object.keys(merged) as MetricFieldKey[]) {
    // sleepDuration / hrv: API に値があれば絶対優先。readings で上書きしない（空のときだけ補完）
    if (key === "sleepDuration" || key === "hrv") {
      if (isMetricPresent(fromApi, key)) {
        merged[key] = fromApi[key];
      } else if (isMetricPresent(fromReadings, key)) {
        merged[key] = fromReadings[key];
      }
      continue;
    }
    // 呼吸速度・安静時心拍・深い睡眠率: 明示ラベル readings を API より優先（空上書き禁止）
    // deepSleep（時間）は触らない
    if (
      key === "respiratoryRate" ||
      key === "restingHeartRate" ||
      key === "deepSleepRate"
    ) {
      if (isMetricPresent(fromReadings, key)) {
        merged[key] = fromReadings[key];
      } else if (isMetricPresent(fromApi, key)) {
        merged[key] = fromApi[key];
      }
      continue;
    }
    if (isMetricPresent(fromApi, key)) {
      if (key === "sleepScore") {
        merged.sleepScore = fromApi.sleepScore;
      } else {
        merged[key] = fromApi[key];
      }
      continue;
    }
    // 固定画面キー: API を正とする。API が空のときだけ readings で補完（空上書き禁止）
    if (isStrictSourceScreenKey(key)) {
      if (isMetricPresent(fromReadings, key)) {
        if (key === "sleepScore") {
          merged.sleepScore = fromReadings.sleepScore;
        } else {
          merged[key] = fromReadings[key];
        }
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

  // API の深い睡眠が覚醒時間と同一なら誤写とみなし、readings の「深い睡眠」で差し替え
  const awakeMin = parseDurationMinutes(merged.awakenings);
  const deepMin = parseDurationMinutes(merged.deepSleep);
  if (
    awakeMin != null &&
    deepMin != null &&
    Math.abs(awakeMin - deepMin) <= 1 &&
    isMetricPresent(fromReadings, "deepSleep")
  ) {
    const readingDeep = parseDurationMinutes(fromReadings.deepSleep);
    if (readingDeep != null && Math.abs(readingDeep - awakeMin) > 1) {
      merged.deepSleep = fromReadings.deepSleep;
      if (isMetricPresent(fromReadings, "deepSleepRate")) {
        merged.deepSleepRate = fromReadings.deepSleepRate;
      }
    }
  }

  const mergedMetrics = normalizeMetrics(merged);
  // visibleReadings には「ノンレム」行が無いことが多い。
  // API metrics に無くても深い睡眠があればノンレムへ写す（浅いと合算しない）。
  applyNonRemFromStageOcr(mergedMetrics);
  return mergedMetrics;
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

    // value が空でも、label に「ラベル: 値」や「ラベル 値」が埋め込まれていることがある
    if (!value && label) {
      const colonSplit = label.match(/^(.+?)\s*[:：]\s*(.+)$/);
      if (colonSplit) {
        label = colonSplit[1]!.trim();
        value = colonSplit[2]!.trim();
      } else {
        const withUnit = label.match(
          /^(.+?)\s*([+-]?\d+(?:\.\d+)?\s*(?:%|％|℃|°\s*[cｃ]|rpm|brpm|ms|分|時間|h|min))$/i,
        );
        if (withUnit) {
          label = withUnit[1]!.trim();
          value = withUnit[2]!.trim();
        } else {
          const sleepDetailValue = label.match(
            /^(.+?)\s*([+-]?\d+(?:\.\d+)?(?:\s*分)?)$/i,
          );
          if (
            sleepDetailValue &&
            /(潜時|負債|体内時計|呼吸|spo2|spo₂|酸素)/i.test(sleepDetailValue[1] ?? "")
          ) {
            label = sleepDetailValue[1]!.trim();
            value = sleepDetailValue[2]!.trim();
          } else {
            const circadianText = label.match(
              /^(体内時計|circadian)\s+(.+)$/i,
            );
            if (circadianText) {
              label = circadianText[1]!.trim();
              value = circadianText[2]!.trim();
            }
          }
        }
      }
    }

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
