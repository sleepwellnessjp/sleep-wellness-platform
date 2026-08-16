/**
 * Oura Ring Vision API: アップロード画像をまとめて Vision へ送り構造化 JSON を返す。
 * SOXAI vision-soxai とは完全分離。OCR / ROI / 座標認識は使わない。
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
  getOuraVisionJsonSchemaForOpenAI,
  assertOuraVisionSchemaStrictSafe,
  normalizeOuraVisionResult,
} from "@/lib/oura-vision-schema";
import { mapOuraVisionToExtraction } from "@/lib/oura-metrics";
import { normalizeMetricsForDisplay } from "@/lib/soxai-display-normalize";

export const runtime = "nodejs";
export const maxDuration = 300;

const VISION_MODEL = "gpt-4o" as const;
const OPENAI_TIMEOUT_MS = 180_000;
const MAX_IMAGES = 16;
/** data URL 1枚あたりの安全上限（約 12MB raw） */
const MAX_IMAGE_CHARS = 16_000_000;

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

function summarizeDataUrl(dataUrl: string): {
  mime: string;
  chars: number;
  approxBytes: number;
} {
  const match = dataUrl.match(/^data:(image\/[a-z0-9.+-]+);base64,(.*)$/i);
  const mime = match?.[1] ?? "unknown";
  const b64 = match?.[2] ?? "";
  return {
    mime,
    chars: dataUrl.length,
    approxBytes: Math.floor((b64.length * 3) / 4),
  };
}

function buildOuraVisionPrompt(imageCount: number): string {
  return `あなたは Oura Ring アプリのスクリーンショット解析器です。
${imageCount}枚の画像を横断して読み、見える数値・文言だけを JSON にまとめてください。
画面種類の分類は不要です。OCR・ROI・座標推定は使わず、画像全体の内容理解のみで取得してください。

取得対象（見えるものだけ）:
- Sleep Score / Readiness Score / Activity Score
- Total Sleep / Time in Bed / Sleep Efficiency / Sleep Latency
- Bedtime / Wake Time / Awake Time（時刻または中途覚醒の表記）
- Awake / REM / Light / Deep（時間と%、別項目）
- Sleep Debt（睡眠負債）→ sleepDebtMinutes（分）
- Sleep Need / 必要な睡眠量 → sleepNeedMinutes（分）
- Restfulness / 安眠度 → restfulness（画面表記どおり）
- Resting Heart Rate / Lowest Heart Rate / Average Heart Rate（別項目）
- Average HRV / Maximum HRV（Minimum が見えれば minimumHrv）
- HRV Balance / 心拍変動バランス → hrvBalance（文言）または hrvBalanceScore（数値）
- Sleep Regularity / 睡眠規則性 → sleepRegularity
- Respiratory Rate / Average SpO2（平均血中酸素ウェルネス）
- Breathing Regularity / 夜間の呼吸状態（見えれば文字列）
- Body Temperature Deviation / 体表温
- Daytime Stress の集計「ストレス ○分」→ daytimeStressMinutes
- Daytime Stress の集計「回復 ○分」→ daytimeRecoveryMinutes（および recoveryTime 文字列）
- Daytime Stress の集計「リラックス ○分」→ daytimeRelaxMinutes
- Recovery Index / 回復指数
- Activity: caloriesBurned / activityTimeMinutes / steps（画面にあれば）
- Sleep Timing / Sleep Balance / Activity Balance
- Tags / Notes（deviceSpecificMetrics.tags / notes）
- Sleep / Readiness Contributors（見える場合のみ）

ルール:
- 捏造禁止。画像に無い項目は null / 空オブジェクト / 空配列
- 推測・補完・平均からの推定は禁止
- 時間は分（minutes）の数値で返す（例: 7時間12分 → 432）
- 百分率は数値のみ（例: 82% → 82）
- 心拍は bpm、HRV は ms、呼吸数は回/分の数値
- 体温偏差は ℃ の数値（例: -0.4）
- bedtime / wakeTime / awakeTime は画面表記の時刻文字列（例: "23:41"）
- 睡眠ステージは Awake / REM / Light / Deep を必ず別項目で保持
- Light を Non-REM にしない。Deep を Non-REM にしない。合算しない
- 「ノンレム」という語は使わない
- 睡眠スコアとコンディションスコア（Readiness）は別指標。値が同じでも統合しない
- 最低心拍・平均心拍・安静時心拍を取り違えない
- 平均HRV と 最大HRV を取り違えない
- 睡眠負債・必要睡眠量・合計睡眠を取り違えない
- 日中ストレスの分数はグラフ形状から推測しない。画面上の「ストレス ○分」「回復 ○分」「リラックス ○分」などの集計値だけ取る
- 夜間睡眠と昼寝を混同しない。対象日の夜間睡眠を基本とし、昼寝は notes に補足してよい
- 「今日の値」と「通常値／平均値」が並ぶ場合は今日（対象セッション）の値だけ採用
- 項目が見えない・読めない場合は必ず null。画面に「0」と明示されている場合のみ 0 を返す（推測で 0 を入れない）
- 覚醒時間（Awake の合計分）は awakeDuration。時刻表記の Awake Time は awakeTime
- Contributors / tags / notes は画面にあればのみ入れる
- sleepContributors / readinessContributors は [{ "name": "totalSleep", "value": 70 }, ...] の配列形式

必須: device は必ず "oura"。metrics の全キーを返し、無いものは null。`;
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const apiKeyPresent = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (!apiKeyPresent) {
    console.error("[api/vision-oura] OPENAI_API_KEY is missing");
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY が未設定です。.env.local / Vercel 環境変数を確認してください。",
        errorType: "Config Error",
        details: "OPENAI_API_KEY missing",
      },
      { status: 500 },
    );
  }

  let body: VisionRequestBody;
  try {
    body = (await request.json()) as VisionRequestBody;
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    console.error("[api/vision-oura] invalid request JSON", details);
    return NextResponse.json(
      {
        error: "リクエスト JSON が不正です。",
        errorType: "Validation Error",
        details,
      },
      { status: 400 },
    );
  }

  const imagesRaw = Array.isArray(body.images) ? body.images : [];
  const images = imagesRaw
    .filter((item): item is string => typeof item === "string")
    .map((item) => normalizeImageDataUrl(item))
    .filter((item) => isImageDataUrl(item));

  const oversized = images.find((image) => image.length > MAX_IMAGE_CHARS);
  console.info("[api/vision-oura] request", {
    rawCount: imagesRaw.length,
    validCount: images.length,
    model: VISION_MODEL,
    apiKeyPresent,
    timeoutMs: OPENAI_TIMEOUT_MS,
    maxImages: MAX_IMAGES,
    summaries: images.map((image, index) => ({
      index,
      ...summarizeDataUrl(image),
    })),
  });

  if (images.length === 0) {
    console.error("[api/vision-oura] no valid image data URLs", {
      rawCount: imagesRaw.length,
      sampleTypes: imagesRaw.slice(0, 3).map((item) => typeof item),
    });
    return NextResponse.json(
      {
        error:
          "解析する画像がありません。JPEG / PNG / WEBP の data URL を送ってください。",
        errorType: "Validation Error",
        details: `rawCount=${imagesRaw.length}, validCount=0`,
      },
      { status: 400 },
    );
  }
  if (images.length > MAX_IMAGES) {
    return NextResponse.json(
      {
        error: `画像は最大${MAX_IMAGES}枚までです。`,
        errorType: "Validation Error",
        details: `imageCount=${images.length}`,
      },
      { status: 400 },
    );
  }
  if (oversized) {
    const summary = summarizeDataUrl(oversized);
    console.error("[api/vision-oura] image too large", summary);
    return NextResponse.json(
      {
        error: "画像サイズが大きすぎます。解像度を下げて再度お試しください。",
        errorType: "Validation Error",
        details: `chars=${summary.chars}, approxBytes=${summary.approxBytes}, limitChars=${MAX_IMAGE_CHARS}`,
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

    const content = [
      {
        type: "input_text" as const,
        text: "Oura アプリのスクリーンショットから構造化 JSON を抽出してください。画像全体を見て、見える値だけを返してください。",
      },
      ...images.map((imageUrl) => ({
        type: "input_image" as const,
        image_url: imageUrl,
        detail: "high" as const,
      })),
    ];

    const openAiSchema = getOuraVisionJsonSchemaForOpenAI();
    assertOuraVisionSchemaStrictSafe(openAiSchema);

    console.info("[api/vision-oura] calling OpenAI Vision", {
      model: VISION_MODEL,
      runtime: "nodejs",
      imageCount: images.length,
      contentParts: content.length,
      hasInputImages: content.some((part) => part.type === "input_image"),
      apiKeyPresent,
      schemaContributorsType: (
        (
          (openAiSchema.properties as Record<string, unknown>)
            ?.deviceSpecificMetrics as {
            properties?: { sleepContributors?: { type?: string } };
          }
        )?.properties?.sleepContributors?.type
      ),
    });

    const response = await client.responses.create({
      model: VISION_MODEL,
      instructions: buildOuraVisionPrompt(images.length),
      input: [
        {
          role: "user",
          content,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "oura_vision_extract",
          strict: true,
          schema: openAiSchema,
        },
      },
    });

    const usage = tokensFromUsage(response.usage);
    const outputText = response.output_text?.trim();
    console.info("[api/vision-oura] OpenAI response", {
      elapsedMs: Date.now() - startedAt,
      outputChars: outputText?.length ?? 0,
      usage,
    });

    if (!outputText) {
      console.error("[api/vision-oura] empty output_text", {
        responseId: response.id,
        usage,
      });
      return NextResponse.json(
        {
          error: "Oura Vision の応答が空でした。",
          errorType: "OpenAI Error",
          details: `response.id=${response.id ?? "unknown"}, output_text empty`,
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
      const details = error instanceof Error ? error.message : String(error);
      console.error("[api/vision-oura] JSON parse failed", {
        details,
        outputPreview: outputText.slice(0, 500),
      });
      return NextResponse.json(
        {
          error: "Oura Vision JSON の解析に失敗しました。",
          errorType: "JSON Parse Error",
          details,
          outputPreview: outputText.slice(0, 300),
        },
        { status: 500 },
      );
    }

    const vision = normalizeOuraVisionResult(parsed);
    const mapped = mapOuraVisionToExtraction(vision);
    const metrics = normalizeMetricsForDisplay(mapped.metrics);

    console.info("[api/vision-oura] success", {
      elapsedMs: Date.now() - startedAt,
      imageKeys: mapped.imageKeys.length,
      ouraScores: mapped.ouraScores,
      warningCount: mapped.warnings.length,
    });

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
    const details = openaiErrorMessage(error);
    console.error("[api/vision-oura] failed:", {
      details,
      error,
      elapsedMs: Date.now() - startedAt,
      runtime: "nodejs",
      apiKeyPresent: Boolean(process.env.OPENAI_API_KEY?.trim()),
    });
    return NextResponse.json(
      {
        // 本番でも原因を隠さない（Vercel で isDev=false のため）
        error: `Oura画像の Vision 解析に失敗しました: ${details}`,
        errorType: "OpenAI Error",
        details,
      },
      { status: 500 },
    );
  }
}
