import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  metricsJsonSchema,
  normalizeImageDataUrl,
  openaiErrorMessage,
  SOXAI_EXTRACT_INSTRUCTIONS,
} from "@/lib/openai-helpers";
import {
  collectedMetricKeys,
  normalizeMetrics,
  SOXAI_METRIC_FIELDS,
} from "@/lib/soxai-metrics";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";
const MAX_IMAGES = 10;

const metricKeyEnum = SOXAI_METRIC_FIELDS.map((field) => field.key);

const extractSchema = {
  type: "object",
  additionalProperties: false,
  required: ["metrics", "conflicts"],
  properties: {
    metrics: metricsJsonSchema,
    conflicts: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "adoptedValue", "otherValues"],
        properties: {
          key: { type: "string", enum: metricKeyEnum },
          adoptedValue: { type: "string" },
          otherValues: {
            type: "array",
            items: { type: "string" },
          },
        },
      },
    },
  },
} as const;

type ExtractRequestBody = {
  images?: unknown;
};

function describeImage(dataUrl: string, index: number) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i);
  const mime = match?.[1] ?? "unknown";
  const base64 = match?.[2] ?? "";
  const approxBytes = Math.floor((base64.length * 3) / 4);
  return {
    index,
    mime,
    approxBytes,
    base64Length: base64.length,
    hasPayload: base64.length > 0,
  };
}

function validateBody(body: unknown):
  | { ok: true; images: string[] }
  | { ok: false; message: string; errorType: string } {
  if (!body || typeof body !== "object") {
    return {
      ok: false,
      message: "リクエスト形式が正しくありません。",
      errorType: "Validation Error",
    };
  }

  const { images } = body as ExtractRequestBody;

  if (!Array.isArray(images) || images.length === 0) {
    return {
      ok: false,
      message: "睡眠データ画像が不足しています。",
      errorType: "Validation Error",
    };
  }

  if (!images.every(isImageDataUrl)) {
    return {
      ok: false,
      message:
        "画像形式が不正です。JPG / JPEG / PNG / WEBP の data URL（images 配列）で送信してください。",
      errorType: "Validation Error",
    };
  }

  if (images.length > MAX_IMAGES) {
    return {
      ok: false,
      message: `画像は最大${MAX_IMAGES}枚までです。`,
      errorType: "Validation Error",
    };
  }

  return { ok: true, images };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (parseError) {
    console.error("[api/extract] request JSON parse failed:", parseError);
    return NextResponse.json(
      {
        error:
          "リクエストのJSON解析に失敗しました。画像送信サイズが大きすぎる可能性があります。",
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
    console.error("[api/extract] validation failed:", validated.message);
    return NextResponse.json(
      {
        error: validated.message,
        errorType: validated.errorType,
        details: isDev ? validated.message : undefined,
      },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("[api/extract] OPENAI_API_KEY is missing");
    return NextResponse.json(
      {
        error:
          "画像解析APIの設定が完了していません。.env.local に OPENAI_API_KEY を設定し、開発サーバーを再起動してください。",
        errorType: "Config Error",
        details: isDev ? "OPENAI_API_KEY is missing." : undefined,
      },
      { status: 500 },
    );
  }

  const images = validated.images.map(normalizeImageDataUrl);
  const imageMeta = images.map(describeImage);
  console.info("[api/extract] received images", {
    count: images.length,
    images: imageMeta,
  });

  if (imageMeta.some((item) => !item.hasPayload || item.approxBytes < 100)) {
    return NextResponse.json(
      {
        error: "画像データが空、または破損しています。別の画像でお試しください。",
        errorType: "Validation Error",
        details: isDev ? JSON.stringify(imageMeta) : undefined,
      },
      { status: 400 },
    );
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 280_000,
      maxRetries: 1,
    });

    const response = await client.responses.create({
      model: "gpt-4o",
      instructions: SOXAI_EXTRACT_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `以下の SOXAI スクリーンショット（${images.length}枚）から、睡眠関連の数値・時刻をすべて抽出してください。

抽出対象: 睡眠スコア / 睡眠時間 / 入眠時間 / 起床時間 / 睡眠効率 / 睡眠負債 / 体内時計 / 入眠潜時 / 覚醒時間 / 覚醒率 / レム睡眠率 / 浅い睡眠率 / 深い睡眠率 / REM睡眠 / 浅い睡眠 / 深い睡眠 / 呼吸速度 / 平均SpO₂ / 安静時心拍数 / HRV / 皮膚温度 / ストレス

推測禁止。画像に無い項目は ""、sleepScore は null。
複数画像は同日データとして統合し、metrics に最終採用値を入れてください。
同じ項目で画像間の値が異なる場合は、信頼度が高い値（同程度なら後の画像＝新しい画面）を採用し、conflicts に key / adoptedValue / otherValues を記録してください。競合がなければ conflicts は空配列です。`,
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
      console.error("[api/extract] empty output_text from OpenAI");
      return NextResponse.json(
        {
          error: "画像解析結果の取得に失敗しました（空の応答）。",
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
      console.error("[api/extract] Failed to parse OpenAI extract JSON", {
        parseError,
        preview: outputText.slice(0, 400),
      });
      return NextResponse.json(
        {
          error: "画像解析結果のJSON解析に失敗しました。",
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

    const metricsRaw =
      parsed &&
      typeof parsed === "object" &&
      "metrics" in parsed &&
      (parsed as { metrics: unknown }).metrics &&
      typeof (parsed as { metrics: unknown }).metrics === "object"
        ? (parsed as { metrics: Record<string, unknown> }).metrics
        : parsed;

    if (!metricsRaw || typeof metricsRaw !== "object") {
      console.error("[api/extract] metrics missing in parsed payload", parsed);
      return NextResponse.json(
        {
          error: "画像解析結果の項目形式が不正です。",
          errorType: "JSON Parse Error",
          details: isDev ? "metrics object missing" : undefined,
        },
        { status: 500 },
      );
    }

    const metrics = normalizeMetrics(
      metricsRaw as Parameters<typeof normalizeMetrics>[0],
    );
    const keys = collectedMetricKeys(metrics);
    const conflicts =
      parsed &&
      typeof parsed === "object" &&
      "conflicts" in parsed &&
      Array.isArray((parsed as { conflicts: unknown }).conflicts)
        ? (parsed as { conflicts: unknown[] }).conflicts
        : [];

    console.info("[api/extract] extraction complete", {
      collected: keys.length,
      keys,
      conflictCount: conflicts.length,
    });

    if (keys.length === 0) {
      return NextResponse.json(
        {
          error:
            "画像から睡眠データを読み取れませんでした。鮮明なSOXAIスクリーンショット（JPG / JPEG / PNG / WEBP）をアップロードしてください。",
          errorType: "Empty Extraction",
          details: isDev ? "All metric fields were empty." : undefined,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      metrics,
      conflicts,
      collectedCount: keys.length,
    });
  } catch (error) {
    console.error("[api/extract] OpenAI extract failed:", error);
    const details = openaiErrorMessage(error);
    return NextResponse.json(
      {
        error:
          "画像解析サービスでエラーが発生しました。しばらくしてから再度お試しください。",
        errorType: "OpenAI Error",
        details: isDev ? details : undefined,
      },
      { status: 500 },
    );
  }
}
