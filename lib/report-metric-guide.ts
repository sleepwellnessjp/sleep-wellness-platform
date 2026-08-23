/**
 * 分析結果レポート用：指標の評価（★＋文言）と一般的な目安。
 * UI 説明用のみ。分析ロジック・OCR は変更しない。
 */

import type { AnalysisMetrics, MetricFieldKey } from "@/lib/soxai-metrics";
import {
  parseDurationMinutes,
  parseLeadingNumber,
  parsePercent,
} from "@/lib/soxai-graphs";
import { evaluateSleepDebtDisplay } from "@/lib/sleep-debt-evaluation";

export type MetricStars = 1 | 2 | 3 | 4 | 5;

export type MetricEvaluation = {
  /** null のとき★非表示（睡眠負債のマイナスなど） */
  stars: MetricStars | null;
  starsLabel: string;
  label: string;
};

export type MetricGuide = {
  /** カード下に小さく出す目安（改行可） */
  text: string;
};

function clampStars(n: number): MetricStars {
  if (n <= 1) return 1;
  if (n === 2) return 2;
  if (n === 3) return 3;
  if (n === 4) return 4;
  return 5;
}

export function formatMetricStars(stars: MetricStars): string {
  return `${"★".repeat(stars)}${"☆".repeat(5 - stars)}`;
}

function evalFrom(stars: number | null, label: string): MetricEvaluation {
  if (stars == null) {
    return { stars: null, starsLabel: "", label };
  }
  const s = clampStars(stars);
  return { stars: s, starsLabel: formatMetricStars(s), label };
}

/** 数値指標の評価。時刻・文言のみの項目は null */
export function evaluateMetric(
  key: MetricFieldKey | "hrvRange",
  metrics: AnalysisMetrics,
): MetricEvaluation | null {
  switch (key) {
    case "sleepScore": {
      const v = metrics.sleepScore;
      if (v == null || !Number.isFinite(v)) return null;
      if (v >= 90) return evalFrom(5, "とても良い");
      if (v >= 80) return evalFrom(4, "良い");
      if (v >= 70) return evalFrom(3, "普通");
      if (v >= 60) return evalFrom(2, "やや低い");
      return evalFrom(1, "要改善");
    }
    case "sleepEfficiency": {
      const p = parsePercent(metrics.sleepEfficiency);
      if (p == null) return null;
      if (p >= 90) return evalFrom(5, "とても良い");
      if (p >= 85) return evalFrom(4, "良い");
      if (p >= 80) return evalFrom(3, "普通");
      if (p >= 75) return evalFrom(2, "やや低い");
      return evalFrom(1, "要改善");
    }
    case "sleepDuration": {
      const m = parseDurationMinutes(metrics.sleepDuration);
      if (m == null) return null;
      const h = m / 60;
      if (h >= 7 && h <= 9) return evalFrom(5, "とても良い");
      if (h >= 6.5 && h < 7) return evalFrom(4, "良い");
      if (h >= 6 && h < 6.5) return evalFrom(3, "普通");
      if (h >= 5 && h < 6) return evalFrom(2, "やや短い");
      if (h > 9 && h <= 10) return evalFrom(3, "やや長い");
      return evalFrom(1, "要改善");
    }
    case "sleepLatency": {
      const m = parseDurationMinutes(metrics.sleepLatency);
      if (m == null) return null;
      if (m <= 15) return evalFrom(5, "とても良い");
      if (m <= 20) return evalFrom(4, "良い");
      if (m <= 30) return evalFrom(3, "普通");
      if (m <= 45) return evalFrom(2, "やや長い");
      return evalFrom(1, "要改善");
    }
    case "sleepDebt": {
      const m = parseDurationMinutes(metrics.sleepDebt);
      if (m == null) return null;
      const debt = evaluateSleepDebtDisplay(m);
      if (!debt) return null;
      return evalFrom(debt.stars, debt.label);
    }
    case "remSleepRate": {
      const p = parsePercent(metrics.remSleepRate);
      if (p == null) return null;
      if (p >= 18 && p <= 25) return evalFrom(5, "とても良い");
      if (p >= 15 && p < 18) return evalFrom(4, "良い");
      if (p >= 12 && p < 15) return evalFrom(3, "普通");
      if (p >= 10 && p < 12) return evalFrom(2, "やや少ない");
      if (p > 25 && p <= 30) return evalFrom(3, "やや多い");
      return evalFrom(1, "要改善");
    }
    case "deepSleepRate":
    case "nonRemSleepRate": {
      const p = parsePercent(
        key === "deepSleepRate"
          ? metrics.deepSleepRate
          : metrics.nonRemSleepRate,
      );
      if (p == null) return null;
      // SOXAI深い睡眠率（表示上ノンレム）の一般目安
      if (p >= 15 && p <= 25) return evalFrom(5, "とても良い");
      if (p >= 12 && p < 15) return evalFrom(4, "良い");
      if (p >= 10 && p < 12) return evalFrom(3, "普通");
      if (p >= 8 && p < 10) return evalFrom(2, "やや少ない");
      if (p > 25 && p <= 35) return evalFrom(3, "やや多い");
      return evalFrom(1, "要改善");
    }
    case "awakeningRate": {
      const p = parsePercent(metrics.awakeningRate);
      if (p == null) return null;
      if (p <= 8) return evalFrom(5, "とても良い");
      if (p <= 12) return evalFrom(4, "良い");
      if (p <= 18) return evalFrom(3, "普通");
      if (p <= 25) return evalFrom(2, "やや多い");
      return evalFrom(1, "要改善");
    }
    case "hrv": {
      const n = parseLeadingNumber(metrics.hrv);
      if (n == null) return null;
      if (n >= 70) return evalFrom(5, "とても良い");
      if (n >= 50) return evalFrom(4, "高い");
      if (n >= 35) return evalFrom(3, "普通");
      if (n >= 25) return evalFrom(2, "やや低い");
      return evalFrom(1, "要改善");
    }
    case "hrvMax": {
      const n = parseLeadingNumber(metrics.hrvMax);
      if (n == null) return null;
      if (n >= 100) return evalFrom(5, "とても良い");
      if (n >= 80) return evalFrom(4, "高い");
      if (n >= 60) return evalFrom(3, "普通");
      if (n >= 40) return evalFrom(2, "やや低い");
      return evalFrom(1, "要改善");
    }
    case "hrvMin":
    case "hrvRange": {
      const min = parseLeadingNumber(metrics.hrvMin);
      const max = parseLeadingNumber(metrics.hrvMax);
      if (min == null || max == null || max < min) return null;
      const span = max - min;
      if (span >= 40) return evalFrom(5, "変動が十分");
      if (span >= 25) return evalFrom(4, "良好");
      if (span >= 15) return evalFrom(3, "普通");
      if (span >= 8) return evalFrom(2, "やや狭い");
      return evalFrom(1, "狭い");
    }
    case "restingHeartRate": {
      const n = parseLeadingNumber(metrics.restingHeartRate);
      if (n == null) return null;
      if (n <= 55) return evalFrom(5, "とても良い");
      if (n <= 60) return evalFrom(4, "良い");
      if (n <= 70) return evalFrom(3, "普通");
      if (n <= 80) return evalFrom(2, "やや高め");
      return evalFrom(1, "高め");
    }
    case "restingHeartRateMin": {
      const n = parseLeadingNumber(metrics.restingHeartRateMin);
      if (n == null) return null;
      if (n <= 50) return evalFrom(5, "とても良い");
      if (n <= 55) return evalFrom(4, "良い");
      if (n <= 65) return evalFrom(3, "普通");
      if (n <= 75) return evalFrom(2, "やや高め");
      return evalFrom(1, "高め");
    }
    case "restingHeartRateMax": {
      const n = parseLeadingNumber(metrics.restingHeartRateMax);
      if (n == null) return null;
      if (n <= 70) return evalFrom(5, "とても良い");
      if (n <= 80) return evalFrom(4, "良い");
      if (n <= 90) return evalFrom(3, "普通");
      if (n <= 100) return evalFrom(2, "やや高め");
      return evalFrom(1, "高め");
    }
    case "spo2": {
      const p = parsePercent(metrics.spo2) ?? parseLeadingNumber(metrics.spo2);
      if (p == null) return null;
      if (p >= 96) return evalFrom(5, "とても良い");
      if (p >= 94) return evalFrom(4, "良い");
      if (p >= 93) return evalFrom(3, "やや低い");
      if (p >= 90) return evalFrom(2, "低め・確認推奨");
      return evalFrom(1, "要確認");
    }
    case "respiratoryRate": {
      const n = parseLeadingNumber(metrics.respiratoryRate);
      if (n == null) return null;
      if (n >= 12 && n <= 16) return evalFrom(5, "とても良い");
      if (n >= 10 && n <= 18) return evalFrom(4, "良い");
      if (n >= 8 && n <= 20) return evalFrom(3, "普通");
      return evalFrom(2, "要確認");
    }
    case "stress": {
      const n = parseLeadingNumber(metrics.stress);
      if (n == null) return null;
      if (n <= 25) return evalFrom(5, "とても良い");
      if (n <= 40) return evalFrom(4, "低い");
      if (n <= 55) return evalFrom(3, "普通");
      if (n <= 70) return evalFrom(2, "やや高い");
      return evalFrom(1, "高い");
    }
    case "skinTemperature": {
      const n = parseLeadingNumber(metrics.skinTemperature);
      if (n == null) return null;
      const abs = Math.abs(n);
      if (abs <= 0.3) return evalFrom(5, "とても良い");
      if (abs <= 0.6) return evalFrom(4, "良い");
      if (abs <= 1.0) return evalFrom(3, "普通");
      if (abs <= 1.5) return evalFrom(2, "やや大きい");
      return evalFrom(1, "要確認");
    }
    default:
      return null;
  }
}

/** パネル／指標キーごとの一般的な目安（認定講師向け） */
export function metricGuideline(
  key:
    | MetricFieldKey
    | "hrv"
    | "rhr"
    | "stages"
    | "stress"
    | "circadian"
    | "respiration"
    | "skin-temp"
    | "stage-detail",
): string {
  switch (key) {
    case "sleepScore":
      return "一般：70点前後　良い：80点以上　とても良い：90点以上";
    case "sleepDuration":
      return "一般：7〜9時間が目安　短い夜が続く場合は負債に注意";
    case "sleepEfficiency":
      return "90%以上が理想　85%以上で良好　80%未満は整え余地あり";
    case "sleepLatency":
      return "一般：15〜20分以内　30分超が続く場合は入眠環境を確認";
    case "sleepDebt":
      return "0に近いほど理想　積み重なると日中の回復感に影響しやすい\nマイナスは、それだけ早く就寝する余地があることを示します";
    case "bedtime":
    case "wakeTime":
      return "毎日の入眠・起床時刻のばらつきが小さいほど体内時計が整いやすい";
    case "circadianRhythm":
    case "circadian":
      return "位相のずれが小さいほど理想　起床後の光浴で整えやすい";
    case "remSleep":
    case "remSleepRate":
      return "レム睡眠率の一般目安：約18〜25%";
    case "deepSleep":
    case "deepSleepRate":
    case "nonRemSleep":
    case "nonRemSleepRate":
      return "深い睡眠率の一般目安：約13〜23%（個人差あり）";
    case "awakenings":
    case "awakeningRate":
      return "覚醒は少ないほど理想　率はおおむね10%前後までが目安";
    case "lightSleep":
    case "lightSleepRate":
      return "浅い睡眠は全体の半分前後が多い　単独では良し悪しを断定しにくい";
    case "stages":
    case "stage-detail":
      return "理想の目安：レム約20%前後／深い睡眠約15〜20%／覚醒は少なめ";
    case "hrv":
    case "hrvMax":
    case "hrvMin":
      return "一般：30〜70ms　高い：70ms以上　低い：30ms未満（個人差・年齢あり）";
    case "restingHeartRate":
    case "restingHeartRateMin":
    case "restingHeartRateMax":
    case "rhr":
      return "安静時心拍の一般：55〜75bpm　低いほど回復寄り（個人差あり）";
    case "respiratoryRate":
      return "睡眠時呼吸の一般：12〜16回/分前後";
    case "spo2":
      return "平均SpO₂：95%以上が目安　93%未満が続く場合は確認を推奨";
    case "respiration":
      return "呼吸：12〜16回/分　SpO₂：95%以上が一般的な目安";
    case "skinTemperature":
    case "skin-temp":
      return "ベースラインからの変化が小さいほど安定　±1℃超は要観察";
    case "stress":
      return "低いほど負担が少ない目安　高い夜は回復・睡眠の質に影響しやすい";
    default:
      return "";
  }
}

export function formatHrvRange(metrics: AnalysisMetrics): string {
  const min = String(metrics.hrvMin ?? "").trim();
  const max = String(metrics.hrvMax ?? "").trim();
  // 片方が欠損している場合はカード非表示用に空文字を返す
  if (min && max) return `${min} 〜 ${max}`;
  return "";
}
