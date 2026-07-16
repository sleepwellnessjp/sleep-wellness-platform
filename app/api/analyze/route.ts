import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";

function openaiErrorMessage(error: unknown): string {
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

type LifestyleData = {
  clientName?: string;
  measurementDate?: string;
  bedtime?: string;
  wakeTime?: string;
  exercise?: string;
  yoga?: string;
  yogaDone?: string;
  yogaDuration?: string;
  yogaTime?: string;
  yogaNotes?: string;
  pilates?: string;
  pilatesDone?: string;
  pilatesDuration?: string;
  pilatesTime?: string;
  pilatesNotes?: string;
  otherExerciseDone?: string;
  otherExerciseName?: string;
  otherExerciseDuration?: string;
  otherExerciseTime?: string;
  otherExerciseNotes?: string;
  bathing?: string;
  alcohol?: string;
  alcoholDrank?: string;
  alcoholType?: string;
  alcoholAmount?: string;
  alcoholEndTime?: string;
  alcoholNotes?: string;
  caffeine?: string;
  caffeineDone?: string;
  caffeineType?: string;
  caffeineAmount?: string;
  caffeineTime?: string;
  caffeineNotes?: string;
  stress?: string;
  meals?: string;
  breakfastEaten?: string;
  breakfastTime?: string;
  breakfastContent?: string;
  lunchEaten?: string;
  lunchTime?: string;
  lunchContent?: string;
  dinnerEaten?: string;
  dinnerTime?: string;
  dinnerContent?: string;
  work?: string;
  condition?: string;
  nasalCongestion?: string;
  notes?: string;
};

type AnalyzeRequestBody = {
  lifestyle?: LifestyleData;
  images?: unknown;
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "score",
    "scoreBreakdown",
    "metrics",
    "goodPoints",
    "improvements",
    "dataInsight",
    "lifestyleRelation",
    "tomorrowPlan",
    "caution",
    "disclaimer",
  ],
  properties: {
    summary: { type: "string" },
    score: { type: "number" },
    scoreBreakdown: {
      type: "object",
      additionalProperties: false,
      required: [
        "sleepDuration",
        "sleepEfficiency",
        "deepSleep",
        "hrv",
        "stress",
        "spo2",
        "recovery",
      ],
      properties: {
        sleepDuration: { type: "integer", enum: [1, 2, 3, 4, 5] },
        sleepEfficiency: { type: "integer", enum: [1, 2, 3, 4, 5] },
        deepSleep: { type: "integer", enum: [1, 2, 3, 4, 5] },
        hrv: { type: "integer", enum: [1, 2, 3, 4, 5] },
        stress: { type: "integer", enum: [1, 2, 3, 4, 5] },
        spo2: { type: "integer", enum: [1, 2, 3, 4, 5] },
        recovery: { type: "integer", enum: [1, 2, 3, 4, 5] },
      },
    },
    metrics: {
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
    },
    goodPoints: {
      type: "array",
      items: { type: "string" },
    },
    improvements: {
      type: "array",
      items: { type: "string" },
    },
    dataInsight: { type: "string" },
    lifestyleRelation: { type: "string" },
    tomorrowPlan: {
      type: "array",
      items: { type: "string" },
    },
    caution: { type: "string" },
    disclaimer: { type: "string" },
  },
} as const;

const SYSTEM_INSTRUCTIONS = `あなたは Sleep Wellness Institute Japan（SWIJ）創設者・若林貴久の睡眠分析エンジン
「Sleep Wellness Brain™ Version 1」です。
SOXAIなどのウェアラブル睡眠データ画像と、利用者の生活習慣情報をもとに、
SWIJ専用レポートを日本語で作成してください。
AI、ChatGPT、モデル名、エンジン名などの内部事情は文章に書かないでください。

==============================
Sleep Wellness Brain™ Version 1 — 必須ルール（厳守）
==============================

① 睡眠時間だけで評価しない
睡眠効率・深い睡眠・浅い睡眠・REM・HRV・ストレス・SpO₂・呼吸・体内時計・
皮膚温・入眠潜時・睡眠負債・生活習慣を総合評価する。
「〇時間だから良い／悪い」という単軸評価は禁止。

② まず良かった点から話す
summary（総合評価）の冒頭、および goodPoints を先に示す。課題から入らない。

③ 改善点は最大2件（improvements は必ず2件以内）
本人を責めず、「改善余地」「整える余地」と書く。

④ Tomorrow Plan は最大3件（tomorrowPlan は必ず3件以内）
1件目は「最優先」と分かる表現。今日から実行できる具体策のみ。

⑤ 医療診断はしない
病名・異常・疾患の断定、治療指示は禁止。睡眠ウェルネス支援として書く。

⑥ 「可能性があります」という表現を使う
要因や影響は断定せず、可能性として述べる。

⑦ 単日データで結論を出さない
数日〜2週間の推移を見るよう、summary または caution で必ず促す。

⑧ 「睡眠時間を増やしてください」だけで終わらない
効率・深い睡眠・入眠前の切り替え・呼吸・入浴・照明・飲酒終了時刻・夕食時間など、
現実的な改善策を提案する。

⑨ 入力内容に応じて提案を選ぶ（毎回同じ提案をしない）
候補：メラトニンヨガ™、呼吸法、入浴、照明、飲酒、鼻づまり、夕食時間、カフェイン、運動。
- 入力やデータに根拠がある項目だけ提案する
- メラトニンヨガ™を毎回機械的に勧めない
- 当てはまらない習慣は無理に触れない

⑩ 文章は簡潔で読みやすく
1文は短く。冗長な言い回し・同じ内容の繰り返しを避ける。重要文のみ **太字**。

==============================
画像からの数値・時刻の読み取り（最大限抽出）
==============================
画像に表示されている項目は可能な限りすべて抽出し、metrics に入れる。
手入力より画像を常に優先する。推測で数値を作らない。読めない項目は ""、sleepScore は null。

必ず探して抽出する項目（ラベル表記ゆれに対応）:
- sleepScore … 睡眠スコア / Sleep Score / 総合スコア（数値）
- bedtime … 入眠時間 / 就寝 / 睡眠開始
- wakeTime … 起床時間 / 覚醒 / 睡眠終了
- sleepDuration … 睡眠時間 / Total Sleep / 総睡眠
- sleepEfficiency … 睡眠効率 / Efficiency
- awakenings … 覚醒時間 / 中途覚醒 / Awake（時間または回数。単位付きで記載）
- remSleep … REM睡眠 / レム / REM
- lightSleep … 浅い睡眠 / Light / ライト
- deepSleep … 深い睡眠 / Deep / ディープ
- sleepDebt … 睡眠負債 / Sleep Debt / 負債
- sleepLatency … 入眠潜時 / Latency / 潜時
- circadianRhythm … 体内時計 / Circadian / クロノタイプ・位相の表示
- respiratoryRate … 呼吸数 / Respiratory / 呼吸（回/分など）
- spo2 … 平均SpO₂ / SpO2 / 血中酸素
- heartRate … 平均心拍数 / HR / RHR / 安静時心拍
- hrv … HRV / 心拍変動 / RMSSD など
- skinTemperature … 皮膚温度 / Skin Temp / 皮膚温
- stress … ストレス / Stress（測定値。日中/夜間が分かる場合は区別して記載）

読み取りルール:
- 単位付き・簡潔。時刻は HH:MM 優先
- 日付またぎ（例：23:40→翌6:20）も正しく解釈
- 複数画像は同日データを統合。矛盾時は summary / caution で不確実性を示す
- 「入眠／就寝／睡眠開始」→ bedtime、「起床／覚醒／睡眠終了」→ wakeTime
- 画像値が読めたら必ず metrics に入れ、分析の根拠とする（手入力より画像優先）
- 両方あり差異がある場合：画像採用＋ summary または caution に短く注記
- 画像から確認できない場合は推測せず metrics は ""
- 画像が読めず手入力のみ：metrics に手入力を入れてよい（補助情報である旨を必要なら注記）

【ストレス】
- 画像の測定ストレスを metrics.stress に優先して入れる
- 単一数値で心理を断定しない。心拍・HRV・効率・覚醒・生活習慣と総合評価
- 「主観的ストレス・気分」は本人申告。metrics.stress に入れず文章で分けて扱う

==============================
レポート構成（この順序・この役割で書く）
==============================
① summary（総合評価）
  2〜4文。良かった点→課題→背景（可能性）→推移の見方。簡潔に。

② goodPoints（今回良かった点）
  最大3件。なぜ良いかが分かる短い文。

③ improvements（改善点）
  最大2件。「改善余地」「整える余地」。

④ dataInsight（睡眠データ考察）
  3〜5文。metrics の数値に基づき、ステージバランス・効率・回復指標を考察。
  数値がある項目を具体的に触れる。読めない項目は触れない。

⑤ lifestyleRelation（生活習慣との関係）
  3〜5文。入力された生活習慣と睡眠データの関係を可能性として述べる。
  該当しない習慣は無理に書かない。

⑥ tomorrowPlan（Tomorrow Plan）
  最大3件。1件目は最優先。今日できる具体策（時間・回数・タイミング）。

- caution: 単日の限界を簡潔に。強い症状・呼吸苦・著しいSpO₂低下が疑われる場合のみ医療機関相談を穏やかに促す
- disclaimer: 睡眠ウェルネス支援であり医療診断・治療を代替しない旨を簡潔に
- scoreBreakdown: 各1〜5。未確認項目は控えめ推定。score と矛盾しないこと
- score: SWIJ 総合スコア 0〜100

==============================
入力連動の提案ガイド
==============================
- 飲酒あり／終了が遅い → 終了時刻の前倒しや量の調整
- 鼻づまりあり → 呼吸の通しやすさ・就寝姿勢・加湿
- 夕食が遅い → 夕食時間と入眠の間隔
- 入浴の記載 → 就寝前の体温低下を助ける入浴タイミング（必要時のみ）
- ストレス高め・HRV低め・入眠前の切り替え不足が疑われる場合のみメラトニンヨガ™
- 当てはまらない場合は短い呼吸法や休養を優先

【運動】ヨガ／ピラティス／その他を区別。実施時間と時刻を考慮。効果を断定しない。
【カフェイン】種類・量・摂取時刻。午後以降・就寝間隔を確認。責める表現は使わない。
【食事】朝昼夕の食べた／食べていないを区別。欠食だけで断定しない。
【飲酒】種類・量・終了時刻・就寝間隔。量不明は推測しない。

==============================
文章の口調（若林貴久）
==============================
- やさしく実践的。専門用語は短く意味を補う
- 「まずは」「今回のデータでは」「可能性があります」「推移を確認しましょう」を自然に使う
- 過剰に褒めず、問題を過度に深刻化しない。命令口調・責め口調は禁止
- 一般論の羅列は禁止。今回のデータと入力に紐づける
- 出力は指定の JSON スキーマのみ`;

function isDataUrl(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^data:image\/(jpeg|jpg|png);base64,/i.test(value)
  );
}

function validateBody(body: unknown): {
  ok: true;
  lifestyle: LifestyleData;
  images: string[];
} | {
  ok: false;
  message: string;
} {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "リクエスト形式が正しくありません。" };
  }

  const { lifestyle, images } = body as AnalyzeRequestBody;

  if (!lifestyle || typeof lifestyle !== "object" || Array.isArray(lifestyle)) {
    return { ok: false, message: "生活習慣データが不足しています。" };
  }

  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, message: "睡眠データ画像が不足しています。" };
  }

  if (!images.every(isDataUrl)) {
    return {
      ok: false,
      message: "画像は JPEG または PNG の data URL で送信してください。",
    };
  }

  return { ok: true, lifestyle, images };
}

function formatYesNone(
  value: string | undefined,
  yesLabel: string,
  noneLabel: string,
): string | undefined {
  if (value === "yes") return yesLabel;
  if (value === "none") return noneLabel;
  return value;
}

function formatCaffeineType(value: string | undefined): string | undefined {
  if (!value) return value;
  const labels: Record<string, string> = {
    coffee: "コーヒー",
    green_tea: "緑茶",
    black_tea: "紅茶",
    energy_drink: "エナジードリンク",
    other: "その他",
  };
  return labels[value] ?? value;
}

/** 画像から読めなかった入眠・起床は、手入力があれば補助値として埋める */
function applyLifestyleMetricFallbacks(
  analysis: unknown,
  lifestyle: LifestyleData,
): unknown {
  if (!analysis || typeof analysis !== "object") return analysis;

  const record = analysis as {
    metrics?: Record<string, unknown>;
  };
  const metrics =
    record.metrics && typeof record.metrics === "object"
      ? { ...record.metrics }
      : {};

  const bedtime =
    typeof metrics.bedtime === "string" ? metrics.bedtime.trim() : "";
  const wakeTime =
    typeof metrics.wakeTime === "string" ? metrics.wakeTime.trim() : "";
  const lifestyleBedtime = lifestyle.bedtime?.trim() ?? "";
  const lifestyleWakeTime = lifestyle.wakeTime?.trim() ?? "";

  if (!bedtime && lifestyleBedtime) {
    metrics.bedtime = lifestyleBedtime;
  }
  if (!wakeTime && lifestyleWakeTime) {
    metrics.wakeTime = lifestyleWakeTime;
  }

  return { ...record, metrics };
}

function formatLifestyle(lifestyle: LifestyleData): string {
  const alcoholDrankLabel =
    lifestyle.alcoholDrank === "none"
      ? "なし"
      : lifestyle.alcoholDrank === "yes"
        ? "あり"
        : lifestyle.alcoholDrank;

  const rows: Array<[string, string | undefined]> = [
    ["対象者名", lifestyle.clientName],
    ["測定日", lifestyle.measurementDate],
    [
      "就寝・入眠時間（任意・手入力の補助情報。画像から読めた場合は画像優先。読めない場合は確認できない扱い）",
      lifestyle.bedtime,
    ],
    [
      "起床時間（任意・手入力の補助情報。画像から読めた場合は画像優先。読めない場合は確認できない扱い）",
      lifestyle.wakeTime,
    ],
    ["ヨガ（実施したか）", formatYesNone(lifestyle.yogaDone, "実施した", "していない")],
    ["ヨガ実施時間（分）", lifestyle.yogaDuration],
    ["ヨガ実施時刻・時間帯", lifestyle.yogaTime],
    ["ヨガ補足", lifestyle.yogaNotes],
    ["ヨガまとめ", lifestyle.yoga],
    [
      "ピラティス（実施したか）",
      formatYesNone(lifestyle.pilatesDone, "実施した", "していない"),
    ],
    ["ピラティス実施時間（分）", lifestyle.pilatesDuration],
    ["ピラティス実施時刻・時間帯", lifestyle.pilatesTime],
    ["ピラティス補足", lifestyle.pilatesNotes],
    ["ピラティスまとめ", lifestyle.pilates],
    [
      "その他の運動（したか）",
      formatYesNone(lifestyle.otherExerciseDone, "した", "していない"),
    ],
    ["その他の運動の種類", lifestyle.otherExerciseName],
    ["その他の運動の実施時間（分）", lifestyle.otherExerciseDuration],
    ["その他の運動の実施時刻・時間帯", lifestyle.otherExerciseTime],
    ["その他の運動の補足", lifestyle.otherExerciseNotes],
    ["その他の運動まとめ", lifestyle.exercise],
    ["入浴", lifestyle.bathing],
    ["飲酒したか", alcoholDrankLabel || lifestyle.alcohol],
    ["飲酒の種類", lifestyle.alcoholType],
    ["飲酒量", lifestyle.alcoholAmount],
    ["飲酒終了時刻", lifestyle.alcoholEndTime],
    ["飲酒の補足（複数種類など）", lifestyle.alcoholNotes],
    ["飲酒まとめ", lifestyle.alcohol],
    [
      "カフェイン（摂取したか）",
      formatYesNone(lifestyle.caffeineDone, "摂取した", "していない"),
    ],
    ["カフェインの種類", formatCaffeineType(lifestyle.caffeineType)],
    ["カフェインの量", lifestyle.caffeineAmount],
    ["カフェインの摂取時刻", lifestyle.caffeineTime],
    ["カフェインの補足", lifestyle.caffeineNotes],
    ["カフェインまとめ", lifestyle.caffeine],
    [
      "主観的ストレス・気分（任意の本人申告。測定ストレスとは別扱い）",
      lifestyle.stress,
    ],
    [
      "朝食（食べたか）",
      formatYesNone(lifestyle.breakfastEaten, "食べた", "食べていない"),
    ],
    ["朝食時間", lifestyle.breakfastTime],
    ["朝食内容", lifestyle.breakfastContent],
    [
      "昼食（食べたか）",
      formatYesNone(lifestyle.lunchEaten, "食べた", "食べていない"),
    ],
    ["昼食時間", lifestyle.lunchTime],
    ["昼食内容", lifestyle.lunchContent],
    [
      "夕食（食べたか）",
      formatYesNone(lifestyle.dinnerEaten, "食べた", "食べていない"),
    ],
    ["夕食時間", lifestyle.dinnerTime],
    ["夕食内容", lifestyle.dinnerContent],
    ["食事まとめ", lifestyle.meals],
    ["仕事", lifestyle.work],
    ["体調", lifestyle.condition],
    ["鼻づまり", lifestyle.nasalCongestion],
    ["自由記述", lifestyle.notes],
  ];

  return rows
    .map(([label, value]) => `${label}: ${value?.trim() ? value.trim() : "未入力"}`)
    .join("\n");
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "AI分析の設定が完了していません。",
        errorType: "Validation Error",
        details: isDev ? "OPENAI_API_KEY is missing." : undefined,
      },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch (parseError) {
    return NextResponse.json(
      {
        error: "リクエスト形式が正しくありません。",
        errorType: "JSON Parse Error",
        details: isDev
          ? parseError instanceof Error
            ? parseError.message
            : String(parseError)
          : undefined,
      },
      { status: 400 },
    );
  }

  const validated = validateBody(body);
  if (!validated.ok) {
    return NextResponse.json(
      {
        error: validated.message,
        errorType: "Validation Error",
        details: isDev ? validated.message : undefined,
      },
      { status: 400 },
    );
  }

  const { lifestyle, images } = validated;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 280_000,
      maxRetries: 1,
    });

    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `以下の生活習慣データと睡眠データ画像をもとに、Sleep Wellness Brain™ Version 1 でSWIJレポートを作成してください。一般論ではなく、今回のデータと入力に紐づいた分析にしてください。文章は簡潔で読みやすく。

【画像解析 — 最大限抽出】
画像に存在する数値・時刻はすべて読み取り、手入力より優先する。推測禁止。読めない項目は ""、sleepScore は null。
抽出対象: 睡眠スコア / 睡眠時間 / 入眠時間 / 起床時間 / 睡眠効率 / 覚醒時間 / REM睡眠 / 浅い睡眠 / 深い睡眠 / 睡眠負債 / 入眠潜時 / 体内時計 / 呼吸数 / 平均SpO₂ / 平均心拍数 / HRV / 皮膚温度 / ストレス
- 「入眠／就寝／睡眠開始」→ metrics.bedtime、「起床／覚醒／睡眠終了」→ metrics.wakeTime
- 日付またぎも正しく解釈。複数画像は同日統合、矛盾時は不確実性を示す

【レポート構成（この順で書く）】
① summary＝総合評価（2〜4文。良かった点→課題→背景→推移）
② goodPoints＝今回良かった点（≤3）
③ improvements＝改善点（≤2）
④ dataInsight＝睡眠データ考察（3〜5文。metricsに基づく）
⑤ lifestyleRelation＝生活習慣との関係（3〜5文。可能性表現）
⑥ tomorrowPlan＝Tomorrow Plan（≤3。1件目は最優先）

【Brain™ V1 必須】
① 睡眠時間だけで評価しない
② まず良かった点から
③ improvements ≤2
④ tomorrowPlan ≤3、1件目は最優先
⑤ 医療診断しない
⑥ 「可能性があります」を使う
⑦ 単日で結論せず推移確認を促す
⑧ 「睡眠時間を増やして」だけで終わらない
⑨ 入力に応じて提案を変える
⑩ 文章は簡潔。重要文のみ **太字**

【生活習慣データ】
${formatLifestyle(lifestyle)}`,
            },
            ...images.map((imageUrl) => ({
              type: "input_image" as const,
              image_url: imageUrl,
              detail: "high" as const,
            })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "swij_sleep_wellness_analysis",
          strict: true,
          schema: analysisSchema,
        },
      },
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      return NextResponse.json(
        {
          error: "分析結果の取得に失敗しました。",
          errorType: "OpenAI Error",
          details: isDev
            ? "OpenAI response.output_text was empty."
            : undefined,
        },
        { status: 500 },
      );
    }

    let analysis: unknown;
    try {
      analysis = JSON.parse(outputText) as unknown;
    } catch (parseError) {
      console.error("Failed to parse OpenAI analysis JSON", parseError);
      return NextResponse.json(
        {
          error: "分析結果の解析に失敗しました。",
          errorType: "JSON Parse Error",
          details: isDev
            ? parseError instanceof Error
              ? parseError.message
              : String(parseError)
            : undefined,
        },
        { status: 500 },
      );
    }

    return NextResponse.json(
      applyLifestyleMetricFallbacks(analysis, lifestyle),
    );
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    const details = openaiErrorMessage(error);
    return NextResponse.json(
      {
        error: "AI分析に失敗しました。しばらくしてから再度お試しください。",
        errorType: "OpenAI Error",
        details: isDev ? details : undefined,
      },
      { status: 500 },
    );
  }
}
