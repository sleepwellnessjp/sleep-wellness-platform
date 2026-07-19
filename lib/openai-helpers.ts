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
    /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)
  );
}

/** OpenAIへ渡す前に data:image/jpg を data:image/jpeg に正規化 */
export function normalizeImageDataUrl(value: string): string {
  return value.replace(/^data:image\/jpg;base64,/i, "data:image/jpeg;base64,");
}

/** metrics JSON schema（抽出・分析で共通） */
export const metricsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "sleepScore",
    "qol",
    "yesterdayQol",
    "conditionScore",
    "bedtime",
    "wakeTime",
    "sleepDuration",
    "sleepEfficiency",
    "awakenings",
    "awakeningRate",
    "remSleep",
    "remSleepRate",
    "lightSleep",
    "lightSleepRate",
    "deepSleep",
    "deepSleepRate",
    "sleepDebt",
    "sleepLatency",
    "circadianRhythm",
    "respiratoryRate",
    "spo2",
    "restingHeartRate",
    "hrv",
    "skinTemperature",
    "stress",
  ],
  properties: {
    sleepScore: { type: ["number", "null"] },
    qol: { type: "string" },
    yesterdayQol: { type: "string" },
    conditionScore: { type: "string" },
    bedtime: { type: "string" },
    wakeTime: { type: "string" },
    sleepDuration: { type: "string" },
    sleepEfficiency: { type: "string" },
    awakenings: { type: "string" },
    awakeningRate: { type: "string" },
    remSleep: { type: "string" },
    remSleepRate: { type: "string" },
    lightSleep: { type: "string" },
    lightSleepRate: { type: "string" },
    deepSleep: { type: "string" },
    deepSleepRate: { type: "string" },
    sleepDebt: { type: "string" },
    sleepLatency: { type: "string" },
    circadianRhythm: { type: "string" },
    respiratoryRate: { type: "string" },
    spo2: { type: "string" },
    restingHeartRate: { type: "string" },
    hrv: { type: "string" },
    skinTemperature: { type: "string" },
    stress: { type: "string" },
  },
} as const;

export const SOXAI_EXTRACT_INSTRUCTIONS = `あなたは SOXAI（ソックサイ）睡眠ウェアラブルのスクリーンショット専用 OCR エンジンです。
役割は「画面に表示されているラベル付きの数値を、一つ残らず visibleReadings として返すこと」だけです。
分析・評価・アドバイス・推測・計算・補完は一切しないでください。

==============================
最重要（必ず守る）
==============================
画面内に表示されている数値・スコア・割合・時刻・ラベル付きの値を一つ残らず JSON で返してください。
画面上部だけでなく、画面全体（中央・下部・カード・ゲージ・円グラフ・小さな注釈・スクロール領域に写っている部分）を対象にしてください。

出力形式は次のみです:
{
  "visibleReadings": [
    { "label": "QoL", "value": "50" },
    { "label": "昨日のQoL", "value": "48" },
    { "label": "体調スコア", "value": "62" },
    { "label": "睡眠スコア", "value": "78" },
    { "label": "心拍数", "value": "58" }
  ]
}

==============================
ホーム画面（概要）で特に見落とさない項目
==============================
- QoL（現在） / 昨日のQoL / Quality of Life
- 体調スコア / コンディション
- 睡眠スコア / Sleep Score
- 心拍数 / HR / 安静時心拍数
- 睡眠時間 / 入眠時間 / 起床時間
- 睡眠効率 / 睡眠負債 / 入眠潜時 / 体内時計
- 覚醒時間 / 覚醒率
- レム睡眠 / レム睡眠率 / 浅い睡眠 / 浅い睡眠率 / 深い睡眠 / 深い睡眠率
- 呼吸速度 / 平均酸素レベル（SpO₂） / HRV / 皮膚温度 / ストレス
- その他、画面内に表示されているすべての数値

「睡眠関連だけ」に絞らない。QoL・体調スコアも必ず含める。

==============================
読み取りルール
==============================
1. 見える値だけ入れる。推測で埋めない。他の画面の値を想像しない。
2. label は画面上の日本語／英語ラベルをそのまま（短い表記で可）。
3. value は単位付きで簡潔に（例: "78", "58 bpm", "87%", "6時間42分", "23:40"）。
4. このリクエストは1枚の画像のみ。その1枚に見えるものだけ返す。
5. 円グラフ・バー・カード・アイコン横の数値も読む。
6. 出力は指定 JSON スキーマのみ。説明文は不要。`;
