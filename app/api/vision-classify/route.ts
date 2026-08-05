/**
 * ウェアラブル画像の画面種類分類 API。
 * OCR ではなく Vision による画面理解。SOXAI/Oura 解析 API とは分離。
 */

import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  normalizeImageDataUrl,
  openaiErrorMessage,
} from "@/lib/openai-helpers";
import { tokensFromUsage } from "@/lib/openai-usage";
import type { WearableDevice } from "@/lib/wearable-analysis";
import {
  assignmentModeForConfidence,
  clampConfidence,
  isClassifyImageCategory,
  logWearableClassifySummary,
  WEARABLE_CLASSIFY_JSON_SCHEMA,
  type ClassifyImageCategory,
  type WearableClassifyItemResult,
  type WearableClassifyResponse,
} from "@/lib/wearable-classify";

export const runtime = "nodejs";
export const maxDuration = 120;

const VISION_MODEL = "gpt-4o" as const;
const OPENAI_TIMEOUT_MS = 90_000;
const MAX_IMAGES = 15;
const MAX_IMAGE_CHARS = 8_000_000;

type ClassifyRequestBody = {
  images?: unknown;
  expectedDevice?: unknown;
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

function buildClassifyPrompt(
  imageCount: number,
  expectedDevice?: WearableDevice,
): string {
  const deviceHint = expectedDevice
    ? `ユーザーが選択した機種ヒント: ${expectedDevice}（ヒントが明らかに違う場合は detectedDevice を優先）`
    : "機種ヒントなし。画像から推定してください。";

  return `あなたはウェアラブル健康アプリのスクリーンショット分類器です。
OCRで数値を読み取る必要はありません。画像全体を見て「どの画面か」を判定してください。

${imageCount}枚の画像それぞれについて分類してください。
${deviceHint}

detectedDevice（機種）:
- soxai / oura / apple_watch / garmin / fitbit / other / unknown

imageCategory（画面種類）は次のいずれかのみ:
- sleep_summary … 睡眠スコア・合計睡眠・効率・REM/深い睡眠・入眠潜時などのサマリー
- sleep_stages … 覚醒/REM/浅い/深い の内訳や睡眠ステージグラフ
- heart_rate_hrv … 夜間心拍・最低心拍・平均HRV・心拍/HRVグラフ
- key_metrics … 安静時心拍・HRV・体表温・呼吸など主要指標の一覧
- daytime_stress … 日中ストレス時間・回復時間・時系列
- resilience … レジリエンス画面
- unknown … 判別不能・無関係・不鮮明

confidence は 0〜100 の整数感覚で。画面ラベルやレイアウトが明確なら高く。
analyzable は睡眠・回復分析に使える画面なら true。
reason は短い日本語（例: 「Sleep Score とステージ円グラフが見える」）。

推測で無理にカテゴリを当てない。確信が低い場合は unknown + 低 confidence。`;
}

function normalizeDetectedDevice(
  value: unknown,
): WearableClassifyItemResult["detectedDevice"] {
  const allowed = [
    "soxai",
    "oura",
    "apple_watch",
    "garmin",
    "fitbit",
    "other",
    "unknown",
  ] as const;
  if (
    typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
  ) {
    return value as WearableClassifyItemResult["detectedDevice"];
  }
  return "unknown";
}

function normalizeResults(
  raw: unknown,
  imageCount: number,
): WearableClassifyItemResult[] {
  const record =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const list = Array.isArray(record.results) ? record.results : [];
  const byIndex = new Map<number, WearableClassifyItemResult>();

  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const index =
      typeof row.index === "number" && Number.isInteger(row.index)
        ? row.index
        : -1;
    if (index < 0 || index >= imageCount) continue;
    const imageCategory: ClassifyImageCategory = isClassifyImageCategory(
      row.imageCategory,
    )
      ? row.imageCategory
      : "unknown";
    const confidence = clampConfidence(row.confidence);
    byIndex.set(index, {
      index,
      detectedDevice: normalizeDetectedDevice(row.detectedDevice),
      imageCategory,
      confidence,
      analyzable: row.analyzable === true,
      reason: typeof row.reason === "string" ? row.reason.trim() : undefined,
    });
  }

  const results: WearableClassifyItemResult[] = [];
  for (let i = 0; i < imageCount; i += 1) {
    results.push(
      byIndex.get(i) ?? {
        index: i,
        detectedDevice: "unknown",
        imageCategory: "unknown",
        confidence: 0,
        analyzable: false,
        reason: "分類結果なし",
      },
    );
  }
  return results;
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "画像分類APIの設定が完了していません。OPENAI_API_KEY を設定してください。",
      },
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

  const payload = (body ?? {}) as ClassifyRequestBody;
  const rawImages = Array.isArray(payload.images) ? payload.images : [];
  const images = rawImages
    .filter(isImageDataUrl)
    .map(normalizeImageDataUrl)
    .slice(0, MAX_IMAGES);

  if (images.length === 0) {
    return NextResponse.json(
      { error: "分類する画像がありません。" },
      { status: 400 },
    );
  }

  for (const [index, image] of images.entries()) {
    if (image.length > MAX_IMAGE_CHARS) {
      return NextResponse.json(
        {
          error: `画像 ${index + 1} が大きすぎます。圧縮してから再度お試しください。`,
        },
        { status: 400 },
      );
    }
  }

  const expectedDevice =
    typeof payload.expectedDevice === "string" &&
    ["soxai", "oura", "apple_watch", "garmin", "fitbit", "other"].includes(
      payload.expectedDevice,
    )
      ? (payload.expectedDevice as WearableDevice)
      : undefined;

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: OPENAI_TIMEOUT_MS,
      maxRetries: 1,
    });

    const response = await client.responses.create({
      model: VISION_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildClassifyPrompt(images.length, expectedDevice),
            },
            ...images.map((imageUrl) => ({
              type: "input_image" as const,
              image_url: imageUrl,
              detail: "low" as const,
            })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "wearable_image_classify",
          strict: true,
          schema: WEARABLE_CLASSIFY_JSON_SCHEMA,
        },
      },
    });

    const outputText = response.output_text?.trim();
    if (!outputText) {
      return NextResponse.json(
        { error: "分類結果の取得に失敗しました。" },
        { status: 500 },
      );
    }

    const parsed = parseJsonObject(outputText);
    const results = normalizeResults(parsed, images.length);
    const successCount = results.filter(
      (item) =>
        item.imageCategory !== "unknown" &&
        item.confidence >= 70 &&
        item.analyzable,
    ).length;
    const elapsedMs = Date.now() - startedAt;
    const successRate =
      images.length > 0
        ? Math.round((successCount / images.length) * 100)
        : 0;

    const payloadOut: WearableClassifyResponse = {
      results,
      elapsedMs,
      successCount,
      totalCount: images.length,
      successRate,
    };

    logWearableClassifySummary({
      source: "api",
      deviceType: expectedDevice,
      elapsedMs,
      successRate,
      totalCount: images.length,
      successCount,
      results: results.map((item) => ({
        index: item.index,
        imageCategory: item.imageCategory,
        confidence: item.confidence,
        mode: assignmentModeForConfidence(item.confidence, item.imageCategory),
        analyzable: item.analyzable,
      })),
    });

    const usage = tokensFromUsage(response.usage);
    console.info("[api/vision-classify] usage", {
      model: VISION_MODEL,
      ...usage,
      imageCount: images.length,
      elapsedMs,
      successRate,
    });

    return NextResponse.json(payloadOut);
  } catch (error) {
    console.error("[api/vision-classify] failed", openaiErrorMessage(error));
    return NextResponse.json(
      {
        error: "画像の自動分類に失敗しました。しばらくしてから再度お試しください。",
        details: openaiErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
