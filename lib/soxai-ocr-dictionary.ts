/**
 * SOXAI OCR 辞書（ラベル見出し優先）
 * 入眠・起床・皮膚温度・ストレスを最優先で拾う。
 */

import type { MetricFieldKey } from "@/lib/soxai-metrics";

/** 正規化済みラベルに対するエイリアス（長い語を先に） */
export const CRITICAL_LABEL_ALIASES: Record<
  "bedtime" | "wakeTime" | "skinTemperature" | "stress",
  readonly string[]
> = {
  bedtime: [
    "入眠した時刻",
    "入眠時刻",
    "入眠時間",
    "睡眠開始時刻",
    "睡眠開始時間",
    "睡眠開始",
    "入眠",
    "就寝時刻",
    "就寝時間",
    "就寝",
    "眠りについた時刻",
    "眠りについた時間",
    "fellasleep",
    "fell asleep",
    "sleeponset",
    "sleep onset",
    "sleepstart",
    "sleep start",
    "asleepat",
    "asleep at",
    "bedtime",
    "bed time",
    "onset",
    "開始時刻",
    "開始時間",
  ],
  wakeTime: [
    "起床した時刻",
    "起床時刻",
    "起床時間",
    "睡眠終了時刻",
    "睡眠終了時間",
    "睡眠終了",
    "起床",
    "起き上がった時刻",
    "起き上がった時間",
    "gotup",
    "got up",
    "waketime",
    "wake time",
    "wakeuptime",
    "wake up time",
    "wakeup",
    "wake up",
    "rise",
    "risen",
    "out of bed",
    "終了時刻",
    "終了時間",
  ],
  skinTemperature: [
    "皮膚温度偏差",
    "皮膚温度",
    "皮膚温偏差",
    "皮膚温",
    "体表温度",
    "体表温",
    "体温偏差",
    "温度偏差",
    "ベースライン偏差",
    "平均皮膚温度",
    "平均皮膚温",
    "皮膚温度平均",
    "皮膚温平均",
    "skintemperature",
    "skin temperature",
    "skintemp",
    "skin temp",
    "skin temperature deviation",
    "temperature deviation",
    "temp deviation",
    "baseline deviation",
    "delta温度",
    "温度delta",
  ],
  stress: [
    "平均ストレス",
    "ストレス平均",
    "ストレスレベル",
    "ストレス指数",
    "ストレススコア",
    "ストレス値",
    "ストレス度",
    "現在のストレス",
    "夜間ストレス",
    "ストレスモニター",
    "ストレス",
    "averagestress",
    "average stress",
    "stressaverage",
    "stress average",
    "stresslevel",
    "stress level",
    "stressscore",
    "stress score",
    "stressindex",
    "stress index",
    "stressavg",
    "stress avg",
    "stress",
  ],
};

/** これらを含むラベルは bedtime / wakeTime から除外 */
export const BEDTIME_EXCLUDE =
  /潜時|latency|就床|全就床|就寝予定|就寝目標|目標就寝|起床|覚醒|中途|awake|wake.?up.?count/i;

export const WAKETIME_EXCLUDE =
  /覚醒時間|中途覚醒|awake|覚醒率|覚醒の|覚醒回数|入眠|就床|潜時|latency/i;

export const SKIN_TEMP_EXCLUDE = /環境|室温|気温|天候|室外|室外温/i;

/** 複合テキストから入眠・起床を抜き出すパターン */
export const COMPOUND_BED_WAKE_PATTERNS: Array<{
  key: "bedtime" | "wakeTime";
  labelRe: RegExp;
}> = [
  {
    key: "bedtime",
    labelRe:
      /(?:入眠(?:時間|時刻)?|睡眠開始|就寝(?:時間|時刻)?|fell\s*asleep|sleep\s*onset|bed\s*time|onset)\s*[:：]?\s*/i,
  },
  {
    key: "wakeTime",
    labelRe:
      /(?:起床(?:時間|時刻)?|睡眠終了|got\s*up|wake\s*time|wake\s*up|rise)\s*[:：]?\s*/i,
  },
];

export function normalizeOcrLabel(label: string): string {
  return label
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/[\s　_\-－—–：:（）()【】\[\]「」『』・･./／]/g, "");
}

/**
 * 見出しラベルが辞書のどのキーに当たるか（最長一致）。
 * 除外パターンに当たれば null。
 */
export function matchCriticalLabel(
  label: string,
): "bedtime" | "wakeTime" | "skinTemperature" | "stress" | null {
  const normalized = normalizeOcrLabel(label);
  if (!normalized) return null;

  const keys = [
    "bedtime",
    "wakeTime",
    "skinTemperature",
    "stress",
  ] as const;

  let best: {
    key: (typeof keys)[number];
    len: number;
  } | null = null;

  for (const key of keys) {
    for (const alias of CRITICAL_LABEL_ALIASES[key]) {
      const a = normalizeOcrLabel(alias);
      if (!a) continue;
      if (normalized === a || normalized.includes(a) || a.includes(normalized)) {
        // 短すぎる部分一致は誤検出（「温」「時」など）
        if (normalized !== a) {
          if (normalized.includes(a) && a.length < 2) continue;
          if (a.includes(normalized) && normalized.length < 3) continue;
        }
        if (key === "bedtime" && BEDTIME_EXCLUDE.test(normalized)) continue;
        if (key === "wakeTime" && WAKETIME_EXCLUDE.test(normalized)) continue;
        if (key === "skinTemperature" && SKIN_TEMP_EXCLUDE.test(normalized)) {
          continue;
        }
        // 「開始」単独は弱い（詳細画面の文脈でのみ後段フォールバック）
        if (
          (key === "bedtime" || key === "wakeTime") &&
          (normalized === "開始" ||
            normalized === "終了" ||
            normalized === "開始時刻" ||
            normalized === "終了時刻" ||
            normalized === "開始時間" ||
            normalized === "終了時間")
        ) {
          continue;
        }
        const len = a.length;
        if (!best || len > best.len) {
          best = { key, len };
        }
      }
    }
  }

  return best?.key ?? null;
}

export function isWeakContextLabel(label: string): boolean {
  const n = normalizeOcrLabel(label);
  return /^(平均|現在|偏差|avg|mean|current|delta|値|レベル|level)$/.test(n);
}

/** 弱ラベル（平均など）を皮膚温・ストレスに結びつけてよいか */
export function weakLabelFitsCritical(
  key: "skinTemperature" | "stress",
  label: string,
  siblingLabels: string[],
): boolean {
  if (!isWeakContextLabel(label)) return false;
  const joined = siblingLabels.map(normalizeOcrLabel).join("|");
  if (key === "skinTemperature") {
    return /皮膚|体表|温度|skintemp|temp|偏差|delta/.test(joined);
  }
  return /ストレス|stress/.test(joined);
}

export const CRITICAL_METRIC_KEYS: MetricFieldKey[] = [
  "bedtime",
  "wakeTime",
  "skinTemperature",
  "stress",
];
