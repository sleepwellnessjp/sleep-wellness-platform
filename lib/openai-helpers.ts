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

/** グラフ OCR スキーマ（extract 専用） */
export const graphReadingItemSchema = {
  type: "object",
  additionalProperties: false,
  required: ["panel", "points", "segments", "annotations"],
  properties: {
    panel: { type: "string" },
    points: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["x", "y", "series"],
        properties: {
          x: { type: "string" },
          y: { type: "number" },
          series: { type: "string" },
        },
      },
    },
    segments: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["stage", "startTime", "endTime", "ratio"],
        properties: {
          stage: { type: "string" },
          startTime: { type: "string" },
          endTime: { type: "string" },
          ratio: { type: "number" },
        },
      },
    },
    annotations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
        },
      },
    },
  },
} as const;

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
大きな数字だけでなく、カード右上・円グラフ旁・バー下の小さな数値もすべて拾う。

出力形式は次のみです:
{
  "visibleReadings": [
    { "label": "QoL", "value": "50" },
    { "label": "昨日のスコア", "value": "48" },
    { "label": "体調", "value": "62" },
    { "label": "睡眠", "value": "78" },
    { "label": "心拍数", "value": "58" }
  ]
}

==============================
SOXAIホーム画面で特に見落とさない項目
==============================
ホームではラベルが短いことが多い:
- 「QoL」→ 現在のQoL
- 「昨日のスコア」または「昨日のQoL」
- 「睡眠」→ 睡眠スコア（大きな数字）
- 「体調」→ 体調スコア
- 「心拍数」→ 安静時心拍数の代表値
これらは必ず label を画面表記どおりに返す（「睡眠」は「睡眠スコア」に勝手に書き換えない）。

==============================
睡眠詳細・ステージ・バイタル画面
==============================
- 睡眠時間 / 全就床時間 / 入眠時間 / 起床時間 / 入眠潜時
- 睡眠効率 / 睡眠負債 / 体内時計
- 覚醒時間 / 覚醒率（%と時間は別エントリ）
- レム睡眠時間 / レム睡眠率（%と時間は別エントリ）
- 浅い睡眠時間 / 浅い睡眠率
- 深い睡眠時間 / 深い睡眠率
- 呼吸速度 / 平均酸素レベル（SpO₂）
- 安静時心拍数（平均・最小・最大がある場合はすべて別エントリ）
- 心拍変動 / HRV（平均・最小・最大がある場合はすべて別エントリ）
- 皮膚温度 / ストレス
- その他、画面内のすべての数値

「睡眠関連だけ」に絞らない。QoL・体調スコアも必ず含める。

==============================
読み取りルール
==============================
1. 見える値だけ入れる。推測で埋めない。他の画面の値は想像しない。
2. label は画面上の日本語／英語ラベルをそのまま（短い表記で可）。平均・最小・最大はラベルに含める。
3. value は単位付きで簡潔に（例: "78", "58 bpm", "87%", "6時間42分", "23:40", "0:49"）。
4. このリクエストは1枚の画像のみ。その1枚に見えるものだけ返す。
5. 円グラフ・バー・カード・アイコン横の数値も読む。%と時間の両方があれば両方返す。
6. 同じラベルが複数ある場合も、見える値はすべて返す（後段で統合する）。
7. 出力は指定 JSON スキーマのみ。説明文は不要。

==============================
グラフ読み取り（graphReadings — 必須で試みる）
==============================
画面に折れ線・棒・hypnogram・タイムライン・ゲージ付きグラフがあれば、
数値ラベル（visibleReadings）に加え graphReadings も返してください。

panel 値（いずれか1つ）:
- stages … 睡眠ステージ hypnogram（REM/浅い/深い/覚醒の帯）
- stage-detail … 睡眠ステージ詳細（効率・覚醒の推移）
- stress … ストレスモニター
- circadian … 体内時計
- respiration … 睡眠時呼吸（呼吸速度・SpO₂）
- rhr … 安静時心拍数
- hrv … 心拍変動
- skin-temp … 皮膚温度

graphReadings の各要素:
- points: X軸の目盛り（時刻 HH:MM）と Y軸数値。折れ線は主要な折れ点を8〜24点。
  series に系列名（REM/浅い/深い/覚醒/平均 等）を入れる。
- segments: hypnogram 用。stage は awake|rem|light|deep。
  startTime/endTime は画面の時刻。ratio はその区間の幅（0–100、合計100前後）。
- annotations: グラフ上の「平均」「最小」「最大」「現在」等の注釈。

グラフ読み取りルール:
1. 目盛り・凡例・軸ラベルを手がかりに、見える点だけ返す。推測で補完しない。
2. グラフが無い画面では graphReadings は空配列。
3. 同じ画面に数値カードとグラフが両方あれば、visibleReadings と graphReadings の両方に入れる。
4. 睡眠ステージ画面では segments を最優先。折れ線があれば points も返す。
5. 安静時心拍・HRV・皮膚温・ストレスは夜間推移の折れ線を points に。
6. 呼吸画面では呼吸速度と SpO₂ を series で区別して points に。

出力 JSON 形式:
{
  "visibleReadings": [ ... ],
  "graphReadings": [
    {
      "panel": "stages",
      "points": [],
      "segments": [
        { "stage": "light", "startTime": "23:45", "endTime": "00:30", "ratio": 15 }
      ],
      "annotations": []
    }
  ]
}`;
