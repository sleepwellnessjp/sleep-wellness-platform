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

export type ImageExtractResult = {
  imageIndex: number;
  metrics: AnalysisMetrics;
  visibleReadingCount: number;
  /** その画像の OCR ラベル一覧（競合解決用） */
  readings?: VisibleReading[];
  /** 各メトリクスの出典ラベル */
  provenance?: MetricProvenance;
};

export type MergedMetricConflict = {
  key: MetricFieldKey;
  label: string;
  adopted: string;
  alternatives: string[];
};

export type MergedExtractResult = {
  metrics: AnalysisMetrics;
  conflicts: MergedMetricConflict[];
};

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
    if (/℃|°c|°|度/i.test(v)) score += 4;
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
};

function candidateRank(c: Candidate): number {
  // ラベル一致と画面種別が主。信頼度はタイブレーカーのみ。
  return c.labelScore * 100 + c.screenScore * 40 + c.reliability;
}

function pickBestCandidate(candidates: Candidate[]): Candidate {
  return [...candidates].sort((a, b) => {
    const diff = candidateRank(b) - candidateRank(a);
    if (diff !== 0) return diff;
    return a.imageIndex - b.imageIndex;
  })[0];
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
 * - 同一項目の競合は「ラベル一致 → 画面種別 → 値形式」の順で採用
 * - 概要より詳細、単独数値よりラベル付きを優先
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
    return { metrics: emptyMetrics(), conflicts: [] };
  }

  const labelByKey = new Map(
    SOXAI_METRIC_FIELDS.map((field) => [field.key, field.label] as const),
  );
  const merged = emptyMetrics();
  const conflicts: MergedMetricConflict[] = [];

  for (const field of SOXAI_METRIC_FIELDS) {
    const key = field.key;
    const candidates: Candidate[] = [];

    for (const result of valid) {
      if (!isMetricPresent(result.metrics, key)) continue;
      const value = metricDisplayValue(result.metrics, key).trim();
      if (!value) continue;

      const readings = result.readings ?? [];
      const sourceLabel = resolveSourceLabel(result, key);
      let labelScore = labelMatchScore(key, sourceLabel);
      const screenScore = screenTypeScore(readings, key);

      // 平均/最大チャート断片の「睡眠スコア」は誤ペアが多いので大幅に下げる
      if (key === "sleepScore" && isLikelyChartFragment(readings)) {
        labelScore = Math.min(labelScore, 25);
      }
      // 安静時心拍数の最小/最大は代表値にしない
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
      });
    }

    if (candidates.length === 0) continue;

    const byNorm = new Map<string, Candidate[]>();
    for (const candidate of candidates) {
      const norm = normalizeComparable(candidate.value);
      const list = byNorm.get(norm) ?? [];
      list.push(candidate);
      byNorm.set(norm, list);
    }

    const scored: Candidate[] = [];
    for (const group of byNorm.values()) {
      const bestInGroup = pickBestCandidate(group);
      scored.push({
        ...bestInGroup,
        reliability:
          bestInGroup.reliability + Math.min(group.length, 5) * 1.5,
      });
    }

    const adopted = pickBestCandidate(scored);
    if (key === "sleepScore") {
      const n = Number(adopted.value.replace(/[^\d.-]/g, ""));
      merged.sleepScore = Number.isFinite(n) ? n : null;
    } else {
      merged[key] = adopted.value;
    }

    if (byNorm.size > 1) {
      const alternatives = [...byNorm.entries()]
        .filter(([norm]) => norm !== normalizeComparable(adopted.value))
        .map(([, group]) => pickBestCandidate(group).value);

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

  return {
    metrics: normalizeMetrics(merged),
    conflicts,
  };
}
