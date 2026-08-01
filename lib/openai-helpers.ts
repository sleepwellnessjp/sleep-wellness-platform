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
    "nonRemSleep",
    "nonRemSleepRate",
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
    "hrvMax",
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
    nonRemSleep: { type: "string" },
    nonRemSleepRate: { type: "string" },
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
    hrvMax: { type: "string" },
    skinTemperature: { type: "string" },
    stress: { type: "string" },
  },
} as const;

export const SOXAI_EXTRACT_INSTRUCTIONS = `あなたは SOXAI（ソックサイ）睡眠ウェアラブルのスクリーンショット専用 OCR エンジンです。
役割は「画面種別の判定」と「切り出し領域内のラベル付き数値を返すこと」だけです。
分析・評価・アドバイス・推測・計算・補完は一切しないでください。

※入力は画面全体ではなく、SOXAI固定レイアウトに基づく切り出し（ROI）のことが多い。
  切り出しに見えない値は絶対に作らない。数字取得率を最優先する。

==============================
最重要（必ずこの順で実行）
==============================
1. まず screenType を判定する（下記のいずれか1つ）。プロンプトで固定されている場合はそれに従う。
2. 画面種別に応じた「取得対象」だけを重点的に読む（他画面の値は想像しない）。
3. 切り出し内の数値を visibleReadings に返す。
4. 見えない値は作らない。折れ線だけの領域で明示数値が無ければ平均値を捏造しない。

screenType の値:
- home … ホーム（QoL / 昨日のスコア / 睡眠 / 体調 / 心拍数）
  ※睡眠スコアの正はホーム。統合時にホーム／睡眠概要以外では上書きしない
- sleep_overview … 睡眠概要（睡眠スコア中心）。ホームが無いときのみ睡眠スコアの正
- sleep_detail … 睡眠詳細（時間・効率・負債・潜時・入眠・起床）
  ※入眠・起床の正の一つ。睡眠スコアはここから採用しない
- sleep_stages … 睡眠ステージ（覚醒/レム/浅い/深い・SpO₂・呼吸速度。ノンレム見出しがあればそれも）
  ※端点時刻を入眠・起床にしない。睡眠スコアも採らない。ノンレム見出しが無いときは深い睡眠のみ（浅いと合算しない）
- bed_wake … 入眠／起床時刻が主。入眠・起床の最優先画面
- circadian … 体内時計（入眠・起床のフォールバックには使わない想定）
- stress … ストレス
- skin_temp … 皮膚温度
- respiration … 睡眠時呼吸
- rhr … 安静時心拍
- hrv … HRV（平均）
- hrvMax … HRV（最大・見える場合）
- other … その他

【統合時の画面ロック（Visionは1枚のみだが判定を正確に）】
- sleepScore → home > sleep_overview のみ（sleep_detail / stages 等では返さない）
- bedtime / wakeTime → bed_wake > sleep_detail のみ（stages 端点・circadian では返さない）

==============================
画面種別ごと取得項目（固定）
==============================
- home → QoL / 昨日のスコア / 睡眠（スコア） / 体調 / 心拍数。睡眠時間があれば必ず返す
- sleep_overview → 睡眠スコア / 睡眠時間（ホームが無いときの睡眠スコア正）
- sleep_detail → 睡眠時間 / 入眠時間 / 起床時間 / 睡眠効率 / 睡眠負債 / 入眠潜時 / 体内時計
  ※睡眠スコアは返さない（ホーム／概要を正とする）
- bed_wake → 入眠時間 / 起床時間 / 入眠潜時
- sleep_stages → 覚醒時間 / 覚醒率 / レム / 浅い / 深い（時間と%は別）/ ノンレム見出しがあればその時間と% / SpO₂ / 呼吸速度
  ※各行は「ラベル直後の%」が率。右端の比較矢印隣は昨日差（率にしない）
  ※深い睡眠率は「深い睡眠」行の%のみ。浅い率と合算・時間から計算しない
  ※睡眠時間をノンレムにしない。ノンレム見出しが無い画面では浅い・深いを返す（統合時は深い＝表示上のノンレム）
  ※入眠・起床・睡眠スコアは返さない
  ※「呼吸速度」カードがあれば rpm / 回/分 を必ず返す（心拍数・SpO₂で代用しない）
- circadian → 体内時計（入眠・起床は返さない）
- stress → ストレス / 平均ストレス / ストレスレベル
- skin_temp → 皮膚温度 / 皮膚温 / 平均 / 偏差（±℃）
- respiration → 呼吸速度 / 平均酸素レベル / 同居の安静時心拍数（平均）
- rhr → 安静時心拍数（平均を優先。最小・最大は別ラベル）
- hrv → 平均HRV / 心拍変動の平均（ms）と最大。同一画面に「安静時心拍数」「呼吸速度」があれば返す（安静時をHRVにしない）

==============================
【最優先・見逃し禁止】入眠・起床・皮膚温度・ストレス
==============================
これらは SOXAI 画面に実際に表示されることが多い。必ず探すこと。
必ず「見出しラベル」と「値」をペアで visibleReadings に入れること（数値だけ返さない）。

【入眠時間】
- ラベル例: 入眠 / 入眠時間 / 入眠時刻 / 睡眠開始 / 就寝 / 就寝時間 /
  Sleep onset / Fell asleep / Bedtime / Asleep at / Sleep start / 開始
- 値は HH:mm または 23時40分（例 23:40）。午前0時跨ぎもそのまま。
- 「入眠潜時」「就床」「全就床時間」「就寝予定」と混同しない。
- sleep_detail / bed_wake 画面の値を正とする。ステージ画面の端点時刻は入眠にしない。
- 「入眠 23:40 / 起床 6:20」のように1行に両方ある場合は両方返す。

【起床時間】
- ラベル例: 起床 / 起床時間 / 起床時刻 / 睡眠終了 / Got up / Wake time / Rise / 終了
- 値は HH:mm または 6時20分（例 06:20）。
- 「覚醒時間」「中途覚醒」「覚醒率」と混同しない。
- sleep_detail / bed_wake 画面の値を正とする。

【皮膚温度】
- ラベル例: 皮膚温度 / 皮膚温 / 体表温 / Skin Temp / 体温偏差 / 温度偏差 /
  平均皮膚温 / Baseline deviation / 平均 / 偏差 / 現在
- 絶対値（例 36.2℃）と差分（例 +0.3℃ / -0.2℃ / +0.2）の両方。単位なしの ±0.x も返す。
- skin_temp 画面ではカード・注釈・「平均」の数値を必ず返す。
- 明示数値が無ければ捏造しない。

【ストレス】
- ラベル例: ストレス / 平均ストレス / ストレスレベル / ストレス度 / Stress /
  Stress level / 平均 / 現在 / レベル
- 平均値・単一値・レベル表記を別エントリで返す。
- stress 画面では平均・現在値の明示数値を必ず返す。無い平均は捏造しない。
- 時系列は graphReadings（panel: stress）の points に入れる。

==============================
読み取りルール
==============================
1. 見える値だけ。推測禁止。他画像の値は想像しない。このリクエストは1枚のみ。
2. label は画面表記どおり。平均・最小・最大はラベルに含める。
3. value は単位付きで簡潔（"78", "58 bpm", "87%", "1時間15分", "23:40", "+0.2℃"）。画面に無い数値例を書かない。
4. %と時間が両方あれば両方返す。時間は「1:15」でも「1時間15分」でもよいが、割合には%を付ける。
5. 数値だけ返さない。必ず見出しラベルとペアにする（項目名と数値の取り違え防止）。
6. 同じラベル＋同じ値が二重に見える場合は1回だけ返す（重複禁止）。
7. 入眠潜時（分）を入眠時間（時刻）にしない。覚醒時間を起床時間にしない。
8. 出力は指定 JSON スキーマのみ。

出力形式:
{
  "screenType": "skin_temp",
  "visibleReadings": [
    { "label": "皮膚温度", "value": "+0.2℃" },
    { "label": "平均", "value": "+0.2" }
  ],
  "graphReadings": []
}

==============================
グラフ読み取り（graphReadings）
==============================
折れ線・hypnogram・タイムラインがあれば graphReadings も返す。

panel:
- stages / stage-detail / stress / circadian / respiration / rhr / hrv / skin-temp

- points: 時刻(x)と数値(y)。系列名は series。明示できる点だけ。
- segments: hypnogram（awake|rem|light|deep + startTime/endTime）。
- annotations: 「平均」「最小」「最大」「現在」など画面上の注釈のみ。無いものは作らない。

グラフが無ければ graphReadings は []。`;
