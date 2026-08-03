/**
 * Oura Ring Vision API: アップロード画像をまとめて Vision へ送り構造化 JSON を返す。
 * SOXAI vision-soxai とは完全分離。OCR / ROI は使わない。
 */

import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  normalizeImageDataUrl,
  openaiErrorMessage,
} from "@/lib/openai-helpers";
import { tokensFromUsage } from "@/lib/openai-usage";
import {
  emptyOuraVisionResult,
  normalizeOuraVisionResult,
  ouraVisionJsonSchema,
} from "@/lib/oura-vision-schema";
import { mapOuraVisionToExtraction } from "@/lib/oura-metrics";
import { normalizeMetricsForDisplay } from "@/lib/soxai-display-normalize";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";
const VISION_MODEL = "gpt-4o" as const;
const OPENAI_TIMEOUT_MS = 180_000;
const MAX_IMAGES = 16;

type VisionRequestBody = {
  images?: unknown;
};

function parseJsonObject(text: string): unknown {
  let raw = text.trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) raw = fence[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) raw = raw.slice(start, end + 1);
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1")) as unknown;
  }
}

function buildOuraVisionPrompt(imageCount: number): string {
  return `あなたは Oura Ring アプリのスクリーンショット解析器です。
${imageCount}枚の画像を横断して読み、見える数値だけを JSON にまとめてください。

ルール:
- 捏造禁止。画像に無い項目は null / 空オブジェクト / 空配列
- 時間は分（minutes）の数値で返す（例: 7時間12分 → 432）
- 百分率は数値のみ（例: 82% → 82）
- 心拍は bpm の数値、HRV は ms の数値、呼吸数は回/分の数値
- 体温偏差は ℃ の数値（例: -0.4）
- bedtime / wakeTime は画面表記の時刻文字列（例: "23:41"）
- 睡眠ステージは Awake / REM / Light / Deep を分ける
- Light を Non-REM にしない。Deep を Non-REM にしない。合算しない
- 「ノンレム」という語は使わない
- Contributors が見える場合のみ deviceSpecificMetrics に入れる
- tags / notes は画面にあれば配列で返す

必須: device は必ず "oura"。metrics の全キーを返し、無いものは null。`;
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "画像解析APIの設定が完了していません。.env.local に OPENAI_API_KEY を設定してください。",
        errorType: "Config Error",
      },
      { status: 500 },
    );
  }

  let body: VisionRequestBody;
  try {
    body = (await request.json()) as VisionRequestBody;
  } catch {
    return NextResponse.json(
      { error: "リクエスト JSON が不正です。", errorType: "Validation Error" },
      { status: 400 },
    );
  }

  const imagesRaw = Array.isArray(body.images) ? body.images : [];
  const images = imagesRaw
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeImageDataUrl(item))
    .filter((item) => isImageDataUrl(item));

  if (images.length === 0) {
    return NextResponse.json(
      { error: "解析する画像がありません。", errorType: "Validation Error" },
      { status: 400 },
    );
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json(
      {
        error: `画像は最大${MAX_IMAGES}枚までです。`,
        errorType: "Validation Error",
      },
      { status: 400 },
    );
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 1,
    });

    const response = await client.responses.create({
      model: VISION_MODEL,
      instructions: buildOuraVisionPrompt(images.length),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Oura アプリのスクリーンショットから構造化 JSON を抽出してください。",
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
          name: "oura_vision_extract",
          strict: true,
          schema: ouraVisionJsonSchema,
        },
      },
    });

    const usage = tokensFromUsage(response.usage);
    const outputText = response.output_text?.trim();
    if (!outputText) {
      return NextResponse.json(
        {
          error: "Oura Vision の応答が空でした。",
          errorType: "OpenAI Error",
          vision: emptyOuraVisionResult(),
          usage: { purpose: "vision-oura", model: VISION_MODEL, ...usage },
        },
        { status: 500 },
      );
    }

    let parsed: unknown;
    try {
      parsed = parseJsonObject(outputText);
    } catch (error) {
      return NextResponse.json(
        {
          error: "Oura Vision JSON の解析に失敗しました。",
          errorType: "JSON Parse Error",
          details: isDev
            ? error instanceof Error
              ? error.message
              : String(error)
            : undefined,
        },
        { status: 500 },
      );
    }

    const vision = normalizeOuraVisionResult(parsed);
    const mapped = mapOuraVisionToExtraction(vision);
    const metrics = normalizeMetricsForDisplay(mapped.metrics);

    return NextResponse.json({
      device: "oura",
      vision,
      metrics,
      imageKeys: mapped.imageKeys,
      deviceSpecificMetrics: mapped.deviceSpecificMetrics,
      ouraScores: mapped.ouraScores,
      warnings: mapped.warnings,
      usage: {
        purpose: "vision-oura",
        model: VISION_MODEL,
        apiCalls: 1,
        imageCount: images.length,
        ...usage,
      },
    });
  } catch (error) {
    console.error("[api/vision-oura] failed:", error);
    return NextResponse.json(
      {
        error: "Oura画像の解析に失敗しました。しばらくしてから再度お試しください。",
        errorType: "OpenAI Error",
        details: isDev ? openaiErrorMessage(error) : undefined,
      },
      { status: 500 },
    );
  }
}
