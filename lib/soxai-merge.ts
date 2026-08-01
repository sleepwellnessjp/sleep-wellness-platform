import {
  isPlausibleSleepLatency,
  labelMatchScore,
  looksLikeLatencyMisreadAsBedtime,
  screenTypeScore,
  type MetricProvenance,
  type VisibleReading,
} from "@/lib/soxai-reading-map";
import {
  collectedMetricKeys,
  emptyMetrics,
  isMetricPresent,
  metricDisplayValue,
  normalizeMetrics,
  SOXAI_METRIC_FIELDS,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import { normalizeTimeToHHMM } from "@/lib/soxai-structured-metrics";
import { normalizeMetricsForDisplay } from "@/lib/soxai-display-normalize";
import { parseDurationMinutes, parsePercent } from "@/lib/soxai-graphs";
import {
  inferScreenTypeFromReadings,
  isCriticalOcrKey,
  isHomeAuthoritativeKey,
  isLockedAuthoritativeScreen,
  isPrimaryMetricForScreen,
  isStrictSourceScreenKey,
  lockedScreensForKey,
  metricScreenRank,
  screenAffinityScore,
  type SoxaiScreenType,
} from "@/lib/soxai-screen";
import { normalizeComparableValue } from "@/lib/soxai-value-normalize";

export type ImageExtractResult = {
  imageIndex: number;
  metrics: AnalysisMetrics;
  visibleReadingCount: number;
  /** その画像の OCR ラベル一覧（競合解決用） */
  readings?: VisibleReading[];
  /** 各メトリクスの出典ラベル */
  provenance?: MetricProvenance;
  /** SOXAI画面種別 */
  screenType?: SoxaiScreenType;
};

export type MergedMetricConflict = {
  key: MetricFieldKey;
  label: string;
  adopted: string;
  alternatives: string[];
};

export type MetricConfidenceMap = Partial<Record<MetricFieldKey, number>>;

export type MergedExtractResult = {
  metrics: AnalysisMetrics;
  conflicts: MergedMetricConflict[];
  confidence: MetricConfidenceMap;
};

/** 0–1。確認画面で「低信頼度」判定に使う閾値 */
export const OCR_LOW_CONFIDENCE_THRESHOLD = 0.55;

/** 重点項目の最低ラベル一致スコア（これ未満は画面適合が無い限り捨てる） */
const MIN_CRITICAL_LABEL_SCORE = 55;
/** 一般項目の最低ラベル一致スコア */
const MIN_LABEL_SCORE = 20;

/** キー別の比較正規化（表記ゆれは同一キー） */
function normalizeComparable(key: MetricFieldKey, value: string): string {
  return normalizeComparableValue(key, value);
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

function looksBpmLike(value: string): boolean {
  const v = String(value ?? "").normalize("NFKC").trim();
  if (!v || /\bms\b|ミリ秒/i.test(v)) return false;
  if (/bpm|拍\/分/i.test(v)) return true;
  return /^\s*\d{2,3}(\.\d+)?\s*$/.test(v);
}

/**
 * 値形式の妥当性（タイブレーカー用。主判定には使わない）
 */
export function scoreValueReliability(
  key: MetricFieldKey,
  value: string,
  sourceLabel = "",
): number {
  const v = value.trim();
  if (!v) return -1;

  let score = 10;
  const label = sourceLabel
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s　_\-：:（）()【】\[\]「」『』]/g, "");

  if (key === "sleepScore") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 0 && n <= 100) score += 20;
    else score -= 5;
  }

  if (
    key === "sleepEfficiency" ||
    key === "awakeningRate" ||
    key === "remSleepRate" ||
    key === "nonRemSleepRate" ||
    key === "lightSleepRate" ||
    key === "deepSleepRate" ||
    key === "spo2"
  ) {
    if (/%|％/.test(v)) score += 8;
    else if (looksPercent(v)) score += 3;
  }

  if (key === "bedtime" || key === "wakeTime") {
    if (looksTime(v)) score += 12;
    else score -= 4;
  }

  if (
    key === "sleepDuration" ||
    key === "remSleep" ||
    key === "nonRemSleep" ||
    key === "lightSleep" ||
    key === "deepSleep" ||
    key === "awakenings" ||
    key === "sleepLatency" ||
    key === "sleepDebt"
  ) {
    if (looksDuration(v)) score += 8;
    if (/%|％/.test(v)) score -= 6;
    // 「5時間10分」や「5:10」を「7時間」だけの丸めより優先（丸めは誤読・必要睡眠の混入が多い）
    if (/\d+\s*時間\s*\d+\s*分/.test(v) || /^\d{1,2}:\d{2}$/.test(v.trim())) {
      score += 8;
    } else if (/^\d+\s*時間$/.test(v.trim())) {
      score -= 10;
    }
    if (key === "sleepDuration") {
      const ln = label.normalize("NFKC").replace(/\s/g, "");
      if (/^睡眠時間$/.test(ln)) score += 14;
      if (/必要睡眠|目標睡眠|推奨睡眠|全就床|就床時間|ベッド滞在|滞在時間/.test(label))
        score -= 30;
    }
    if (key === "sleepLatency") {
      if (isPlausibleSleepLatency(v)) score += 16;
      else score -= 40;
      // 「30分」表記を「7:10」比較値より優先
      if (/\d+\s*分/.test(v) && !/時間/.test(v)) score += 10;
      if (/入眠潜時|sleeplatency/.test(label.replace(/\s/g, ""))) score += 10;
    }
    if (key === "deepSleep") {
      if (/深い睡眠/.test(label)) score += 12;
      if (/^深い$/.test(label)) score -= 8;
    }
  }

  if (key === "bedtime") {
    if (looksLikeLatencyMisreadAsBedtime(v, label)) score -= 50;
  }

  if (key === "restingHeartRate") {
    if (/bpm|回\/?分/i.test(v)) score += 5;
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 35 && n <= 100) score += 10;
    // 日中活動寄りの高値は睡眠時安静心拍として弱い
    if (Number.isFinite(n) && (n < 35 || n > 100)) score -= 12;
  }

  if (key === "hrv" || key === "hrvMax" || key === "hrvMin") {
    if (/ms/i.test(v)) score += 5;
    if (key === "hrv") {
      if (
        /平均hrv|hrv平均|平均心拍変動|心拍変動平均|平均rmssd/i.test(label) ||
        (/心拍変動|hrv|心拍動/i.test(label) && /平均|avg|mean/i.test(label)) ||
        (/^(心拍変動|心拍動|hrv|rmssd)$/i.test(label.trim()) &&
          /平均|avg|mean/i.test(v))
      ) {
        score += 20;
      }
      if (/平均|avg|mean/i.test(v)) score += 8;
      if (!/ms/i.test(v)) score -= 18;
      if (/最大|最小|max|min/i.test(label) && !/平均|avg|mean/i.test(label)) {
        score -= 30;
      }
      if (/安静時心拍|resting\s*hr|^rhr$/i.test(label)) score -= 40;
    }
    if (key === "hrvMax" && /最大|max/i.test(label)) score += 15;
    if (key === "hrvMin" && /最小|min/i.test(label)) score += 15;
  }

  if (key === "respiratoryRate") {
    if (/rpm|brpm|回\/?分|呼吸\/分/i.test(v)) score += 8;
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 6 && n <= 40) score += 6;
  }

  if (key === "skinTemperature") {
    if (/℃|°c|°|度/i.test(v)) score += 8;
    if (/^[+-]/.test(v.trim())) score += 6;
    const n = Math.abs(Number(v.replace(/[^\d.-]/g, "")));
    if (Number.isFinite(n) && n <= 5) score += 4;
    if (/最新の変化|最新変化|皮膚|温度/.test(label)) score += 10;
  }

  if (key === "stress") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 0 && n <= 100) score += 6;
    if (/低|中|高|レベル|level/i.test(v)) score += 3;
  }

  if (key === "qol" || key === "yesterdayQol" || key === "conditionScore") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 0 && n <= 100) score += 8;
    // ステータスバー電池％を QoL に誤マッピングしがち
    if (/%|％/.test(v)) score -= 20;
    if (/現在のスコア|現在のqol|きょうの|今日の/.test(label)) score += 18;
    if (/昨日/.test(label) && key === "qol") score -= 25;
    if (/^qol$/.test(label) && key === "qol") score += 4;
  }

  score += Math.min(v.length, 24) * 0.1;
  return score;
}

function isLikelyChartFragment(readings: VisibleReading[]): boolean {
  const labels = readings.map((r) =>
    r.label
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/[\s　_\-：:（）()【】\[\]「」『』]/g, ""),
  );
  const hasAvgMax = labels.some((l) =>
    /^平均$|^最大$|^最小$|^avg$|^max$|^min$/.test(l),
  );
  const hasHome = labels.some((l) => /^qol$|昨日のスコア|昨日のqol/.test(l));
  const hasSleepDetail = labels.some((l) =>
    /睡眠時間|睡眠効率|睡眠負債|入眠潜時|体内時計/.test(l),
  );
  const hasStages = labels.some((l) =>
    /レム睡眠|浅い睡眠|深い睡眠|覚醒時間/.test(l),
  );
  return (
    hasAvgMax &&
    readings.length <= 8 &&
    !hasHome &&
    !hasSleepDetail &&
    !hasStages
  );
}

type Candidate = {
  imageIndex: number;
  value: string;
  /** ラベル一致スコア（主） */
  labelScore: number;
  /** 画面種別スコア（主） */
  screenScore: number;
  /** 値形式（副） */
  reliability: number;
  sourceLabel: string;
  screenType: SoxaiScreenType;
};

/** キーを知った上でのランク比較（画面種別 → ラベル一致 → 値形式） */
function candidateRankForKey(key: MetricFieldKey, c: Candidate): number {
  const rank = metricScreenRank(key, c.screenType);
  const rankBonus = Math.max(0, 80 - rank * 20);
  const primaryBonus = isPrimaryMetricForScreen(c.screenType, key) ? 30 : 0;
  let bonus = 0;
  const label = c.sourceLabel.normalize("NFKC");
  // 安静時心拍: 「平均」を最小・最大より強く優先（空上書きはしない）
  if (key === "restingHeartRate") {
    if (/平均|avg|average|mean/i.test(label)) bonus += 80;
    if (/最小|最大|min|max/i.test(label) && !/平均|avg|mean/i.test(label)) {
      bonus -= 60;
    }
  }
  // 深い睡眠率: 「深い睡眠率」全文ラベルを短縮・誤%より優先
  if (key === "deepSleepRate") {
    if (/深い睡眠率/.test(label)) bonus += 90;
    else if (/^深い率$|^深率$|^深い$/.test(label)) bonus -= 20;
  }
  return (
    c.screenScore * 50 +
    c.labelScore * 100 +
    c.reliability +
    rankBonus * 10 +
    primaryBonus * 40 +
    bonus
  );
}

function pickBestCandidateForKey(
  key: MetricFieldKey,
  candidates: Candidate[],
): Candidate {
  let pool = candidates;
  if (key === "deepSleepRate" && candidates.length > 1) {
    const strong = candidates.filter((c) =>
      /深い睡眠率/.test(c.sourceLabel.normalize("NFKC")),
    );
    if (strong.length > 0) pool = strong;
    // 同一ラベルで複数%があるときは件数が多い方（同数なら順位比較に委ねる）
    if (pool.length > 1) {
      const byVal = new Map<string, Candidate[]>();
      for (const c of pool) {
        const n = String(c.value).replace(/\s/g, "");
        const list = byVal.get(n) ?? [];
        list.push(c);
        byVal.set(n, list);
      }
      let bestGroup: Candidate[] | null = null;
      let bestCount = 0;
      for (const group of byVal.values()) {
        if (group.length > bestCount) {
          bestCount = group.length;
          bestGroup = group;
        }
      }
      // 単独同士の同数多数決は誤って先頭値を固定してしまうのでスキップ
      if (bestGroup && bestCount > 1) pool = bestGroup;
    }
  }
  if (key === "restingHeartRate" && candidates.length > 1) {
    const avg = candidates.filter((c) =>
      /平均|avg|average|mean/i.test(c.sourceLabel.normalize("NFKC")),
    );
    if (avg.length > 0) pool = avg;
    else {
      // ラベルに最小・最大が無い候補を優先（プレーン「安静時心拍数」）
      const plain = candidates.filter(
        (c) => !/(最小|最大|min|max)/i.test(c.sourceLabel.normalize("NFKC")),
      );
      if (plain.length > 0) pool = plain;
    }
  }
  if (key === "sleepDuration" && candidates.length > 1) {
    const exact = candidates.filter((c) =>
      /^睡眠時間$/.test(c.sourceLabel.normalize("NFKC").trim()),
    );
    if (exact.length > 0) pool = exact;
    // 概要画面の「睡眠時間」を他画面の同名候補より優先
    const overview = pool.filter((c) => c.screenType === "sleep_overview");
    if (overview.length > 0) pool = overview;
  }
  if (key === "hrv" && candidates.length > 1) {
    const avg = candidates.filter((c) => {
      const label = c.sourceLabel.normalize("NFKC");
      const value = String(c.value ?? "");
      return (
        /平均hrv|hrv平均|平均心拍変動|心拍変動平均|平均rmssd/i.test(label) ||
        (/心拍変動|hrv|心拍動/i.test(label) && /平均|avg|mean/i.test(label)) ||
        (/^(心拍変動|心拍動|hrv|rmssd)$/i.test(label.trim()) &&
          /平均|avg|mean/i.test(value))
      );
    });
    if (avg.length > 0) pool = avg;
    const withMs = pool.filter((c) => /\bms\b|ミリ秒/i.test(String(c.value)));
    if (withMs.length > 0) pool = withMs;
  }
  if (key === "respiratoryRate" && candidates.length > 1) {
    const exact = candidates.filter((c) =>
      /呼吸速度/.test(c.sourceLabel.normalize("NFKC")),
    );
    if (exact.length > 0) pool = exact;
  }
  return [...pool].sort((a, b) => {
    const diff = candidateRankForKey(key, b) - candidateRankForKey(key, a);
    if (diff !== 0) return diff;
    // 画像順に依存しないタイブレーク（同一セットなら順不同で同じ採用値）
    const screenCmp = a.screenType.localeCompare(b.screenType);
    if (screenCmp !== 0) return screenCmp;
    const valueCmp = String(a.value).localeCompare(String(b.value));
    if (valueCmp !== 0) return valueCmp;
    return a.imageIndex - b.imageIndex;
  })[0];
}

function confidenceFromCandidateForKey(
  key: MetricFieldKey,
  candidate: Candidate,
  uniqueValueCount: number,
): number {
  const labelPart = Math.min(1, Math.max(0, candidate.labelScore / 115));
  const screenPart = Math.min(1, Math.max(0, candidate.screenScore / 180));
  const reliabilityPart = Math.min(
    1,
    Math.max(0, (candidate.reliability + 5) / 40),
  );
  // 画面種別 40% + ラベル一致 45% + 値形式 15%（OCR信頼度単独では決めない）
  let score = screenPart * 0.4 + labelPart * 0.45 + reliabilityPart * 0.15;
  if (uniqueValueCount > 1) score *= 0.72;
  if (isCriticalOcrKey(key) && candidate.labelScore < MIN_CRITICAL_LABEL_SCORE) {
    score *= 0.8;
  }
  if (isPrimaryMetricForScreen(candidate.screenType, key)) {
    score = Math.min(0.99, score + 0.08);
  }
  return Math.round(Math.min(0.99, Math.max(0.05, score)) * 100) / 100;
}

/**
 * 採用ゲート: 画面種別＋ラベル一致が弱い候補を除外。
 * - ホーム代表値はホーム候補があれば他画面を捨てる
 * - sleepScore / bedtime / wakeTime は正しい画面があれば他画面を捨てる（ラベル強くても上書き禁止）
 * - より良い一次画面候補がある場合は誤画面を捨てる
 */
function filterCandidatesForKey(
  key: MetricFieldKey,
  candidates: Candidate[],
): Candidate[] {
  if (candidates.length === 0) return candidates;

  // ロック画面: 正しい画面から取れたら別画面は一切採用しない
  const lockedScreens = lockedScreensForKey(key);
  if (lockedScreens) {
    const lockedOnly = candidates.filter((c) =>
      isLockedAuthoritativeScreen(key, c.screenType),
    );
    if (lockedOnly.length > 0) {
      // sleepScore はホームがあればホームのみ（概要より優先）
      if (key === "sleepScore") {
        const homeOnly = lockedOnly.filter((c) => c.screenType === "home");
        if (homeOnly.length > 0) return homeOnly;
      }
      // bedtime / wakeTime は bed_wake があればそれを優先（詳細より正）
      if (key === "bedtime" || key === "wakeTime") {
        const bedWakeOnly = lockedOnly.filter(
          (c) => c.screenType === "bed_wake",
        );
        if (bedWakeOnly.length > 0) return bedWakeOnly;
      }
      return lockedOnly;
    }
    // 固定画面ルール: ロック画面に候補が無ければ他画面で埋めない（deep/nonRem のみ）
    if (isStrictSourceScreenKey(key)) {
      return [];
    }
  }

  // ホーム画面の代表値: ホームから取れたら他画面は無視（競合にもしない）
  if (isHomeAuthoritativeKey(key)) {
    const homeOnly = candidates.filter((c) => c.screenType === "home");
    if (homeOnly.length > 0) return homeOnly;
  }

  // 明示ラベル優先（画面種別よりラベルを優先。空・弱ラベルは採用しない）
  if (key === "sleepDuration") {
    const explicit = candidates.filter((c) => {
      const label = c.sourceLabel
        .normalize("NFKC")
        .replace(/[\s　]/g, "")
        .trim();
      return /^睡眠時間$/.test(label);
    });
    // 概要に「睡眠時間」があれば他画面の同名候補は使わない
    const overview = explicit.filter((c) => c.screenType === "sleep_overview");
    return overview.length > 0 ? overview : explicit;
  }
  if (key === "respiratoryRate") {
    const explicit = candidates.filter((c) =>
      /呼吸速度|呼吸レート|呼吸数|respiratoryrate/i.test(
        c.sourceLabel.normalize("NFKC"),
      ),
    );
    return explicit;
  }
  if (key === "hrv") {
    // 平均HRV / 心拍変動の平均 / 同一カード。裸数字（SpO₂取り違え）は除外
    return candidates.filter((c) => {
      const label = c.sourceLabel.normalize("NFKC");
      const value = String(c.value ?? "");
      if (/最小|最大|min|max/i.test(label) && !/平均|avg|mean/i.test(label)) {
        return false;
      }
      if (/安静時心拍|resting\s*hr|^rhr$/i.test(label)) return false;
      if (!/\bms\b|ミリ秒/i.test(value) && !/平均|avg|mean/i.test(value)) {
        return false;
      }
      return (
        /平均hrv|hrv平均|平均心拍変動|心拍変動平均|平均rmssd|^rmssd$/i.test(
          label.replace(/\s/g, ""),
        ) ||
        (/心拍変動|hrv|rmssd|心拍動/i.test(label) &&
          /平均|avg|mean/i.test(label)) ||
        (/^(心拍変動|心拍動|hrv|rmssd)$/i.test(label.trim()) &&
          (/\bms\b|ミリ秒/i.test(value) || /平均|avg|mean/i.test(value))) ||
        (/^(平均|avg|mean)$/i.test(label.trim()) &&
          c.screenType === "hrv" &&
          /ms/i.test(value))
      );
    });
  }
  if (key === "hrvMax" || key === "hrvMin") {
    const wantMax = key === "hrvMax";
    return candidates.filter((c) => {
      const label = c.sourceLabel.normalize("NFKC");
      const value = String(c.value ?? "");
      if (/安静時心拍|resting\s*hr|^rhr$/i.test(label)) return false;
      if (wantMax) {
        return (
          /最大|max/i.test(label) ||
          /最大|max/i.test(value) ||
          (c.screenType === "hrv" && /^(最大|max)$/i.test(label.trim()))
        );
      }
      return (
        /最小|min/i.test(label) ||
        /最小|min/i.test(value) ||
        (c.screenType === "hrv" && /^(最小|min)$/i.test(label.trim()))
      );
    });
  }
  if (key === "restingHeartRateMin" || key === "restingHeartRateMax") {
    const wantMax = key === "restingHeartRateMax";
    return candidates.filter((c) => {
      const label = c.sourceLabel.normalize("NFKC");
      const value = String(c.value ?? "").normalize("NFKC");
      // HRV 画面の「最大 101」を安静時最大にしない
      if (c.screenType === "hrv") return false;
      if (/\bms\b|ミリ秒/i.test(value)) return false;
      if (/心拍変動|hrv|rmssd/i.test(label)) return false;
      if (
        /安静時心拍|resting\s*hr|^rhr$/i.test(label) &&
        (wantMax ? /最大|max/i.test(label) : /最小|min/i.test(label))
      ) {
        return true;
      }
      if (
        (wantMax ? /^(最大|max)$/i : /^(最小|min)$/i).test(label.trim()) &&
        (c.screenType === "rhr" || c.screenType === "respiration") &&
        looksBpmLike(value)
      ) {
        return true;
      }
      return false;
    });
  }
  if (key === "sleepLatency") {
    const plausible = candidates.filter((c) =>
      isPlausibleSleepLatency(String(c.value ?? "")),
    );
    return plausible.length > 0 ? plausible : candidates;
  }
  if (key === "bedtime") {
    const filtered = candidates.filter(
      (c) =>
        !looksLikeLatencyMisreadAsBedtime(
          String(c.value ?? ""),
          c.sourceLabel,
        ),
    );
    return filtered.length > 0 ? filtered : candidates;
  }
  if (key === "restingHeartRate") {
    const withResting = candidates.filter((c) => {
      const label = c.sourceLabel.normalize("NFKC");
      const value = String(c.value ?? "").normalize("NFKC").trim();
      if (/安静時心拍|resting\s*hr|restinghr|restingheartrate|^rhr$/i.test(label)) {
        return true;
      }
      // 弱ラベル「平均」は BPM 形状のときだけ（皮膚温 +0.2 は除外）
      if (/^(平均|avg|mean)$/i.test(label.trim())) {
        if (/^[+-]/.test(value) || /℃|°/.test(value)) return false;
        return (
          /bpm|拍\/分/i.test(value) ||
          /^\s*\d{2,3}(\.\d+)?\s*$/.test(value) ||
          /^(平均|avg|mean)\s*\d{2,3}/i.test(value)
        );
      }
      return false;
    });
    if (withResting.length === 0) return [];
    // 最小・最大は捨て、平均付き or プレーン「安静時心拍数」を残す
    const notMinMax = withResting.filter((c) => {
      const label = c.sourceLabel.normalize("NFKC");
      return !/(最小|最大|min|max)/i.test(label) || /平均|avg|mean/i.test(label);
    });
    const avg = notMinMax.filter((c) => {
      const label = c.sourceLabel.normalize("NFKC");
      const value = String(c.value ?? "");
      return (
        /平均|avg|mean/i.test(label) ||
        /^(平均|avg|mean)\s*\d{2,3}/i.test(value.normalize("NFKC").trim())
      );
    });
    if (avg.length > 0) return avg;
    return notMinMax.length > 0 ? notMinMax : withResting;
  }

  const hasPrimary = candidates.some((c) =>
    isPrimaryMetricForScreen(c.screenType, key),
  );
  const hasStrongLabel = candidates.some(
    (c) =>
      c.labelScore >=
      (isCriticalOcrKey(key) ? MIN_CRITICAL_LABEL_SCORE : MIN_LABEL_SCORE),
  );

  let filtered = candidates.filter((c) => {
    const minLabel = isCriticalOcrKey(key)
      ? MIN_CRITICAL_LABEL_SCORE
      : MIN_LABEL_SCORE;

    if (isPrimaryMetricForScreen(c.screenType, key)) {
      return c.labelScore >= Math.min(40, minLabel) || c.screenScore >= 50;
    }

    if (hasPrimary && c.screenScore < 20) return false;

    if (isCriticalOcrKey(key) && c.labelScore < minLabel && c.screenScore < 40) {
      return false;
    }

    return c.labelScore >= minLabel || c.screenScore >= 40;
  });

  if (filtered.length === 0) {
    // 重点項目は候補が1つでも値形式が妥当なら採用（取りこぼし防止）
    if (isCriticalOcrKey(key) && candidates.length === 1) {
      const only = candidates[0];
      if (only.reliability >= 8 || only.labelScore >= 40) {
        return [only];
      }
    }
    const best = [...candidates].sort((a, b) => b.labelScore - a.labelScore)[0];
    filtered = best ? [best] : candidates;
  }

  if (hasPrimary && hasStrongLabel) {
    // ロック対象キーは「強いラベル」でも二次画面を混ぜない
    const allowStrongLabelEscape = !lockedScreensForKey(key);
    const primaryOnly = filtered.filter(
      (c) =>
        isPrimaryMetricForScreen(c.screenType, key) ||
        (allowStrongLabelEscape &&
          c.labelScore >= (isCriticalOcrKey(key) ? 95 : 80)),
    );
    if (primaryOnly.length > 0) filtered = primaryOnly;
  }

  return filtered;
}

/**
 * 競合として残すか。ホーム代表値でホーム採用できた場合は他画面差を競合にしない。
 * 本当に判断できない（同格候補が複数値）ときだけ true。
 */
function shouldRecordConflict(
  key: MetricFieldKey,
  adopted: Candidate,
  uniqueValueCount: number,
): boolean {
  if (uniqueValueCount <= 1) return false;

  if (isHomeAuthoritativeKey(key) && adopted.screenType === "home") {
    return false;
  }

  // ロック画面から採用できた場合、他画面との差は競合にしない
  if (isLockedAuthoritativeScreen(key, adopted.screenType)) {
    return false;
  }

  // 明確な一次画面から採用できた場合も、二次画面の差は競合にしない
  if (isPrimaryMetricForScreen(adopted.screenType, key)) {
    const rank = metricScreenRank(key, adopted.screenType);
    if (rank === 0) return false;
  }

  // 安静時心拍数: 優先画面から採用できていれば他画面差は競合にしない
  if (key === "restingHeartRate") {
    if (adopted.screenType === "rhr" || adopted.screenType === "respiration") {
      return false;
    }
  }

  return true;
}

function resolveEffectiveScreenType(
  result: ImageExtractResult,
): SoxaiScreenType {
  const inferred = inferScreenTypeFromReadings(result.readings ?? []);
  const vision =
    result.screenType && result.screenType !== "other"
      ? result.screenType
      : null;

  // Vision が home/stress/hrv でも、ラベルが専用画面を強く示すなら上書き
  // （呼吸+安静時を HRV と誤分類しても、明示ラベル側の画面として扱う）
  if (
    (!vision ||
      vision === "home" ||
      vision === "stress" ||
      vision === "other" ||
      vision === "sleep_overview" ||
      vision === "hrv") &&
    (inferred === "respiration" ||
      inferred === "rhr" ||
      inferred === "sleep_stages" ||
      (inferred === "hrv" && vision !== "hrv"))
  ) {
    return inferred;
  }
  if (
    vision === "home" &&
    (inferred === "sleep_overview" || inferred === "sleep_detail")
  ) {
    return inferred;
  }
  return vision ?? inferred;
}

function resolveSourceLabel(
  result: ImageExtractResult,
  key: MetricFieldKey,
): string {
  const fromProvenance = result.provenance?.[key]?.trim();
  if (fromProvenance) return fromProvenance;

  const readings = result.readings ?? [];
  let bestLabel = "";
  let bestScore = -1;
  for (const reading of readings) {
    const score = labelMatchScore(key, reading.label);
    if (score > bestScore) {
      bestScore = score;
      bestLabel = reading.label;
    }
  }
  return bestLabel;
}

/**
 * 複数画像の個別OCR結果を1つの AnalysisMetrics に統合する。
 * - 不足項目は他画像から補完
 * - 比較前に値を正規化（6:22 ≡ 6時間22分、49 ≡ 49 bpm、33 ≡ 33標準）
 * - ホーム代表値はホーム画面を最優先（他画面との差は競合にしない）
 * - sleepScore はホームがあれば必ずホーム優先
 * - restingHeartRate は 睡眠詳細 ＞ rhr ＞ ホーム（異常値の別画面取り込みを防ぐ）
 * - sleepScore / bedtime / wakeTime は正しい画面をロック採用し、別画面で上書きしない
 * - 同一項目の競合は「画面種別優先 → ラベル一致 → 値形式」で採用
 * - 競合表示は本当に違う値のときだけ（表記ゆれは競合にしない）
 * - 画像の順番は結果に影響しない
 */
export function mergeImageExtractResults(
  results: ImageExtractResult[],
): MergedExtractResult {
  const valid = results.filter(
    (result) =>
      result &&
      result.metrics &&
      collectedMetricKeys(result.metrics).length + result.visibleReadingCount >
        0,
  );

  if (valid.length === 0) {
    return { metrics: emptyMetrics(), conflicts: [], confidence: {} };
  }

  const labelByKey = new Map(
    SOXAI_METRIC_FIELDS.map((field) => [field.key, field.label] as const),
  );
  const merged = emptyMetrics();
  const conflicts: MergedMetricConflict[] = [];
  const confidence: MetricConfidenceMap = {};

  for (const field of SOXAI_METRIC_FIELDS) {
    const key = field.key;
    const candidates: Candidate[] = [];

    for (const result of valid) {
      if (!isMetricPresent(result.metrics, key)) continue;
      const value = metricDisplayValue(result.metrics, key).trim();
      if (!value) continue;

      // 同一画像内で深い睡眠＝覚醒時間なら深い睡眠候補から除外
      if (key === "deepSleep" && isMetricPresent(result.metrics, "awakenings")) {
        const deepM = parseDurationMinutes(value);
        const awakeM = parseDurationMinutes(
          metricDisplayValue(result.metrics, "awakenings"),
        );
        if (
          deepM != null &&
          awakeM != null &&
          Math.abs(deepM - awakeM) <= 1
        ) {
          continue;
        }
      }
      // 同一画像内で深い睡眠率＝浅い睡眠率なら深い率候補から除外（明示ラベル以外）
      if (
        key === "deepSleepRate" &&
        isMetricPresent(result.metrics, "lightSleepRate")
      ) {
        const deepP = parsePercent(value);
        const lightP = parsePercent(
          metricDisplayValue(result.metrics, "lightSleepRate"),
        );
        const deepLabel = resolveSourceLabel(result, "deepSleepRate");
        if (
          deepP != null &&
          lightP != null &&
          deepP === lightP &&
          !/深い睡眠率/.test(deepLabel.normalize("NFKC"))
        ) {
          continue;
        }
      }

      const readings = result.readings ?? [];
      const sourceLabel = resolveSourceLabel(result, key);
      const screenType = resolveEffectiveScreenType(result);
      let labelScore = labelMatchScore(key, sourceLabel);
      let screenScore = screenTypeScore(readings, key);
      screenScore += screenAffinityScore(screenType, key);

      if (key === "sleepScore" && isLikelyChartFragment(readings)) {
        labelScore = Math.min(labelScore, 25);
      }
      // HRV 画面の履歴棒グラフ「睡眠スコア」をホーム代表値として採らない
      if (
        key === "sleepScore" &&
        (screenType === "hrv" ||
          /心拍変動|hrv|rmssd/i.test(
            readings.map((r) => r.label).join("|"),
          ))
      ) {
        labelScore = Math.min(labelScore, 10);
        screenScore = Math.min(screenScore, 0);
      }
      // ホームの「心拍数/最新」は安静時ではない
      if (
        key === "restingHeartRate" &&
        (/最新|現在|latest/i.test(sourceLabel) ||
          (/^心拍数$|^心拍$|^hr$/i.test(sourceLabel.normalize("NFKC").trim()) &&
            screenType === "home"))
      ) {
        labelScore = Math.min(labelScore, 5);
        screenScore = Math.min(screenScore, -10);
      }
      // SOXAI: 最小・最大より平均を優先
      if (
        key === "restingHeartRate" &&
        /最小|最大|min|max/i.test(sourceLabel) &&
        !/平均|avg|mean/i.test(sourceLabel)
      ) {
        labelScore = Math.min(labelScore, 20);
      }

      // 深い睡眠率: 「深い睡眠率」明示ラベルを強く優先（同居加点で誤%を勝たせない）
      if (key === "deepSleepRate" || key === "deepSleep") {
        const deepDurLabel = resolveSourceLabel(result, "deepSleep");
        const deepRateLabel = resolveSourceLabel(result, "deepSleepRate");
        const hasStrongRate =
          isMetricPresent(result.metrics, "deepSleepRate") &&
          /深い睡眠率/.test(deepRateLabel.normalize("NFKC"));
        const hasStrongDur =
          isMetricPresent(result.metrics, "deepSleep") &&
          /深い睡眠/.test(deepDurLabel.normalize("NFKC"));
        if (key === "deepSleepRate") {
          if (hasStrongRate) labelScore += 40;
          else labelScore -= 30;
          // 時間同居だけでは加点しない（誤読%が時間正しい画像に載ると勝ってしまう）
          if (hasStrongDur && hasStrongRate) labelScore += 5;
        }
        if (key === "deepSleep" && hasStrongDur) {
          labelScore += 20;
        }
      }

      candidates.push({
        imageIndex: result.imageIndex,
        value,
        labelScore,
        screenScore,
        reliability: scoreValueReliability(key, value, sourceLabel),
        sourceLabel,
        screenType,
      });
    }

    if (candidates.length === 0) continue;

    const gatedRaw = filterCandidatesForKey(key, candidates);
    // restingHeartRate: OCR取得済み値をゲート全滅で空文字にしない（補完は空のときだけ）
    const gated =
      gatedRaw.length > 0
        ? gatedRaw
        : key === "restingHeartRate"
          ? candidates
          : [];
    // 固定画面に候補が無ければそのキーは未取得のまま（他画面で埋めない）
    if (gated.length === 0) continue;

    // QoL: 昨日のスコアに近い値を優先（端末バッテリー％の誤採用を防ぐ）
    let gatedForPick = gated;
    if (key === "qol") {
      const yesterdayCandidates = valid
        .filter((r) => isMetricPresent(r.metrics, "yesterdayQol"))
        .map((r) => Number(metricDisplayValue(r.metrics, "yesterdayQol").replace(/[^\d.-]/g, "")))
        .filter((n) => Number.isFinite(n));
      if (yesterdayCandidates.length > 0) {
        const yRef = yesterdayCandidates[0];
        gatedForPick = [...gated].sort((a, b) => {
          const an = Number(a.value.replace(/[^\d.-]/g, ""));
          const bn = Number(b.value.replace(/[^\d.-]/g, ""));
          const da = Number.isFinite(an) ? Math.abs(an - yRef) : 999;
          const db = Number.isFinite(bn) ? Math.abs(bn - yRef) : 999;
          if (da !== db) return da - db;
          return candidateRankForKey(key, b) - candidateRankForKey(key, a);
        });
        // 昨日から大きく離れた候補は落とす（例: 60付近の QoL に対する 83 バッテリー）
        const close = gatedForPick.filter((c) => {
          const n = Number(c.value.replace(/[^\d.-]/g, ""));
          return Number.isFinite(n) && Math.abs(n - yRef) <= 25;
        });
        if (close.length > 0) gatedForPick = close;
      }
    }

    const byNorm = new Map<string, Candidate[]>();
    for (const candidate of gatedForPick) {
      const norm = normalizeComparable(key, candidate.value);
      const list = byNorm.get(norm) ?? [];
      list.push(candidate);
      byNorm.set(norm, list);
    }

    const scored: Candidate[] = [];
    for (const group of byNorm.values()) {
      const bestInGroup = pickBestCandidateForKey(key, group);
      scored.push({
        ...bestInGroup,
        reliability:
          bestInGroup.reliability + Math.min(group.length, 5) * 1.5,
      });
    }

    const adopted = pickBestCandidateForKey(key, scored);
    // 深い睡眠率がレム率と同値のとき、別の「深い睡眠率」候補があればそちらを採用
    // （レム%の取り違え。浅い率との合算や逆算はしない）
    let finalAdopted = adopted;
    if (key === "deepSleepRate" && scored.length > 1) {
      const remNorm = isMetricPresent(merged, "remSleepRate")
        ? normalizeComparable("remSleepRate", merged.remSleepRate)
        : "";
      const awakeNorm = isMetricPresent(merged, "awakeningRate")
        ? normalizeComparable("awakeningRate", merged.awakeningRate)
        : "";
      const lightNorm = isMetricPresent(merged, "lightSleepRate")
        ? normalizeComparable("lightSleepRate", merged.lightSleepRate)
        : "";
      const adoptedNorm = normalizeComparable(key, adopted.value);
      if (
        (remNorm && adoptedNorm === remNorm) ||
        (awakeNorm && adoptedNorm === awakeNorm) ||
        (lightNorm && adoptedNorm === lightNorm)
      ) {
        const alt = scored.find((c) => {
          const n = normalizeComparable(key, c.value);
          return (
            n !== adoptedNorm &&
            n !== remNorm &&
            n !== awakeNorm &&
            n !== lightNorm &&
            /深い睡眠率/.test(c.sourceLabel.normalize("NFKC"))
          );
        });
        if (alt) finalAdopted = alt;
      }
      // 明示「深い睡眠率」候補が複数あるとき、既に確定した深い睡眠時間と睡眠時間との
      // 整合が取れる OCR 候補だけを残す（率を計算して埋めるのではなく、誤読候補を落とす）
      const sleepM = parseDurationMinutes(merged.sleepDuration);
      const deepM = parseDurationMinutes(merged.deepSleep);
      if (sleepM != null && deepM != null && sleepM > 0) {
        const expected = (deepM / sleepM) * 100;
        const consistent = scored.filter((c) => {
          if (!/深い睡眠率|深い睡眠/.test(c.sourceLabel.normalize("NFKC"))) {
            return false;
          }
          const p = parsePercent(c.value);
          return p != null && Math.abs(p - expected) <= 12;
        });
        if (consistent.length > 0) {
          finalAdopted = pickBestCandidateForKey(key, consistent);
        }
      }
    }
    if (key === "sleepScore") {
      const n = Number(finalAdopted.value.replace(/[^\d.-]/g, ""));
      merged.sleepScore = Number.isFinite(n) ? n : null;
    } else {
      merged[key] = finalAdopted.value;
    }

    // 表記ゆれのみの差は unique=1 扱い（競合にしない）
    const uniqueValueCount = byNorm.size;
    confidence[key] = confidenceFromCandidateForKey(
      key,
      finalAdopted,
      uniqueValueCount,
    );

    if (shouldRecordConflict(key, finalAdopted, uniqueValueCount)) {
      const adoptedNorm = normalizeComparable(key, finalAdopted.value);
      const alternatives = [...byNorm.entries()]
        .filter(([norm]) => norm !== adoptedNorm)
        .map(([, group]) => pickBestCandidateForKey(key, group).value);

      if (alternatives.length > 0) {
        conflicts.push({
          key,
          label: labelByKey.get(key) ?? key,
          adopted: finalAdopted.value,
          alternatives: [...new Set(alternatives)],
        });
      }
    }
  }

  // restingHeartRate: 画像OCRに取得済みがあるのにマージ結果が空なら、空のままにせず保持
  // （undefined / null / "" のときだけ補完。52 最小・63 平均など既存値は優先度で採用）
  if (!isMetricPresent(merged, "restingHeartRate")) {
    const ocrCandidates: Candidate[] = [];
    for (const result of valid) {
      if (!isMetricPresent(result.metrics, "restingHeartRate")) continue;
      const value = metricDisplayValue(result.metrics, "restingHeartRate").trim();
      if (!value) continue;
      const sourceLabel = resolveSourceLabel(result, "restingHeartRate");
      const screenType = resolveEffectiveScreenType(result);
      ocrCandidates.push({
        imageIndex: result.imageIndex,
        value,
        labelScore: labelMatchScore("restingHeartRate", sourceLabel),
        screenScore:
          screenTypeScore(result.readings ?? [], "restingHeartRate") +
          screenAffinityScore(screenType, "restingHeartRate"),
        reliability: scoreValueReliability(
          "restingHeartRate",
          value,
          sourceLabel,
        ),
        sourceLabel,
        screenType,
      });
    }
    if (ocrCandidates.length > 0) {
      merged.restingHeartRate = pickBestCandidateForKey(
        "restingHeartRate",
        ocrCandidates,
      ).value;
    }
  }

  const normalized = normalizeMetricsForDisplay(normalizeMetrics(merged));
  if (normalized.bedtime.trim()) {
    normalized.bedtime = normalizeTimeToHHMM(normalized.bedtime);
  }
  if (normalized.wakeTime.trim()) {
    normalized.wakeTime = normalizeTimeToHHMM(normalized.wakeTime);
  }

  // 深い睡眠の時間・率は OCR ラベル直読みのみ。
  // sleep−レム−浅い の余り計算や 100%−他率 の補完はしない（誤った睡眠時間から深い睡眠が化ける）。
  // SOXAI: 深い睡眠 = 表示上のノンレム（浅い+深いの合算はしない）
  applyNonRemFromStageOcr(normalized);

  // 安静時平均が最小と同じなら、平均未取得として空にする（最小の誤採用防止）
  if (
    isMetricPresent(normalized, "restingHeartRate") &&
    isMetricPresent(normalized, "restingHeartRateMin")
  ) {
    const avgN = Number(
      String(normalized.restingHeartRate).replace(/[^\d.-]/g, ""),
    );
    const minN = Number(
      String(normalized.restingHeartRateMin).replace(/[^\d.-]/g, ""),
    );
    if (
      Number.isFinite(avgN) &&
      Number.isFinite(minN) &&
      Math.round(avgN) === Math.round(minN)
    ) {
      normalized.restingHeartRate = "";
    }
  }

  // 入眠が潜時と同じ長さなら破棄
  if (
    isMetricPresent(normalized, "bedtime") &&
    isMetricPresent(normalized, "sleepLatency")
  ) {
    const latM = parseDurationMinutes(normalized.sleepLatency);
    const bedAsDur = parseDurationMinutes(normalized.bedtime);
    if (
      latM != null &&
      bedAsDur != null &&
      Math.abs(bedAsDur - latM) <= 1
    ) {
      normalized.bedtime = "";
    } else if (looksLikeLatencyMisreadAsBedtime(normalized.bedtime, "入眠時間")) {
      normalized.bedtime = "";
    }
  }

  // restingHeartRateMax が hrvMax と同じなら HRV からの誤流入 → 破棄
  if (
    isMetricPresent(normalized, "restingHeartRateMax") &&
    isMetricPresent(normalized, "hrvMax")
  ) {
    const rhrMaxN = Number(
      String(normalized.restingHeartRateMax).replace(/[^\d.-]/g, ""),
    );
    const hrvMaxN = Number(
      String(normalized.hrvMax).replace(/[^\d.-]/g, ""),
    );
    if (
      Number.isFinite(rhrMaxN) &&
      Number.isFinite(hrvMaxN) &&
      Math.round(rhrMaxN) === Math.round(hrvMaxN)
    ) {
      normalized.restingHeartRateMax = "";
    }
  }

  // 信頼度の整合性クランプは最終 metrics 確定後に行う（中間値での誤クランプを避ける）
  return {
    metrics: normalized,
    conflicts,
    confidence,
  };
}

/**
 * sleep_stages OCR 結果からノンレム時間・割合を確定する。
 *
 * 仕様（表示・分析とも）:
 * - SOXAI「深い睡眠」→ ノンレム睡眠
 * - SOXAI「深い睡眠率」→ ノンレム睡眠率
 * - 浅い睡眠は合算しない / 独自計算しない
 * - 他画面の OCR 候補とはマージしない（ステージの深い睡眠のみ）
 */
export function applyNonRemFromStageOcr(metrics: AnalysisMetrics): void {
  const deepPresent = isMetricPresent(metrics, "deepSleep");
  const deepRatePresent = isMetricPresent(metrics, "deepSleepRate");

  // 深い睡眠＝ノンレム（明示ノンレムより深い睡眠を正とする）
  if (deepPresent) {
    metrics.nonRemSleep = metrics.deepSleep;
  }
  if (deepRatePresent) {
    const deepP = parsePercent(metrics.deepSleepRate);
    const deepM = parseDurationMinutes(metrics.deepSleep);
    // 0% かつ時間ありは OCR 欠損扱い → 率は空に
    if (deepP === 0 && deepM != null && deepM > 0) {
      metrics.nonRemSleepRate = "";
    } else {
      metrics.nonRemSleepRate = metrics.deepSleepRate;
    }
  }

  // 深い睡眠が無いのに残った非ステージ由来のノンレムは捨てない
  // （ステージで明示「ノンレム」だけ取れたケースは deep 未取得時に残す）
  if (!deepPresent && !isMetricPresent(metrics, "nonRemSleep")) {
    metrics.nonRemSleep = "";
  }
  if (!deepRatePresent && !isMetricPresent(metrics, "nonRemSleepRate")) {
    metrics.nonRemSleepRate = "";
  }
}
