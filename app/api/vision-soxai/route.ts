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
import {
  estimateDataUrlBytes,
  IMAGE_PREP_PROFILES,
  prepProfileForSection,
  type PreparedImageMeta,
} from "@/lib/soxai-image-prep";
import {
  normalizeVisionSections,
  type SoxaiVisionImageSizeTelemetry,
} from "@/lib/soxai-vision-extract";
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
  imagePrepMetas?: unknown;
};

function normalizeImagePrepMetas(
  raw: unknown,
  images: string[],
  sections: string[],
): SoxaiVisionImageSizeTelemetry[] {
  if (Array.isArray(raw) && raw.length === images.length) {
    return raw.map((item, index) => {
      const record =
        item && typeof item === "object"
          ? (item as Partial<PreparedImageMeta>)
          : {};
      const section = String(sections[index] ?? record.section ?? "");
      const profile = prepProfileForSection(section);
      const cfg = IMAGE_PREP_PROFILES[profile];
      return {
        index,
        section: section || "unknown",
        profile: String(record.profile ?? profile),
        maxEdgePx:
          typeof record.maxEdgePx === "number" ? record.maxEdgePx : cfg.maxEdgePx,
        jpegQuality:
          typeof record.jpegQuality === "number"
            ? record.jpegQuality
            : cfg.jpegQuality,
        bytes:
          typeof record.bytes === "number"
            ? record.bytes
            : estimateDataUrlBytes(images[index] ?? ""),
        dataUrlChars:
          typeof record.dataUrlChars === "number"
            ? record.dataUrlChars
            : (images[index]?.length ?? 0),
      };
    });
  }

  return images.map((dataUrl, index) => {
    const section = String(sections[index] ?? "");
    const profile = prepProfileForSection(section);
    const cfg = IMAGE_PREP_PROFILES[profile];
    return {
      index,
      section: section || "unknown",
      profile,
      maxEdgePx: cfg.maxEdgePx,
      jpegQuality: cfg.jpegQuality,
      bytes: estimateDataUrlBytes(dataUrl),
      dataUrlChars: dataUrl.length,
    };
  });
}

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
  const imageSizes = normalizeImagePrepMetas(
    body.imagePrepMetas,
    images,
    sections.map((s) => s || ""),
  );

  const started = Date.now();
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 1,
    });

    const { vision, metrics, telemetry, usage, retried } =
      await runSoxaiVisionExtract({
        client,
        images,
        sections,
        imageSizes,
      });

    // Vercel ログ画面で追えるよう、1行 JSON でも出す（個人名・画像本体は含めない）
    console.info(
      "[api/vision-soxai] extract-telemetry-json",
      JSON.stringify(telemetry),
    );
    console.info("[api/vision-soxai] extract-telemetry", telemetry);

    console.info("[api/vision-soxai] done", {
      imageCount: images.length,
      durationMs: Date.now() - started,
      metricCount: collectedMetricKeys(metrics).length,
      model: SOXAI_VISION_MODEL,
      temperature: SOXAI_VISION_TEMPERATURE,
      retried,
      hasHeartHrv: telemetry.hasHeartHrv,
      heartHrvImageCount: telemetry.heartHrvImageCount,
      heartHrvDedicatedStatus: telemetry.heartHrvDedicatedStatus,
      heartHrvDedicatedMode: telemetry.heartHrvDedicatedMode,
      heartHrvDedicatedError: telemetry.heartHrvDedicatedError,
      heartHrvDedicatedDurationMs: telemetry.heartHrvDedicatedDurationMs,
      bulkDurationMs: telemetry.bulkDurationMs,
      totalDurationMs: telemetry.totalDurationMs,
      restingHeartRateAvg: telemetry.restingHeartRateAvg,
      restingHeartRateMin: telemetry.restingHeartRateMin,
      restingHeartRateMax: telemetry.restingHeartRateMax,
      hrvAvg: telemetry.hrvAvg,
      hrvMax: telemetry.hrvMax,
      imageSizes: telemetry.imageSizes,
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
