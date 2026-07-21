import {
  labelMatchScore,
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
import {
  inferScreenTypeFromReadings,
  isCriticalOcrKey,
  isHomeAuthoritativeKey,
  isPrimaryMetricForScreen,
  metricScreenRank,
  screenAffinityScore,
  type SoxaiScreenType,
} from "@/lib/soxai-screen";

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

function normalizeComparable(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
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

/**
 * 値形式の妥当性（タイブレーカー用。主判定には使わない）
 */
export function scoreValueReliability(
  key: MetricFieldKey,
  value: string,
): number {
  const v = value.trim();
  if (!v) return -1;

  let score = 10;

  if (key === "sleepScore") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 0 && n <= 100) score += 20;
    else score -= 5;
  }

  if (
    key === "sleepEfficiency" ||
    key === "awakeningRate" ||
    key === "remSleepRate" ||
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
    key === "lightSleep" ||
    key === "deepSleep" ||
    key === "awakenings" ||
    key === "sleepLatency" ||
    key === "sleepDebt"
  ) {
    if (looksDuration(v)) score += 8;
    if (/%|％/.test(v)) score -= 6;
    // 「5時間32分」のような明示表記を短時間表記より優先
    if (/時間/.test(v)) score += 6;
    if (/^\d{1,2}:\d{2}$/.test(v.trim()) && key === "sleepDuration") score -= 4;
  }

  if (key === "restingHeartRate") {
    if (/bpm|回\/?分/i.test(v)) score += 5;
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 30 && n <= 140) score += 6;
  }

  if (key === "hrv") {
    if (/ms/i.test(v)) score += 5;
  }

  if (key === "respiratoryRate") {
    if (/回|\/分|bpm|brpm/i.test(v)) score += 4;
  }

  if (key === "skinTemperature") {
    if (/℃|°c|°|度/i.test(v)) score += 8;
    if (/^[+-]/.test(v.trim())) score += 6;
    const n = Math.abs(Number(v.replace(/[^\d.-]/g, "")));
    if (Number.isFinite(n) && n <= 5) score += 4;
  }

  if (key === "stress") {
    const n = Number(v.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(n) && n >= 0 && n <= 100) score += 6;
    if (/低|中|高|レベル|level/i.test(v)) score += 3;
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
  return (
    c.screenScore * 50 +
    c.labelScore * 100 +
    c.reliability +
    rankBonus * 10 +
    primaryBonus * 40
  );
}

function pickBestCandidateForKey(
  key: MetricFieldKey,
  candidates: Candidate[],
): Candidate {
  return [...candidates].sort((a, b) => {
    const diff = candidateRankForKey(key, b) - candidateRankForKey(key, a);
    if (diff !== 0) return diff;
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
 * ホーム代表値はホーム候補があれば他画面を捨てる。
 * より良い一次画面候補がある場合は誤画面を捨てる。
 */
function filterCandidatesForKey(
  key: MetricFieldKey,
  candidates: Candidate[],
): Candidate[] {
  if (candidates.length === 0) return candidates;

  // ホーム画面の代表値: ホームから取れたら他画面は無視（競合にもしない）
  if (isHomeAuthoritativeKey(key)) {
    const homeOnly = candidates.filter((c) => c.screenType === "home");
    if (homeOnly.length > 0) return homeOnly;
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
    const primaryOnly = filtered.filter(
      (c) =>
        isPrimaryMetricForScreen(c.screenType, key) ||
        c.labelScore >= (isCriticalOcrKey(key) ? 95 : 80),
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

  // 明確な一次画面から採用できた場合も、二次画面の差は競合にしない
  if (isPrimaryMetricForScreen(adopted.screenType, key)) {
    const rank = metricScreenRank(key, adopted.screenType);
    if (rank === 0) return false;
  }

  return true;
}

function resolveEffectiveScreenType(
  result: ImageExtractResult,
): SoxaiScreenType {
  if (result.screenType && result.screenType !== "other") {
    return result.screenType;
  }
  return inferScreenTypeFromReadings(result.readings ?? []);
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
 * - ホーム代表値はホーム画面を最優先（他画面との差は競合にしない）
 * - 同一項目の競合は「画面種別優先 → ラベル一致 → 値形式」で採用
 * - 競合表示は本当に判断できない場合のみ
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

      const readings = result.readings ?? [];
      const sourceLabel = resolveSourceLabel(result, key);
      const screenType = resolveEffectiveScreenType(result);
      let labelScore = labelMatchScore(key, sourceLabel);
      let screenScore = screenTypeScore(readings, key);
      screenScore += screenAffinityScore(screenType, key);

      if (key === "sleepScore" && isLikelyChartFragment(readings)) {
        labelScore = Math.min(labelScore, 25);
      }
      if (
        key === "restingHeartRate" &&
        /最小|最大|min|max/i.test(sourceLabel) &&
        !/平均|avg|mean/i.test(sourceLabel)
      ) {
        labelScore = Math.min(labelScore, 20);
      }

      candidates.push({
        imageIndex: result.imageIndex,
        value,
        labelScore,
        screenScore,
        reliability: scoreValueReliability(key, value),
        sourceLabel,
        screenType,
      });
    }

    if (candidates.length === 0) continue;

    const gated = filterCandidatesForKey(key, candidates);

    const byNorm = new Map<string, Candidate[]>();
    for (const candidate of gated) {
      const norm = normalizeComparable(candidate.value);
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
    if (key === "sleepScore") {
      const n = Number(adopted.value.replace(/[^\d.-]/g, ""));
      merged.sleepScore = Number.isFinite(n) ? n : null;
    } else {
      merged[key] = adopted.value;
    }

    confidence[key] = confidenceFromCandidateForKey(key, adopted, byNorm.size);

    if (shouldRecordConflict(key, adopted, byNorm.size)) {
      const alternatives = [...byNorm.entries()]
        .filter(([norm]) => norm !== normalizeComparable(adopted.value))
        .map(([, group]) => pickBestCandidateForKey(key, group).value);

      if (alternatives.length > 0) {
        conflicts.push({
          key,
          label: labelByKey.get(key) ?? key,
          adopted: adopted.value,
          alternatives: [...new Set(alternatives)],
        });
      }
    }
  }

  const normalized = normalizeMetrics(merged);
  if (normalized.bedtime.trim()) {
    normalized.bedtime = normalizeTimeToHHMM(normalized.bedtime);
  }
  if (normalized.wakeTime.trim()) {
    normalized.wakeTime = normalizeTimeToHHMM(normalized.wakeTime);
  }

  return {
    metrics: normalized,
    conflicts,
    confidence,
  };
}
