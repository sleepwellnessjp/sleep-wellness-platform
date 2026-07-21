import OpenAI from "openai";
import { NextResponse } from "next/server";
import {
  isImageDataUrl,
  normalizeImageDataUrl,
  openaiErrorMessage,
  graphReadingItemSchema,
  SOXAI_EXTRACT_INSTRUCTIONS,
} from "@/lib/openai-helpers";
import {
  mergeImageExtractResults,
  type ImageExtractResult,
} from "@/lib/soxai-merge";
import {
  enrichMetricsFromGraphs,
  mergeGraphBundles,
  normalizeGraphReadings,
  graphPanelCount,
} from "@/lib/soxai-graphs";
import {
  mapVisibleReadingsToMetricsDetailed,
  normalizeVisibleReadings,
  type VisibleReading,
} from "@/lib/soxai-reading-map";
import { collectedMetricKeys, isMetricPresent } from "@/lib/soxai-metrics";
import { normalizeOcrMetrics } from "@/lib/soxai-structured-metrics";
import {
  inferScreenTypeFromReadings,
  isCriticalOcrKey,
  normalizeScreenType,
  screenCriticalLabels,
  SCREEN_PRIMARY_METRICS,
  type SoxaiScreenType,
} from "@/lib/soxai-screen";

export const runtime = "nodejs";
export const maxDuration = 300;

const isDev = process.env.NODE_ENV === "development";
const MAX_IMAGES = 10;
/** 並列OCR数（2〜10枚でもレート制限を抑えつつ進める） */
const OCR_CONCURRENCY = 3;

/** Vision には screenType + visibleReadings + graphReadings を返させる */
const extractSchema = {
  type: "object",
  additionalProperties: false,
  required: ["screenType", "visibleReadings", "graphReadings"],
  properties: {
    screenType: {
      type: "string",
      enum: [
        "sleep_overview",
        "sleep_stages",
        "sleep_detail",
        "bed_wake",
        "circadian",
        "stress",
        "respiration",
        "rhr",
        "hrv",
        "skin_temp",
        "home",
        "other",
      ],
    },
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
    graphReadings: {
      type: "array",
      items: graphReadingItemSchema,
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

手順:
1) screenType を判定する
2) その画面種別に対応する項目だけを重点的に読む
3) visibleReadings / graphReadings を返す

画面全体（上・中・下、カード、円、ゲージ、小さな注釈）を対象にしてください。

【画面 → 取得項目】
- home: QoL / 昨日のスコア / 睡眠 / 体調 / 心拍数
- sleep_detail / bed_wake: 入眠時間・起床時間（HH:mm）/ 睡眠時間 / 効率 / 負債 / 潜時
- sleep_stages: 覚醒・レム・浅い・深い（時間と%）/ SpO₂ ※端点時刻を入眠・起床にしない
- skin_temp: 皮膚温度 / 皮膚温 / 平均 / 偏差（+0.2℃ や単位なし +0.2 も）
- stress: ストレス / 平均ストレス / ストレスレベル
- rhr / hrv / respiration / circadian: 各画面の平均・代表値

【最優先・見逃し禁止】
- 入眠時間 ≠ 入眠潜時 ≠ 就床
- 起床時間 ≠ 覚醒時間 ≠ 中途覚醒
- 皮膚温度（絶対値または ±差分）
- ストレス（明示数値のみ。平均の捏造禁止）

ラベルは画面表記どおり。推測禁止。この1枚に見えるものだけ。`;
}

function criticalFieldsRetryPrompt(screenType: SoxaiScreenType): string {
  const focus = screenCriticalLabels(screenType);
  return `同じ1枚を再スキャンしてください。screenType は「${screenType}」です。

この画面で特に探す項目: ${focus}

共通の4重点（画面にあれば必ず返す）:
1. 入眠時間（入眠 / 入眠時間 / 睡眠開始）→ HH:mm。潜時・就床と混同しない
2. 起床時間（起床 / 起床時間 / 睡眠終了）→ HH:mm。覚醒時間と混同しない
3. 皮膚温度（皮膚温度 / 皮膚温 / 平均 / 偏差）→ 絶対値または ±差分。単位なし +0.2 も可
4. ストレス（ストレス / 平均ストレス / ストレスレベル）→ 明示数値のみ

見つかったものは visibleReadings に再掲し、見落としを追加してください。
screenType も再判定してください。`;
}

function screenSpecificRetryPrompt(screenType: SoxaiScreenType): string {
  const keys = SCREEN_PRIMARY_METRICS[screenType];
  const focus = screenCriticalLabels(screenType);
  return `screenType「${screenType}」の一次項目が不足しています。
同じ1枚を再スキャンし、次を必ず探してください: ${focus}

一次項目キー: ${keys.join(", ") || "(general)"}
推測禁止。見える値のみ visibleReadings に追加。`;
}

function sparseRetryPrompt(count: number): string {
  return `前回の読み取りが不足しています（${count}件）。同じ1枚の画像を徹底再スキャンしてください。

画面全体（上・中・下、カード、ゲージ、円、バー、折れ線グラフ、hypnogram、小さな文字）を見て、
ラベルと値のペアを visibleReadings に、グラフの形状を graphReadings に入れてください。
ホームなら QoL / 昨日のスコア / 睡眠 / 体調 / 心拍数 は特に必須です。
詳細なら 睡眠時間・効率・負債・潜時・体内時計・入眠・起床 を必須です。
ステージなら hypnogram segments（REM/浅い/深い/覚醒）と SpO₂ を必須です。
バイタルなら 折れ線 points + 平均/最小/最大 annotations を必須です。
すでに読めたものも再掲し、見落としを追加してください。
推測は禁止。見える値のみ。`;
}

function graphRetryPrompt(): string {
  return `この画像には睡眠グラフ（折れ線・hypnogram・タイムライン）が含まれています。
visibleReadings に加え、graphReadings を必ず返してください。

- 睡眠ステージ → panel: "stages", segments に awake/rem/light/deep の帯
- ストレス → panel: "stress", points に夜間推移（8点以上）
- 体内時計 → panel: "circadian", points に位相曲線
- 呼吸 → panel: "respiration", points に呼吸速度/SpO₂（series で区別）
- 安静時心拍 → panel: "rhr", points + annotations（平均/最小/最大）
- HRV → panel: "hrv", points + annotations
- 皮膚温度 → panel: "skin-temp", points

目盛りに沿った x（時刻）と y（数値）を読み取り、推測で補完しない。`;
}

function looksLikeGraphScreen(readings: VisibleReading[]): boolean {
  const joined = readings
    .map((r) => r.label)
    .join("|")
    .toLowerCase();
  return (
    /睡眠ステージ|レム睡眠|浅い睡眠|深い睡眠|ストレス|体内時計|呼吸|心拍変動|hrv|皮膚温|hypnogram|ステージ/.test(
      joined,
    ) ||
    readings.some((r) =>
      /平均|最小|最大|avg|min|max/.test(r.label.toLowerCase()),
    )
  );
}

function CRITICAL_KEYS_MISSING(
  metrics: ReturnType<typeof mapVisibleReadingsToMetricsDetailed>["metrics"],
): string[] {
  const keys = ["bedtime", "wakeTime", "skinTemperature", "stress"] as const;
  return keys.filter((key) => !isMetricPresent(metrics, key));
}

function primaryKeysMissing(
  screenType: SoxaiScreenType,
  metrics: ReturnType<typeof mapVisibleReadingsToMetricsDetailed>["metrics"],
): string[] {
  return SCREEN_PRIMARY_METRICS[screenType].filter(
    (key) => !isMetricPresent(metrics, key),
  );
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
    ): Promise<{
      screenType: SoxaiScreenType;
      readings: VisibleReading[];
      graphReadings: ReturnType<typeof normalizeGraphReadings>;
    }> => {
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
      const record =
        parsed && typeof parsed === "object"
          ? (parsed as {
              screenType?: unknown;
              visibleReadings?: unknown;
              graphReadings?: unknown;
            })
          : {};

      const readings = normalizeVisibleReadings(
        "visibleReadings" in record
          ? record.visibleReadings
          : Array.isArray(parsed)
            ? parsed
            : [],
      );
      const graphReadings = normalizeGraphReadings(record.graphReadings);
      const screenType =
        normalizeScreenType(record.screenType) !== "other"
          ? normalizeScreenType(record.screenType)
          : inferScreenTypeFromReadings(readings);

      return { screenType, readings, graphReadings };
    };

    const ocrOneImage = async (
      imageUrl: string,
      imageIndex: number,
    ): Promise<{
      imageIndex: number;
      screenType: SoxaiScreenType;
      readings: VisibleReading[];
      graphReadings: ReturnType<typeof normalizeGraphReadings>;
      metrics: ReturnType<
        typeof mapVisibleReadingsToMetricsDetailed
      >["metrics"];
      provenance: ReturnType<
        typeof mapVisibleReadingsToMetricsDetailed
      >["provenance"];
      error?: string;
    }> => {
      let readings: VisibleReading[] = [];
      let graphReadings: ReturnType<typeof normalizeGraphReadings> = [];
      let screenType: SoxaiScreenType = "other";
      try {
        const first = await runVisionOnImage(
          imageUrl,
          singleImagePrompt(imageIndex, images.length),
        );
        readings = first.readings;
        screenType = first.screenType;
        graphReadings = first.graphReadings.map((g) => ({
          ...g,
          sourceImageIndex: imageIndex,
        }));

        const mappedOnce = mapVisibleReadingsToMetricsDetailed(readings, {
          screenType,
        });
        const mappedKeyCount = collectedMetricKeys(mappedOnce.metrics).length;
        const missingCritical = CRITICAL_KEYS_MISSING(mappedOnce.metrics);

        const needsRetry = readings.length < 4 || mappedKeyCount === 0;
        if (needsRetry) {
          console.warn("[api/extract] sparse readings on image, retrying", {
            imageIndex,
            count: readings.length,
            mappedKeyCount,
            screenType,
          });
          try {
            const retry = await runVisionOnImage(
              imageUrl,
              sparseRetryPrompt(readings.length),
            );
            if (
              retry.readings.length > readings.length ||
              collectedMetricKeys(
                mapVisibleReadingsToMetricsDetailed(retry.readings, {
                  screenType: retry.screenType,
                }).metrics,
              ).length > mappedKeyCount
            ) {
              readings = retry.readings;
              screenType = retry.screenType;
            }
            if (retry.graphReadings.length > graphReadings.length) {
              graphReadings = retry.graphReadings.map((g) => ({
                ...g,
                sourceImageIndex: imageIndex,
              }));
            }
          } catch (retryError) {
            console.warn(
              "[api/extract] per-image retry failed",
              { imageIndex },
              retryError,
            );
          }
        }

        // 画面種別の一次項目が欠けている場合は画面専用再スキャン
        let afterSparse = mapVisibleReadingsToMetricsDetailed(readings, {
          screenType,
        });
        const missingPrimary = primaryKeysMissing(
          screenType,
          afterSparse.metrics,
        );
        if (
          missingPrimary.length > 0 &&
          screenType !== "other" &&
          SCREEN_PRIMARY_METRICS[screenType].length > 0
        ) {
          try {
            const screenRetry = await runVisionOnImage(
              imageUrl,
              screenSpecificRetryPrompt(screenType),
            );
            const mergedReadings = [...readings];
            for (const reading of screenRetry.readings) {
              const dedupe = `${reading.label}::${reading.value}`;
              if (
                !mergedReadings.some(
                  (r) => `${r.label}::${r.value}` === dedupe,
                )
              ) {
                mergedReadings.push(reading);
              }
            }
            const remapped = mapVisibleReadingsToMetricsDetailed(
              mergedReadings,
              { screenType: screenRetry.screenType || screenType },
            );
            if (
              collectedMetricKeys(remapped.metrics).length >
                collectedMetricKeys(afterSparse.metrics).length ||
              screenRetry.readings.length > readings.length
            ) {
              readings = mergedReadings;
              if (screenRetry.screenType !== "other") {
                screenType = screenRetry.screenType;
              }
              afterSparse = remapped;
            }
            if (screenRetry.graphReadings.length > graphReadings.length) {
              graphReadings = screenRetry.graphReadings.map((g) => ({
                ...g,
                sourceImageIndex: imageIndex,
              }));
            }
          } catch (screenError) {
            console.warn(
              "[api/extract] screen-specific retry failed",
              { imageIndex, screenType, missingPrimary },
              screenError,
            );
          }
        }

        // 4重点項目が欠けている場合は専用再スキャン
        afterSparse = mapVisibleReadingsToMetricsDetailed(readings, {
          screenType,
        });
        if (CRITICAL_KEYS_MISSING(afterSparse.metrics).length > 0) {
          try {
            const criticalRetry = await runVisionOnImage(
              imageUrl,
              criticalFieldsRetryPrompt(screenType),
            );
            const beforeKeys = new Set(
              collectedMetricKeys(afterSparse.metrics),
            );
            const mergedReadings = [...readings];
            for (const reading of criticalRetry.readings) {
              const dedupe = `${reading.label}::${reading.value}`;
              if (
                !mergedReadings.some(
                  (r) => `${r.label}::${r.value}` === dedupe,
                )
              ) {
                mergedReadings.push(reading);
              }
            }
            const remapped = mapVisibleReadingsToMetricsDetailed(
              mergedReadings,
              { screenType: criticalRetry.screenType || screenType },
            );
            const gained = collectedMetricKeys(remapped.metrics).filter(
              (k) => !beforeKeys.has(k) && isCriticalOcrKey(k),
            );
            if (
              gained.length > 0 ||
              criticalRetry.readings.length > readings.length
            ) {
              readings = mergedReadings;
              if (criticalRetry.screenType !== "other") {
                screenType = criticalRetry.screenType;
              }
            }
            if (criticalRetry.graphReadings.length > graphReadings.length) {
              graphReadings = criticalRetry.graphReadings.map((g) => ({
                ...g,
                sourceImageIndex: imageIndex,
              }));
            }
          } catch (criticalError) {
            console.warn(
              "[api/extract] critical-fields retry failed",
              { imageIndex, missing: missingCritical },
              criticalError,
            );
          }
        }

        // グラフ画面なのに graphReadings が空 → グラフ専用再スキャン
        if (
          graphReadings.length === 0 &&
          looksLikeGraphScreen(readings)
        ) {
          try {
            const graphRetry = await runVisionOnImage(
              imageUrl,
              graphRetryPrompt(),
            );
            if (graphRetry.graphReadings.length > 0) {
              graphReadings = graphRetry.graphReadings.map((g) => ({
                ...g,
                sourceImageIndex: imageIndex,
              }));
            }
            if (graphRetry.readings.length > readings.length) {
              readings = graphRetry.readings;
            }
            if (graphRetry.screenType !== "other") {
              screenType = graphRetry.screenType;
            }
          } catch (graphError) {
            console.warn(
              "[api/extract] graph retry failed",
              { imageIndex },
              graphError,
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
          screenType: "other",
          readings: [],
          graphReadings: [],
          metrics: empty.metrics,
          provenance: empty.provenance,
          error: message,
        };
      }

      if (screenType === "other") {
        screenType = inferScreenTypeFromReadings(readings);
      }

      const mapped = mapVisibleReadingsToMetricsDetailed(readings, {
        screenType,
      });
      console.info("[api/extract] per-image OCR complete", {
        imageIndex,
        screenType,
        visibleCount: readings.length,
        graphPanelCount: graphReadings.length,
        graphPanels: graphReadings.map((g) => g.id),
        labels: readings.map((r) => r.label),
        collected: collectedMetricKeys(mapped.metrics),
        critical: {
          bedtime: mapped.metrics.bedtime,
          wakeTime: mapped.metrics.wakeTime,
          skinTemperature: mapped.metrics.skinTemperature,
          stress: mapped.metrics.stress,
        },
        provenance: mapped.provenance,
      });

      return {
        imageIndex,
        screenType,
        readings,
        graphReadings,
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
      screenType: item.screenType,
    }));

    const { metrics: mergedRaw, conflicts, confidence } =
      mergeImageExtractResults(extractResults);
    const graphBundle = mergeGraphBundles(
      perImage.map((item) => ({
        imageIndex: item.imageIndex,
        panels: item.graphReadings,
      })),
    );
    const metrics = normalizeOcrMetrics(
      enrichMetricsFromGraphs(mergedRaw, graphBundle),
      graphBundle,
    );
    const keys = collectedMetricKeys(metrics);
    const graphPanels = graphPanelCount(graphBundle);

    console.info("[api/extract] merge complete", {
      imageCount: images.length,
      failedCount,
      perImageCounts: perImage.map((item) => ({
        imageIndex: item.imageIndex,
        screenType: item.screenType,
        readings: item.readings.length,
        graphPanels: item.graphReadings.map((g) => g.id),
        collected: collectedMetricKeys(item.metrics).length,
        error: item.error ?? null,
      })),
      collected: keys.length,
      keys,
      graphPanels,
      visibleReadingCount: allReadings.length,
      conflicts: conflicts.length,
      critical: {
        bedtime: metrics.bedtime,
        wakeTime: metrics.wakeTime,
        skinTemperature: metrics.skinTemperature,
        stress: metrics.stress,
        confidence: {
          bedtime: confidence.bedtime ?? null,
          wakeTime: confidence.wakeTime ?? null,
          skinTemperature: confidence.skinTemperature ?? null,
          stress: confidence.stress ?? null,
        },
      },
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
      graphs: graphBundle,
      visibleReadings: allReadings,
      conflicts,
      confidence,
      collectedCount: keys.length,
      graphPanelCount: graphPanels,
      visibleCount: allReadings.length,
      imageCount: images.length,
      perImage: perImage.map((item) => ({
        imageIndex: item.imageIndex,
        screenType: item.screenType,
        visibleCount: item.readings.length,
        graphPanels: item.graphReadings.map((g) => g.id),
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
