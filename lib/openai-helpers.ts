export function openaiErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") {
    return error instanceof Error ? error.message : String(error);
  }

  const record = error as {
    message?: unknown;
    status?: unknown;
    code?: unknown;
    type?: unknown;
    error?: { message?: unknown; code?: unknown; type?: unknown };
  };

  const parts: string[] = [];
  if (typeof record.status === "number") {
    parts.push(`HTTP ${record.status}`);
  }
  if (typeof record.message === "string" && record.message.trim()) {
    parts.push(record.message.trim());
  }
  const nested = record.error;
  if (nested && typeof nested === "object") {
    if (typeof nested.message === "string" && nested.message.trim()) {
      parts.push(nested.message.trim());
    }
    if (typeof nested.code === "string") parts.push(`code=${nested.code}`);
    if (typeof nested.type === "string") parts.push(`type=${nested.type}`);
  } else {
    if (typeof record.code === "string") parts.push(`code=${record.code}`);
    if (typeof record.type === "string") parts.push(`type=${record.type}`);
  }

  return parts.length > 0 ? parts.join(" | ") : "Unknown OpenAI error";
}

export function isImageDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(jpeg|jpg|png);base64,/i.test(value)
  );
}

/** metrics JSON schema（抽出・分析で共通） */
export const metricsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sleepScore",
    "bedtime",
    "wakeTime",
    "sleepDuration",
    "sleepEfficiency",
    "awakenings",
    "remSleep",
    "lightSleep",
    "deepSleep",
    "sleepDebt",
    "sleepLatency",
    "circadianRhythm",
    "respiratoryRate",
    "spo2",
    "heartRate",
    "hrv",
    "skinTemperature",
    "stress",
  ],
  properties: {
    sleepScore: { type: ["number", "null"] },
    bedtime: { type: "string" },
    wakeTime: { type: "string" },
    sleepDuration: { type: "string" },
    sleepEfficiency: { type: "string" },
    awakenings: { type: "string" },
    remSleep: { type: "string" },
    lightSleep: { type: "string" },
    deepSleep: { type: "string" },
    sleepDebt: { type: "string" },
    sleepLatency: { type: "string" },
    circadianRhythm: { type: "string" },
    respiratoryRate: { type: "string" },
    spo2: { type: "string" },
    heartRate: { type: "string" },
    hrv: { type: "string" },
    skinTemperature: { type: "string" },
    stress: { type: "string" },
  },
} as const;

export const SOXAI_EXTRACT_INSTRUCTIONS = `あなたは SOXAI（ソックサイ）睡眠ウェアラブルのスクリーンショット専用 OCR / データ抽出エンジンです。
画像に表示されている数値・時刻・ラベルを正確に読み取り、指定の JSON（metrics）のみを返してください。
分析・評価・アドバイス・推測は一切しないでください。

==============================
抽出対象（すべて探す。表記ゆれに対応）
==============================
- sleepScore … 睡眠スコア / Sleep Score / 総合スコア / Score（数値のみ）
- bedtime … 入眠時間 / 就寝 / 睡眠開始 / Sleep onset / Fell asleep
- wakeTime … 起床時間 / 覚醒 / 睡眠終了 / Wake / Got up
- sleepDuration … 睡眠時間 / Total Sleep / 総睡眠 / 実際の睡眠
- sleepEfficiency … 睡眠効率 / Efficiency / Sleep efficiency（%付き可）
- awakenings … 覚醒時間 / 中途覚醒 / Awake / 覚醒（時間または回数。単位付き）
- remSleep … REM睡眠 / レム / REM
- lightSleep … 浅い睡眠 / Light / ライト
- deepSleep … 深い睡眠 / Deep / ディープ
- sleepDebt … 睡眠負債 / Sleep Debt / 負債
- sleepLatency … 入眠潜時 / Latency / 潜時 / 入眠までにかかった時間
- circadianRhythm … 体内時計 / Circadian / クロノタイプ / 位相の表示
- respiratoryRate … 呼吸数 / Respiratory / 呼吸（回/分など）
- spo2 … 平均SpO₂ / SpO2 / SpO₂ / 血中酸素 / 酸素飽和度
- heartRate … 平均心拍数 / 平均心拍 / HR / RHR / 安静時心拍
- hrv … HRV / 心拍変動 / RMSSD / SDNN など
- skinTemperature … 皮膚温度 / Skin Temp / 皮膚温 / 体温偏差
- stress … ストレス / Stress（測定値。日中/夜間が分かる場合は区別して記載）

==============================
読み取りルール（厳守）
==============================
1. 画像に見える値だけ入れる。推測・補完・計算で埋めない。
2. 読めない／無い項目は ""、sleepScore は null。
3. 単位付き・簡潔。時刻は HH:MM 優先（例：23:40、6:20）。
4. 日付またぎ（23:40→翌6:20）も正しく解釈し、入眠＝bedtime・起床＝wakeTime。
5. 複数画像は同日の SOXAI 画面として統合。同じ項目が複数ある場合は最も明瞭な値を採用。
6. 「入眠／就寝／睡眠開始」→ bedtime、「起床／覚醒／睡眠終了」→ wakeTime。混同禁止。
7. 睡眠ステージ（REM / 浅い / 深い / 覚醒）の時間・割合が円グラフやバーにあれば読み取る。
8. 日本語 UI・英語 UI の両方に対応する。
9. 出力は指定 JSON スキーマのみ。説明文は不要。`;
