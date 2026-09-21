/**
 * SOXAI Vision API: 画像を Vision へ送り、項目 JSON を返す。
 * OCR / ROI / reading-map / 画面分類 / 再OCR は使わない。
 * sections があれば各画像の画面種別をプロンプトに含める。
 */

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/require-api-user";
import {
  isImageDataUrl,
  normalizeImageDataUrl,
  openaiErrorMessage,
} from "@/lib/openai-helpers";
import { normalizeVisionSections } from "@/lib/soxai-vision-extract";
import {
  runSoxaiVisionExtract,
  SOXAI_VISION_MODEL,
  SOXAI_VISION_TEMPERATURE,
} from "@/lib/soxai-vision-run";
import { collectedMetricKeys } from "@/lib/soxai-metrics";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";
const OPENAI_TIMEOUT_MS = 180_000;

type VisionRequestBody = {
  images?: unknown;
  sections?: unknown;
};

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth && auth.error) return auth.error;

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

  if (!Array.isArray(body.images) || body.images.length === 0) {
    return NextResponse.json(
      { error: "images 配列が必要です。", errorType: "Validation Error" },
      { status: 400 },
    );
  }

  const images = body.images
    .filter((item): item is string => typeof item === "string")
    .map(normalizeImageDataUrl);

  if (images.length === 0 || !images.every(isImageDataUrl)) {
    return NextResponse.json(
      {
        error: "画像は data:image/(jpeg|png|webp);base64,... 形式で送ってください。",
        errorType: "Validation Error",
      },
      { status: 400 },
    );
  }

  if (images.length > 12) {
    return NextResponse.json(
      { error: "画像は最大12枚までです。", errorType: "Validation Error" },
      { status: 400 },
    );
  }

  const sections = normalizeVisionSections(body.sections, images.length);

  const started = Date.now();
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 1,
    });

    const { vision, metrics, telemetry, usage, retried } =
      await runSoxaiVisionExtract({ client, images, sections });

    // PII・画像は含めない（セクション種別と数値生値のみ）
    console.info("[api/vision-soxai] extract-telemetry", telemetry);

    if (isDev) {
      console.info("[vision-soxai] response JSON", {
        vision,
        metrics: {
          sleepDuration: metrics.sleepDuration,
          timeInBed: metrics.timeInBed,
          qol: metrics.qol,
          conditionScore: metrics.conditionScore,
          sleepScore: metrics.sleepScore,
        },
        collectedCount: collectedMetricKeys(metrics).length,
      });
    }

    console.info("[api/vision-soxai] done", {
      imageCount: images.length,
      durationMs: Date.now() - started,
      metricCount: collectedMetricKeys(metrics).length,
      model: SOXAI_VISION_MODEL,
      temperature: SOXAI_VISION_TEMPERATURE,
      retried,
      usage,
    });

    return NextResponse.json({
      vision,
      metrics,
      imageCount: images.length,
      collectedCount: collectedMetricKeys(metrics).length,
      model: SOXAI_VISION_MODEL,
      usage,
      durationMs: Date.now() - started,
      telemetry,
    });
  } catch (error) {
    const message = openaiErrorMessage(error);
    console.error("[api/vision-soxai] failed", {
      message,
      durationMs: Date.now() - started,
    });
    return NextResponse.json(
      {
        error: "Vision解析に失敗しました。しばらくしてから再度お試しください。",
        errorType: "Vision Error",
        details: isDev ? message : undefined,
      },
      { status: 500 },
    );
  }
}
