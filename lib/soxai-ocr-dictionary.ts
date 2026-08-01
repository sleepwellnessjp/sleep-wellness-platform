/**
 * SOXAI OCR 辞書（ラベル見出し優先）
 * 入眠・起床・皮膚温度・ストレスを最優先で拾う。
 * 全メトリクスの表記ゆれ・改行・OCR誤認候補を許容する。
 */

import type { MetricFieldKey } from "@/lib/soxai-metrics";

/** 正規化済みラベルに対するエイリアス（長い語を先に） */
export const CRITICAL_LABEL_ALIASES: Record<
  "bedtime" | "wakeTime" | "skinTemperature" | "stress",
  readonly string[]
> = {
  bedtime: [
    "入眠した時刻",
    "入眠した時間",
    "入眠時刻",
    "入眠時間",
    "睡眠開始時刻",
    "睡眠開始時間",
    "睡眠開始",
    "眠り始め",
    "眠りはじめ",
    "スリープ開始",
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
    "起床した時間",
    "起床時刻",
    "起床時間",
    "睡眠終了時刻",
    "睡眠終了時間",
    "睡眠終了",
    "起きた時刻",
    "起きた時間",
    "目覚め",
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
    "皮虜温",
    "皮虜温度",
    "スキンテンプ",
    "体表温度",
    "体表温",
    "体温偏差",
    "体温差",
    "温度偏差",
    "ベースライン偏差",
    "平均皮膚温度",
    "平均皮膚温",
    "皮膚温度平均",
    "皮膚温平均",
    "最新の変化",
    "最新変化",
    "最新の温度変化",
    "温度変化",
    "skintemperature",
    "skin temperature",
    "skintemp",
    "skin temp",
    "skin temperature deviation",
    "temperature deviation",
    "temp deviation",
    "baseline deviation",
    "latestdeviation",
    "latest change",
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
    "ストレス（平均）",
    "ストレス(平均)",
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

/**
 * 全メトリクスの OCR 候補ラベル（正規化前でも可。match 時に normalize する）。
 * 表記ゆれ・英語・略称・よくある OCR 誤認を含む。
 */
export const METRIC_LABEL_ALIASES: Partial<
  Record<MetricFieldKey, readonly string[]>
> = {
  sleepScore: [
    "睡眠スコア",
    "sleepscore",
    "総合スコア",
    "昨夜のスコア",
    "本日の睡眠",
    "睡眠",
    "スコア",
    "score",
  ],
  qol: [
    "qol",
    "qualityoflife",
    "現在のqol",
    "きょうのqol",
    "今日のqol",
    "現在のスコア",
    "クオリティオブライフ",
  ],
  yesterdayQol: [
    "昨日のqol",
    "昨日のスコア",
    "きのうのスコア",
    "きのうのqol",
    "yesterdayqol",
    "yesterdayscore",
    "昨日スコア",
  ],
  conditionScore: [
    "体調",
    "体調スコア",
    "コンディションスコア",
    "コンディション",
    "conditionscore",
    "condition",
  ],
  sleepDuration: [
    "睡眠時間",
  ],
  bedtime: CRITICAL_LABEL_ALIASES.bedtime,
  wakeTime: CRITICAL_LABEL_ALIASES.wakeTime,
  sleepEfficiency: [
    "睡眠効率",
    "sleepefficiency",
    "efficiency",
    "効率",
  ],
  sleepDebt: ["睡眠負債", "sleepdebt", "負債", "睡眠の負債"],
  circadianRhythm: [
    "体内時計",
    "circadian",
    "クロノ",
    "位相",
    "サーカディアン",
  ],
  sleepLatency: [
    "入眠潜時",
    "潜時",
    "latency",
    "sleeplatency",
    "入眠までの時間",
    "入眠にかかった時間",
  ],
  awakenings: [
    "覚醒時間",
    "中途覚醒",
    "覚醒の時間",
    "覚醒",
    "awake",
    "awaketime",
    "中途覚醒時間",
  ],
  awakeningRate: [
    "覚醒率",
    "awake%",
    "awakepercent",
    "覚醒割合",
    "覚醒%",
    "覚醒％",
  ],
  remSleep: [
    "レム睡眠時間",
    "レム時間",
    "rem時間",
    "レム睡眠",
    "レム",
    "rem",
    "remsleep",
  ],
  remSleepRate: [
    "レム睡眠率",
    "レム率",
    "rem率",
    "rem%",
    "rempercent",
    "レム割合",
    "レム%",
    "レム％",
  ],
  nonRemSleep: [
    "ノンレム睡眠時間",
    "ノンレム時間",
    "nrem時間",
    "ノンレム睡眠",
    "ノンレム",
    "nrem",
    "nonrem",
    "nonremsleep",
    "nremsleep",
  ],
  nonRemSleepRate: [
    "ノンレム睡眠率",
    "ノンレム率",
    "nrem率",
    "nrem%",
    "nrempercent",
    "ノンレム割合",
    "ノンレム%",
    "ノンレム％",
    "nonrem%",
    "nonrempercent",
  ],
  lightSleep: [
    "浅い睡眠時間",
    "浅い時間",
    "light時間",
    "浅い睡眠",
    "浅い",
    "light",
    "lightsleep",
  ],
  lightSleepRate: [
    "浅い睡眠率",
    "light%",
    "lightpercent",
    "浅い割合",
    "浅い%",
    "浅い％",
    "浅%",
    "浅い率",
    "浅率",
  ],
  deepSleep: [
    "深い睡眠時間",
    "深い時間",
    "deep時間",
    "深い睡眠",
    "深い",
    "deep",
    "deepsleep",
  ],
  deepSleepRate: [
    "深い睡眠率",
    "deep%",
    "deeppercent",
    "深い割合",
    "深い%",
    "深い％",
    "深%",
    "深い率",
    "深率",
  ],
  respiratoryRate: [
    "呼吸速度",
    "呼吸数",
    "平均呼吸",
    "呼吸",
    "respiratory",
    "respiration",
    "brpm",
    "rpm",
    "呼吸rpm",
  ],
  spo2: [
    "spo2",
    "spo₂",
    "血中酸素",
    "酸素飽和",
    "酸素飽和度",
    "血中酸素濃度",
    "酸素レベル",
    "平均酸素",
    "平均spo",
    "平均酸素レベル",
    // Vision 誤読（酸素→状態 / 酸素素）
    "平均状態レベル",
    "平均状熊レベル",
    "状態レベル",
    "平均酸素素レベル",
    "酸素素レベル",
  ],
  restingHeartRate: [
    "安静時心拍数平均",
    "安静時心拍平均",
    "安静時心拍数",
    "安静時心拍",
    "rhr",
    "restinghr",
    "restingheartrate",
    "平均心拍",
  ],
  restingHeartRateMin: [
    "安静時心拍数最小",
    "安静時心拍最小",
    "最小心拍数",
    "最小心拍",
    "rhrmin",
    "minhr",
  ],
  restingHeartRateMax: [
    "安静時心拍数最大",
    "安静時心拍最大",
    "最大心拍数",
    "最大心拍",
    "rhrmax",
    "maxhr",
  ],
  hrv: [
    "平均hrv",
    "hrv平均",
    "平均心拍変動",
    "心拍変動平均",
    "平均rmssd",
  ],
  hrvMax: [
    "最大hrv",
    "hrvmax",
    "maxhrv",
    "心拍変動最大",
    "最大心拍変動",
    "hrv最大",
  ],
  hrvMin: [
    "最小hrv",
    "hrvmin",
    "minhrv",
    "心拍変動最小",
    "最小心拍変動",
    "hrv最小",
  ],
  skinTemperature: CRITICAL_LABEL_ALIASES.skinTemperature,
  stress: CRITICAL_LABEL_ALIASES.stress,
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
      /(?:入眠(?:した)?(?:時間|時刻)?|睡眠開始|就寝(?:時間|時刻)?|眠り始め|fell\s*asleep|sleep\s*onset|bed\s*time|onset)\s*[:：]?\s*/i,
  },
  {
    key: "wakeTime",
    labelRe:
      /(?:起床(?:した)?(?:時間|時刻)?|睡眠終了|起きた(?:時間|時刻)?|目覚め|got\s*up|wake\s*time|wake\s*up|rise)\s*[:：]?\s*/i,
  },
];

/** OCR 誤認・表記ゆれを吸収した正規化 */
export function normalizeOcrLabel(label: string): string {
  return label
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[\s　_\-－—–：:（）()【】\[\]「」『』・･./／％%]/g, "");
}

/**
 * 1ラベルから複数の照合候補を生成（改行・空白違い・括弧除去など）。
 */
export function expandLabelCandidates(label: string): string[] {
  const raw = label.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "");
  const variants = new Set<string>();
  const push = (s: string) => {
    const n = normalizeOcrLabel(s);
    if (n) variants.add(n);
  };

  push(raw);
  push(raw.replace(/[\r\n]+/g, ""));
  push(raw.replace(/[\r\n]+/g, " "));
  push(raw.replace(/\s+/g, ""));
  push(raw.replace(/[（(].*?[）)]/g, ""));
  push(raw.replace(/[・･]/g, ""));
  // 「睡眠 時間」「浅い 睡眠 率」など空白入り
  push(raw.replace(/\s+/g, " ").trim());
  // 「深い％」「覚醒%」→「深い率」「覚醒率」（normalize が % を落とす前に率へ）
  push(raw.replace(/[％%]/g, "率"));

  return [...variants];
}

/**
 * 見出しラベルが辞書のどのキーに当たるか（最長一致）。
 * 除外パターンに当たれば null。
 */
export function matchCriticalLabel(
  label: string,
): "bedtime" | "wakeTime" | "skinTemperature" | "stress" | null {
  const candidates = expandLabelCandidates(label);
  if (candidates.length === 0) return null;

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
      for (const normalized of candidates) {
        if (
          normalized === a ||
          normalized.includes(a) ||
          a.includes(normalized)
        ) {
          if (normalized !== a) {
            if (normalized.includes(a) && a.length < 2) continue;
            if (a.includes(normalized) && normalized.length < 3) continue;
          }
          if (key === "bedtime" && BEDTIME_EXCLUDE.test(normalized)) continue;
          if (key === "wakeTime" && WAKETIME_EXCLUDE.test(normalized)) continue;
          if (key === "skinTemperature" && SKIN_TEMP_EXCLUDE.test(normalized)) {
            continue;
          }
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
  }

  return best?.key ?? null;
}

export function isWeakContextLabel(label: string): boolean {
  const n = normalizeOcrLabel(label);
  return /^(平均|現在|偏差|avg|mean|current|delta|値|レベル|level|最大|最小|max|min|最新の変化|最新変化|変化)$/.test(
    n,
  );
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
    return /皮膚|皮虜|体表|温度|skintemp|temp|偏差|delta|スキン|最新の変化|変化/.test(
      joined,
    );
  }
  return /ストレス|stress/.test(joined);
}

/**
 * 単位付き数値だけ（ラベルなし/弱ラベル）からキーを推定するためのヒント。
 */
export function inferKeyFromUnitValue(
  value: string,
  siblingLabels: string[] = [],
  currentLabel = "",
): MetricFieldKey | null {
  const v = value.normalize("NFKC").trim();
  const joined = siblingLabels.map(normalizeOcrLabel).join("|");
  const current = normalizeOcrLabel(currentLabel);

  if (/bpm|拍\/分|回\/分(?!\s*呼吸)/i.test(v)) {
    // bpm は安静時心拍。HRV は ms なので bpm を HRV にしない
    if (/安静時心拍/.test(joined) || /安静時心拍/.test(current)) {
      return "restingHeartRate";
    }
    return null;
  }
  // カード内の「平均」＋安静時心拍数ラベル（ms なし）は必ず安静時心拍
  if (
    (/安静時心拍/.test(joined) || /安静時心拍/.test(current)) &&
    !/\bms\b|ミリ秒/i.test(v) &&
    /^\d{2,3}(\.\d+)?$/.test(v)
  ) {
    return "restingHeartRate";
  }
  // HRV カードの裸数字: 現在ラベルの最大/最小を優先
  if (
    /^\d{1,3}(\.\d+)?$/.test(v) &&
    (/心拍変動|hrv|rmssd/.test(joined) || /心拍変動|hrv|rmssd/.test(current)) &&
    !/安静時心拍/.test(joined) &&
    !/安静時心拍/.test(current)
  ) {
    if (/最大|max/.test(current)) return "hrvMax";
    if (/最小|min/.test(current)) return "hrvMin";
  }
  if (
    /^\d{2,3}$/.test(v) &&
    (/心拍|rhr|heartrate|安静時/.test(joined) ||
      /心拍|rhr|heartrate|安静時/.test(current))
  ) {
    // ms なしの裸数字は HRV にしない（安静時平均の取り違え防止）
    return null;
  }
  // ms 単独（逆ラベル）は平均HRV文脈があるときだけ
  if (
    /^(ms|ミリ秒)$/i.test(v) &&
    (/平均hrv|hrv平均|平均心拍変動|心拍変動平均|平均rmssd/.test(joined) ||
      (/平均|avg|mean/.test(joined) && /hrv|心拍変動|rmssd/.test(joined)))
  ) {
    return "hrv";
  }
  // HRV は「平均HRV/平均心拍変動」文脈の ms のみ（裸の ms・最大・安静時は不可）
  // 最大/最小は「現在ラベル」で判定（sibling に最大があるだけで平均値を hrvMax にしない）
  if (/\bms\b|ミリ秒/i.test(v)) {
    if (
      (/最大|max/.test(current) ||
        (/心拍変動|hrv|rmssd/.test(current) && /最大|max/.test(current))) &&
      !/平均|avg|mean/.test(current)
    ) {
      return "hrvMax";
    }
    if (
      (/最小|min/.test(current) ||
        (/心拍変動|hrv|rmssd/.test(current) && /最小|min/.test(current))) &&
      !/平均|avg|mean/.test(current)
    ) {
      return "hrvMin";
    }
    if (
      /平均hrv|hrv平均|平均心拍変動|心拍変動平均|平均rmssd/.test(joined) ||
      /平均hrv|hrv平均|平均心拍変動|心拍変動平均|平均rmssd|^平均$|^avg$|^mean$/.test(
        current,
      ) ||
      (/平均|avg|mean/.test(joined) &&
        /hrv|心拍変動|rmssd/.test(joined) &&
        !/安静時心拍/.test(joined))
    ) {
      return "hrv";
    }
    return null;
  }
  if (/\brpm\b|\bbrpm\b|呼吸\/分|回\/分/i.test(v) || (/^\d{1,2}(\.\d+)?$/.test(v) && /呼吸|respir/.test(joined))) {
    return "respiratoryRate";
  }
  if (/℃|°\s*c/i.test(v) || (/^[+-]\s*\d+(\.\d+)?$/.test(v) && /皮膚|皮虜|体表|温度|temp|偏差/.test(joined))) {
    return "skinTemperature";
  }
  if (/%|％/.test(v)) {
    if (/覚醒|awake/.test(joined)) return "awakeningRate";
    // ノンレムをレムより先に判定（「ノンレム」は「レム」を含む）
    if (/ノンレム|nrem|non.?rem/.test(joined)) return "nonRemSleepRate";
    if (/レム|rem/.test(joined) && !/ノンレム|nrem|non.?rem/.test(joined))
      return "remSleepRate";
    if (/浅|light/.test(joined)) return "lightSleepRate";
    if (/深|deep/.test(joined)) return "deepSleepRate";
    if (/効率|efficiency/.test(joined)) return "sleepEfficiency";
    // 「平均状態レベル」は Vision の酸素誤読
    if (/spo|酸素|状態レベル|状熊レベル/.test(joined)) return "spo2";
  }
  if (/ストレス|stress/.test(joined) && /^\d{1,3}(\.\d+)?$/.test(v)) {
    return "stress";
  }
  return null;
}

export const CRITICAL_METRIC_KEYS: MetricFieldKey[] = [
  "bedtime",
  "wakeTime",
  "skinTemperature",
  "stress",
  // sleep_stages 画面で取り逃しやすい率（%）項目
  "awakeningRate",
  "remSleepRate",
  "nonRemSleepRate",
  "lightSleepRate",
  "deepSleepRate",
  // respiration / sleep_stages 画面の SpO₂・安静時平均
  "spo2",
  "restingHeartRate",
  "hrv",
];

/** 画面ゲートを緩めて全 readings から埋め直す対象（不足時リカバリ） */
export const RECOVERABLE_METRIC_KEYS: MetricFieldKey[] = [
  "sleepScore",
  "qol",
  "yesterdayQol",
  "conditionScore",
  "sleepDuration",
  "bedtime",
  "wakeTime",
  "sleepEfficiency",
  "sleepDebt",
  "circadianRhythm",
  "sleepLatency",
  "awakenings",
  "awakeningRate",
  "remSleep",
  "remSleepRate",
  "nonRemSleep",
  "nonRemSleepRate",
  "lightSleep",
  "lightSleepRate",
  "deepSleep",
  "deepSleepRate",
  "respiratoryRate",
  "spo2",
  "restingHeartRate",
  "restingHeartRateMin",
  "restingHeartRateMax",
  "hrv",
  "hrvMax",
  "hrvMin",
  "skinTemperature",
  "stress",
];
