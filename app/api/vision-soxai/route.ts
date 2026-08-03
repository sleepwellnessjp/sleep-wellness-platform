/**
 * SOXAI Vision API: 9枚をそのまま Vision へ送り、24項目 JSON を返す。
 * OCR / ROI / reading-map / 画面分類 / 再OCR は使わない。
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
  emptySoxaiVision24,
  mapVision24ToAnalysisMetrics,
  normalizeSoxaiVision24,
  soxaiVision24JsonSchema,
  type SoxaiVision24,
} from "@/lib/soxai-vision-schema";
import { normalizeMetricsForDisplay } from "@/lib/soxai-display-normalize";
import { collectedMetricKeys } from "@/lib/soxai-metrics";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";
const VISION_MODEL = "gpt-4o" as const;
const OPENAI_TIMEOUT_MS = 180_000;

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

function buildVisionPrompt(imageCount: number): string {
  return `あなたは SOXAI Ring アプリのスクリーンショット解析器です。
${imageCount}枚の画像を横断して読み、見える数値だけを JSON にまとめてください。

ルール:
- 捏造禁止。画像に無い項目は null
- 単位が画面にあれば値に含める（%、bpm、ms、rpm、℃、時間分 など）
- 入眠時間(bedTime)と入眠潜時(sleepLatency)を取り違えない
- 起床時間(wakeTime)と覚醒時間(awakeDuration)を取り違えない
- 睡眠時間(sleepDuration)と全就床時間を取り違えない
- 睡眠効率(sleepEfficiency)と覚醒率(awakePercent)を取り違えない
- 安静時心拍(bpm)とHRV(ms)を取り違えない
- 平均酸素レベルは spo2
- 呼吸速度は respirationRate
- 体内時計の位相差は circadianShift
- ホーム画面の QoL / 昨日のスコア / 体調 も取る（qol / yesterdayQol / conditionScore）
- 睡眠スコアはホーム「睡眠」行または睡眠画面のスコア
- 睡眠ステージは画面の行どおりに分ける（合算・言い換え禁止）:
  - 「覚醒」行 → awakeDuration / awakePercent
  - 「レム睡眠」行 → remDuration / remPercent
  - 「浅い睡眠」行 → lightSleepDuration / lightSleepPercent
  - 「深い睡眠」行 → deepSleepDuration / deepSleepPercent
- 浅い睡眠をノンレムにしない。深い睡眠をノンレムにしない。合算しない
- breathingEvents が見えなければ null

必須キー（すべて返す）:
sleepScore, qol, yesterdayQol, conditionScore, sleepDuration, sleepEfficiency,
sleepDebt, bedTime, wakeTime, sleepLatency, awakeDuration, awakePercent,
remDuration, remPercent, lightSleepDuration, lightSleepPercent,
deepSleepDuration, deepSleepPercent, restingHeartRateAvg, restingHeartRateMin,
restingHeartRateMax, respirationRate, spo2, hrvAvg, hrvMin, hrvMax, stress,
skinTemperature, circadianShift, breathingEvents`;
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

  const started = Date.now();
  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 1,
    });

    const content = [
      { type: "input_text" as const, text: buildVisionPrompt(images.length) },
      ...images.map((url) => ({
        type: "input_image" as const,
        image_url: url,
        detail: "high" as const,
      })),
    ];

    const response = await client.responses.create({
      model: VISION_MODEL,
      input: [
        {
          role: "user",
          content,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "soxai_vision_24",
          strict: true,
          schema: soxaiVision24JsonSchema as unknown as Record<string, unknown>,
        },
      },
    });

    const outputText = response.output_text?.trim() ?? "";
    if (!outputText) {
      throw new Error("Vision response.output_text was empty.");
    }

    let vision: SoxaiVision24 = emptySoxaiVision24();
    try {
      vision = normalizeSoxaiVision24(parseJsonObject(outputText));
    } catch (parseError) {
      console.error("[api/vision-soxai] JSON parse failed", parseError, {
        preview: outputText.slice(0, 400),
      });
      throw new Error("Vision JSON の解析に失敗しました。");
    }

    const metrics = normalizeMetricsForDisplay(
      mapVision24ToAnalysisMetrics(vision),
    );
    const usage = tokensFromUsage(response.usage);

    console.info("[api/vision-soxai] done", {
      imageCount: images.length,
      durationMs: Date.now() - started,
      metricCount: collectedMetricKeys(metrics).length,
      model: VISION_MODEL,
      usage,
    });

    return NextResponse.json({
      vision,
      metrics,
      imageCount: images.length,
      collectedCount: collectedMetricKeys(metrics).length,
      model: VISION_MODEL,
      usage,
      durationMs: Date.now() - started,
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
