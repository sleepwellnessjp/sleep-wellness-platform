export type AnalysisMetrics = {
  sleepScore: number | null;
  bedtime: string;
  wakeTime: string;
  sleepDuration: string;
  sleepEfficiency: string;
  awakenings: string;
  awakeningRate: string;
  remSleep: string;
  remSleepRate: string;
  lightSleep: string;
  lightSleepRate: string;
  deepSleep: string;
  deepSleepRate: string;
  sleepDebt: string;
  sleepLatency: string;
  circadianRhythm: string;
  respiratoryRate: string;
  spo2: string;
  restingHeartRate: string;
  hrv: string;
  skinTemperature: string;
  stress: string;
};

export type MetricFieldKey = keyof AnalysisMetrics;

export type MetricFieldDef = {
  key: MetricFieldKey;
  label: string;
  hint: string;
  inputType: "text" | "number" | "time";
  placeholder: string;
};

/** SOXAI画像から抽出・確認する全項目（表示順） */
export const SOXAI_METRIC_FIELDS: MetricFieldDef[] = [
  {
    key: "sleepScore",
    label: "睡眠スコア",
    hint: "Sleep Score / 総合スコア",
    inputType: "number",
    placeholder: "例：78",
  },
  {
    key: "sleepDuration",
    label: "睡眠時間",
    hint: "Total Sleep / 総睡眠",
    inputType: "text",
    placeholder: "例：6時間42分",
  },
  {
    key: "bedtime",
    label: "入眠時間",
    hint: "就寝 / 睡眠開始",
    inputType: "time",
    placeholder: "23:40",
  },
  {
    key: "wakeTime",
    label: "起床時間",
    hint: "覚醒 / 睡眠終了",
    inputType: "time",
    placeholder: "06:20",
  },
  {
    key: "sleepEfficiency",
    label: "睡眠効率",
    hint: "Efficiency",
    inputType: "text",
    placeholder: "例：87%",
  },
  {
    key: "sleepDebt",
    label: "睡眠負債",
    hint: "Sleep Debt / 負債",
    inputType: "text",
    placeholder: "例：-1時間20分",
  },
  {
    key: "circadianRhythm",
    label: "体内時計",
    hint: "Circadian / 位相",
    inputType: "text",
    placeholder: "例：やや遅れ",
  },
  {
    key: "sleepLatency",
    label: "入眠潜時",
    hint: "Latency / 入眠までにかかった時間",
    inputType: "text",
    placeholder: "例：12分",
  },
  {
    key: "awakenings",
    label: "覚醒時間",
    hint: "中途覚醒 / Awake",
    inputType: "text",
    placeholder: "例：42分 / 3回",
  },
  {
    key: "awakeningRate",
    label: "覚醒率",
    hint: "Awake % / 覚醒（割合）",
    inputType: "text",
    placeholder: "例：8%",
  },
  {
    key: "remSleep",
    label: "REM睡眠",
    hint: "レム / REM",
    inputType: "text",
    placeholder: "例：1時間28分",
  },
  {
    key: "remSleepRate",
    label: "レム睡眠率",
    hint: "REM %",
    inputType: "text",
    placeholder: "例：22%",
  },
  {
    key: "lightSleep",
    label: "浅い睡眠",
    hint: "Light",
    inputType: "text",
    placeholder: "例：3時間10分",
  },
  {
    key: "lightSleepRate",
    label: "浅い睡眠率",
    hint: "Light %",
    inputType: "text",
    placeholder: "例：55%",
  },
  {
    key: "deepSleep",
    label: "深い睡眠",
    hint: "Deep",
    inputType: "text",
    placeholder: "例：1時間05分",
  },
  {
    key: "deepSleepRate",
    label: "深い睡眠率",
    hint: "Deep %",
    inputType: "text",
    placeholder: "例：18%",
  },
  {
    key: "respiratoryRate",
    label: "呼吸速度",
    hint: "Respiratory / 回/分",
    inputType: "text",
    placeholder: "例：14回/分",
  },
  {
    key: "spo2",
    label: "平均SpO₂",
    hint: "血中酸素",
    inputType: "text",
    placeholder: "例：96%",
  },
  {
    key: "restingHeartRate",
    label: "安静時心拍数",
    hint: "RHR / Resting HR",
    inputType: "text",
    placeholder: "例：58 bpm",
  },
  {
    key: "hrv",
    label: "HRV",
    hint: "心拍変動 / RMSSD",
    inputType: "text",
    placeholder: "例：42 ms",
  },
  {
    key: "skinTemperature",
    label: "皮膚温度",
    hint: "Skin Temp",
    inputType: "text",
    placeholder: "例：+0.2℃",
  },
  {
    key: "stress",
    label: "ストレス",
    hint: "測定ストレス",
    inputType: "text",
    placeholder: "例：32 / 低め",
  },
];

export function emptyMetrics(): AnalysisMetrics {
  return {
    sleepScore: null,
    bedtime: "",
    wakeTime: "",
    sleepDuration: "",
    sleepEfficiency: "",
    awakenings: "",
    awakeningRate: "",
    remSleep: "",
    remSleepRate: "",
    lightSleep: "",
    lightSleepRate: "",
    deepSleep: "",
    deepSleepRate: "",
    sleepDebt: "",
    sleepLatency: "",
    circadianRhythm: "",
    respiratoryRate: "",
    spo2: "",
    restingHeartRate: "",
    hrv: "",
    skinTemperature: "",
    stress: "",
  };
}

export function isMetricPresent(
  metrics: AnalysisMetrics,
  key: MetricFieldKey,
): boolean {
  if (key === "sleepScore") {
    return typeof metrics.sleepScore === "number" && Number.isFinite(metrics.sleepScore);
  }
  return Boolean(asString(metrics[key]).trim());
}

export function metricDisplayValue(
  metrics: AnalysisMetrics,
  key: MetricFieldKey,
): string {
  if (key === "sleepScore") {
    return typeof metrics.sleepScore === "number" ? String(metrics.sleepScore) : "";
  }
  return asString(metrics[key]);
}

export function setMetricValue(
  metrics: AnalysisMetrics,
  key: MetricFieldKey,
  value: string,
): AnalysisMetrics {
  if (key === "sleepScore") {
    const trimmed = value.trim();
    if (!trimmed) return { ...metrics, sleepScore: null };
    const n = Number(trimmed);
    return {
      ...metrics,
      sleepScore: Number.isFinite(n) ? n : null,
    };
  }
  return { ...metrics, [key]: value };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/** 画像から取得できたキー一覧 */
export function collectedMetricKeys(metrics: AnalysisMetrics): MetricFieldKey[] {
  return SOXAI_METRIC_FIELDS.map((field) => field.key).filter((key) =>
    isMetricPresent(metrics, key),
  );
}
