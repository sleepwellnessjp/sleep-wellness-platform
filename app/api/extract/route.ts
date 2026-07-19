import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  normalizeImageDataUrl,
  openaiErrorMessage,
  SOXAI_EXTRACT_INSTRUCTIONS,
} from "@/lib/openai-helpers";
import {
  mergeImageExtractResults,
  type ImageExtractResult,
} from "@/lib/soxai-merge";
import {
  mapVisibleReadingsToMetricsDetailed,
  normalizeVisibleReadings,
  type VisibleReading,
} from "@/lib/soxai-reading-map";
import { collectedMetricKeys } from "@/lib/soxai-metrics";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";
const MAX_IMAGES = 10;
/** 並列OCR数（2〜10枚でもレート制限を抑えつつ進める） */
const OCR_CONCURRENCY = 3;

/** Vision には visibleReadings だけ返させる（metrics 同時抽出は読み取り漏れの原因） */
const extractSchema = {
  type: "object",
  additionalProperties: false,
  required: ["visibleReadings"],
  properties: {
    visibleReadings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["label", "value"],
        properties: {
          label: { type: "string" },
          value: { type: "string" },
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

function parseExtractJson(raw: string): unknown {
  let text = raw.trim();

  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    text = fence[1].trim();
  }

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    const cleaned = text.replace(/,\s*([}\]])/g, "$1");
    return JSON.parse(cleaned) as unknown;
  }
}

function singleImagePrompt(imageIndex: number, total: number): string {
  return `SOXAIスクリーンショットです（${total}枚中 ${imageIndex + 1}枚目。この1枚だけを解析）。

画面内に表示されている数値・スコア・割合・時刻・ラベル付きの値を一つ残らず JSON で返してください。
画面上部だけでなく画面全体を対象にしてください。

必須で拾う例（画面にあれば）:
- QoL（現在）
- 昨日のQoL
- 体調スコア
- 睡眠スコア
- 心拍数 / 安静時心拍数
- 睡眠時間 / 入眠時間 / 起床時間
- 睡眠効率 / 睡眠負債 / 入眠潜時 / 体内時計
- 覚醒時間 / 覚醒率
- レム睡眠 / レム睡眠率 / 浅い睡眠 / 浅い睡眠率 / 深い睡眠 / 深い睡眠率
- 呼吸速度 / SpO₂ / HRV / 皮膚温度 / ストレス
- その他画面内のすべての数値

出力例:
{
  "visibleReadings": [
    { "label": "睡眠スコア", "value": "78" },
    { "label": "心拍数", "value": "58" }
  ]
}

推測禁止。この1枚に見えるものだけ。他画像の値は想像しない。metrics キーへの変換は不要。`;
}

function sparseRetryPrompt(count: number): string {
  return `前回の読み取りが不足しています（${count}件）。同じ1枚の画像を再スキャンしてください。

画面全体（上・中・下、カード、ゲージ、円、小さな文字）を見て、
ラベルと値のペアを一つ残らず visibleReadings に入れてください。
QoL / 昨日のQoL / 体調スコア / 睡眠スコア / 心拍数 など、見えるものは必ず含めてください。
すでに読めたものも再掲し、見落としを追加してください。
推測は禁止。見える値のみ。`;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
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

    const runVisionOnImage = async (
      imageUrl: string,
      userText: string,
    ): Promise<VisibleReading[]> => {
      const response = await client.responses.create({
        model: "gpt-4o",
        instructions: SOXAI_EXTRACT_INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: userText },
              {
                type: "input_image" as const,
                image_url: imageUrl,
                detail: "high" as const,
              },
            ],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "soxai_visible_readings",
            strict: true,
            schema: extractSchema,
          },
        },
      });

      const outputText = response.output_text?.trim();
      if (!outputText) {
        throw new Error("OpenAI response.output_text was empty.");
      }

      const parsed = parseExtractJson(outputText);
      return normalizeVisibleReadings(
        parsed &&
          typeof parsed === "object" &&
          "visibleReadings" in parsed
          ? (parsed as { visibleReadings: unknown }).visibleReadings
          : Array.isArray(parsed)
            ? parsed
            : [],
      );
    };

    const ocrOneImage = async (
      imageUrl: string,
      imageIndex: number,
    ): Promise<{
      imageIndex: number;
      readings: VisibleReading[];
      metrics: ReturnType<
        typeof mapVisibleReadingsToMetricsDetailed
      >["metrics"];
      provenance: ReturnType<
        typeof mapVisibleReadingsToMetricsDetailed
      >["provenance"];
      error?: string;
    }> => {
      let readings: VisibleReading[] = [];
      try {
        readings = await runVisionOnImage(
          imageUrl,
          singleImagePrompt(imageIndex, images.length),
        );

        // 1枚あたり極端に少ない場合のみリトライ（ホーム画面でも通常数件ある）
        if (readings.length < 2) {
          console.warn("[api/extract] sparse readings on image, retrying", {
            imageIndex,
            count: readings.length,
          });
          try {
            const retry = await runVisionOnImage(
              imageUrl,
              sparseRetryPrompt(readings.length),
            );
            if (retry.length > readings.length) {
              readings = retry;
            }
          } catch (retryError) {
            console.warn(
              "[api/extract] per-image retry failed",
              { imageIndex },
              retryError,
            );
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        console.error("[api/extract] per-image OCR failed", {
          imageIndex,
          message,
        });
        const empty = mapVisibleReadingsToMetricsDetailed([]);
        return {
          imageIndex,
          readings: [],
          metrics: empty.metrics,
          provenance: empty.provenance,
          error: message,
        };
      }

      const mapped = mapVisibleReadingsToMetricsDetailed(readings);
      console.info("[api/extract] per-image OCR complete", {
        imageIndex,
        visibleCount: readings.length,
        labels: readings.map((r) => r.label),
        collected: collectedMetricKeys(mapped.metrics),
        provenance: mapped.provenance,
      });

      return {
        imageIndex,
        readings,
        metrics: mapped.metrics,
        provenance: mapped.provenance,
      };
    };

    const perImage = await mapPool(
      images,
      OCR_CONCURRENCY,
      (imageUrl, index) => ocrOneImage(imageUrl, index),
    );

    const failedCount = perImage.filter((item) => item.error).length;
    const allReadings = perImage.flatMap((item) => item.readings);
    const extractResults: ImageExtractResult[] = perImage.map((item) => ({
      imageIndex: item.imageIndex,
      metrics: item.metrics,
      visibleReadingCount: item.readings.length,
      readings: item.readings,
      provenance: item.provenance,
    }));

    const { metrics, conflicts } = mergeImageExtractResults(extractResults);
    const keys = collectedMetricKeys(metrics);

    console.info("[api/extract] merge complete", {
      imageCount: images.length,
      failedCount,
      perImageCounts: perImage.map((item) => ({
        imageIndex: item.imageIndex,
        readings: item.readings.length,
        collected: collectedMetricKeys(item.metrics).length,
        error: item.error ?? null,
      })),
      collected: keys.length,
      keys,
      visibleReadingCount: allReadings.length,
      conflicts: conflicts.length,
      mappedSample: {
        sleepScore: metrics.sleepScore,
        qol: metrics.qol,
        yesterdayQol: metrics.yesterdayQol,
        conditionScore: metrics.conditionScore,
        restingHeartRate: metrics.restingHeartRate,
      },
    });

    // 全画像が失敗、または何も読めなかった場合
    if (allReadings.length === 0) {
      const allFailed = failedCount === images.length;
      return NextResponse.json(
        {
          error: allFailed
            ? "すべての画像の解析に失敗しました。しばらくしてから再度お試しください。"
            : "画像から数値を読み取れませんでした。鮮明なSOXAIスクリーンショット（JPG / JPEG / PNG / WEBP）をアップロードしてください。",
          errorType: allFailed ? "OpenAI Error" : "Empty Extraction",
          details: isDev
            ? JSON.stringify(
                perImage.map((item) => ({
                  imageIndex: item.imageIndex,
                  error: item.error ?? null,
                  readings: item.readings.length,
                })),
              )
            : undefined,
        },
        { status: allFailed ? 500 : 422 },
      );
    }

    return NextResponse.json({
      metrics,
      visibleReadings: allReadings,
      conflicts,
      collectedCount: keys.length,
      visibleCount: allReadings.length,
      imageCount: images.length,
      perImage: perImage.map((item) => ({
        imageIndex: item.imageIndex,
        visibleCount: item.readings.length,
        collectedCount: collectedMetricKeys(item.metrics).length,
        error: item.error ?? null,
      })),
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
