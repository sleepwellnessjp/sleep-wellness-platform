import OpenAI from "openai";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LifestyleData = {
  clientName?: string;
  measurementDate?: string;
  bedtime?: string;
  wakeTime?: string;
  exercise?: string;
  yoga?: string;
  bathing?: string;
  alcohol?: string;
  caffeine?: string;
  stress?: string;
  meals?: string;
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
    "metrics",
    "goodPoints",
    "improvements",
    "possibleFactors",
    "actions",
    "yoga",
    "caution",
    "disclaimer",
  ],
  properties: {
    summary: { type: "string" },
    score: { type: "number" },
    metrics: {
      type: "object",
      additionalProperties: false,
      required: [
        "sleepScore",
        "sleepDuration",
        "sleepEfficiency",
        "deepSleep",
        "awakenings",
        "heartRate",
        "hrv",
        "stress",
        "spo2",
        "skinTemperature",
      ],
      properties: {
        sleepScore: { type: ["number", "null"] },
        sleepDuration: { type: "string" },
        sleepEfficiency: { type: "string" },
        deepSleep: { type: "string" },
        awakenings: { type: "string" },
        heartRate: { type: "string" },
        hrv: { type: "string" },
        stress: { type: "string" },
        spo2: { type: "string" },
        skinTemperature: { type: "string" },
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
    possibleFactors: {
      type: "array",
      items: { type: "string" },
    },
    actions: {
      type: "array",
      items: { type: "string" },
    },
    yoga: { type: "string" },
    caution: { type: "string" },
    disclaimer: { type: "string" },
  },
} as const;

const SYSTEM_INSTRUCTIONS = `あなたは Sleep Wellness Institute Japan（SWIJ）の睡眠ウェルネス分析アシスタントです。
SOXAIなどのウェアラブル睡眠データ画像と、利用者の生活習慣情報をもとに、SWIJ独自の睡眠ウェルネス分析を日本語で作成してください。

【厳守ルール】
- 医療診断・治療・病気の断定はしない
- 不安を煽る表現は使わない
- 一晩のデータだけで断定しない（傾向や可能性として述べる）
- 画像から読み取れない数値は推測しない。確認できない項目は空文字 ""、sleepScore は null にする
- 仕事や生活上の制約を踏まえ、実行可能な現実的な提案にする
- 「とにかく睡眠時間を増やす」だけの単純な提案にしない
- メラトニンヨガ™、呼吸、生活リズム、就寝前ルーティンなど、SWIJらしい実践を含める
- score は SWIJ 睡眠ウェルネス総合スコア（0〜100の整数）として、画像と生活習慣から総合的に評価する
- metrics の各文字列は、画像で確認できた値のみ記載する（単位付きで簡潔に）
- goodPoints / improvements / possibleFactors / actions は各2〜4件程度
- caution には過度な一般化を避ける注意点を短く書く
- disclaimer には「本分析は睡眠ウェルネス支援を目的としており、医療診断ではありません」旨を必ず含める
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

function formatLifestyle(lifestyle: LifestyleData): string {
  const rows: Array<[string, string | undefined]> = [
    ["対象者名", lifestyle.clientName],
    ["測定日", lifestyle.measurementDate],
    ["就寝時間", lifestyle.bedtime],
    ["起床時間", lifestyle.wakeTime],
    ["運動", lifestyle.exercise],
    ["ヨガ", lifestyle.yoga],
    ["入浴", lifestyle.bathing],
    ["飲酒", lifestyle.alcohol],
    ["カフェイン", lifestyle.caffeine],
    ["ストレス", lifestyle.stress],
    ["食事", lifestyle.meals],
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
      { error: "AI分析の設定が完了していません。" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "リクエスト形式が正しくありません。" },
      { status: 400 },
    );
  }

  const validated = validateBody(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.message }, { status: 400 });
  }

  const { lifestyle, images } = validated;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `以下の生活習慣データと睡眠データ画像をもとに、SWIJ睡眠ウェルネス分析を作成してください。\n\n【生活習慣データ】\n${formatLifestyle(lifestyle)}`,
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
        { error: "分析結果の取得に失敗しました。" },
        { status: 500 },
      );
    }

    let analysis: unknown;
    try {
      analysis = JSON.parse(outputText) as unknown;
    } catch {
      console.error("Failed to parse OpenAI analysis JSON");
      return NextResponse.json(
        { error: "分析結果の解析に失敗しました。" },
        { status: 500 },
      );
    }

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    return NextResponse.json(
      { error: "AI分析に失敗しました。しばらくしてから再度お試しください。" },
      { status: 500 },
    );
  }
}
