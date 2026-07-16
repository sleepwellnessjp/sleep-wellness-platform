import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  metricsJsonSchema,
  openaiErrorMessage,
  SOXAI_EXTRACT_INSTRUCTIONS,
} from "@/lib/openai-helpers";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";

const extractSchema = {
  type: "object",
  additionalProperties: false,
  required: ["metrics"],
  properties: {
    metrics: metricsJsonSchema,
  },
} as const;

type ExtractRequestBody = {
  images?: unknown;
};

function validateBody(body: unknown):
  | { ok: true; images: string[] }
  | { ok: false; message: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, message: "リクエスト形式が正しくありません。" };
  }

  const { images } = body as ExtractRequestBody;

  if (!Array.isArray(images) || images.length === 0) {
    return { ok: false, message: "睡眠データ画像が不足しています。" };
  }

  if (!images.every(isImageDataUrl)) {
    return {
      ok: false,
      message: "画像は JPEG または PNG の data URL で送信してください。",
    };
  }

  if (images.length > 8) {
    return { ok: false, message: "画像は最大8枚までです。" };
  }

  return { ok: true, images };
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

  const { images } = validated;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 280_000,
      maxRetries: 1,
    });

    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions: SOXAI_EXTRACT_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `以下の SOXAI スクリーンショットから、睡眠関連の数値・時刻をすべて抽出してください。

抽出対象: 睡眠スコア / 睡眠時間 / 入眠時間 / 起床時間 / 睡眠効率 / 睡眠負債 / 体内時計 / 入眠潜時 / 覚醒時間 / 覚醒率 / レム睡眠率 / 浅い睡眠率 / 深い睡眠率 / REM睡眠 / 浅い睡眠 / 深い睡眠 / 呼吸速度 / 平均SpO₂ / 安静時心拍数 / HRV / 皮膚温度 / ストレス

推測禁止。画像に無い項目は ""、sleepScore は null。複数画像は同日データとして統合。`,
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
          name: "soxai_metrics_extract",
          strict: true,
          schema: extractSchema,
        },
      },
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      return NextResponse.json(
        {
          error: "画像解析結果の取得に失敗しました。",
          errorType: "OpenAI Error",
          details: isDev
            ? "OpenAI response.output_text was empty."
            : undefined,
        },
        { status: 500 },
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(outputText) as unknown;
    } catch (parseError) {
      console.error("Failed to parse OpenAI extract JSON", parseError);
      return NextResponse.json(
        {
          error: "画像解析結果の解析に失敗しました。",
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

    const metrics =
      parsed &&
      typeof parsed === "object" &&
      "metrics" in parsed &&
      (parsed as { metrics: unknown }).metrics &&
      typeof (parsed as { metrics: unknown }).metrics === "object"
        ? (parsed as { metrics: Record<string, unknown> }).metrics
        : parsed;

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("OpenAI extract failed:", error);
    const details = openaiErrorMessage(error);
    return NextResponse.json(
      {
        error:
          "画像の自動解析に失敗しました。しばらくしてから再度お試しください。",
        errorType: "OpenAI Error",
        details: isDev ? details : undefined,
      },
      { status: 500 },
    );
  }
}
