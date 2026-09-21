/**
 * 共有: SOXAI Vision 一括抽出 + heart_hrv 専用パス（並行）+ 重要項目リトライ。
 * API ルートと検証スクリプトから使う（画像・個人名はログしない）。
 *
 * heart_hrv 専用パスは切り取りをせず、スロット内の全画像をそのまま渡す。
 * 専用が失敗・空のときは一括値を残す（空で上書きしない）。
 */

import type OpenAI from "openai";
import { tokensFromUsage } from "@/lib/openai-usage";
import type { SoxaiExtractSection } from "@/lib/soxai-ocr-runner";
import {
  buildHeartHrvVisionPrompt,
  buildSoxaiVisionTelemetry,
  buildVisionPrompt,
  emptyBulkRetryVisionKeys,
  mergeVisionPreferFilled,
  retryFilledBulkKeys,
  type HeartHrvDedicatedStatus,
  type SoxaiVisionCriticalKey,
  type SoxaiVisionImageSizeTelemetry,
  type SoxaiVisionTelemetry,
} from "@/lib/soxai-vision-extract";
import {
  emptySoxaiVision24,
  guardHeartHrvAvgMinMax,
  guardQolAgainstHomeScoreCrossFill,
  mapVision24ToAnalysisMetrics,
  normalizeSoxaiVision24,
  SOXAI_VISION_HEART_HRV_KEYS,
  soxaiVision24JsonSchema,
  soxaiVisionHeartHrvJsonSchema,
  type SoxaiVision24,
} from "@/lib/soxai-vision-schema";
import { normalizeMetricsForDisplay } from "@/lib/soxai-display-normalize";
import type { AnalysisMetrics } from "@/lib/soxai-metrics";

export const SOXAI_VISION_MODEL = "gpt-4o" as const;
export const SOXAI_VISION_TEMPERATURE = 0;

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

function addUsage(
  a: ReturnType<typeof tokensFromUsage>,
  b: ReturnType<typeof tokensFromUsage>,
): ReturnType<typeof tokensFromUsage> {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
  };
}

function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  if (typeof value !== "string") return true;
  return value.trim().length === 0;
}

function parseNumeric(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n =
    typeof value === "number"
      ? value
      : Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function clearHeartHrvFields(vision: SoxaiVision24): SoxaiVision24 {
  const next = { ...vision };
  for (const key of SOXAI_VISION_HEART_HRV_KEYS) {
    next[key] = null;
  }
  return next;
}

/**
 * 一括の安静時心拍 Avg を残してよいか。
 * 「平均」ラベル付き枠は Min と同居するのが SOXAI の通常 UI。
 * Min が無い Avg は概要の unlabeled 数値の可能性が高い → 要確認。
 */
export function bulkRestingAvgLooksLabeled(bulk: SoxaiVision24): boolean {
  if (isBlank(bulk.restingHeartRateAvg)) return false;
  if (isBlank(bulk.restingHeartRateMin)) return false;
  const avgN = parseNumeric(bulk.restingHeartRateAvg);
  const minN = parseNumeric(bulk.restingHeartRateMin);
  if (avgN == null || minN == null) return false;
  if (avgN === minN) return false;
  return true;
}

/**
 * 専用の非空を優先。専用が空・失敗したキーは一括を残す。
 * 一括の restingHeartRateAvg は「平均」同居の手がかりがあるときだけ残す。
 */
export function mergeHeartHrvPreferDedicatedKeepBulk(params: {
  bulk: SoxaiVision24;
  dedicated: Partial<
    Pick<SoxaiVision24, (typeof SOXAI_VISION_HEART_HRV_KEYS)[number]>
  > | null;
  dedicatedOk: boolean;
}): SoxaiVision24 {
  const { bulk, dedicated, dedicatedOk } = params;
  const next = { ...bulk };

  for (const key of SOXAI_VISION_HEART_HRV_KEYS) {
    const fromDedicated =
      dedicatedOk && dedicated && !isBlank(dedicated[key])
        ? dedicated[key]
        : null;

    if (fromDedicated != null) {
      next[key] = fromDedicated;
      continue;
    }

    // 専用が空／失敗 → 一括を残す（空で上書きしない）
    if (key === "restingHeartRateAvg") {
      next[key] = bulkRestingAvgLooksLabeled(bulk)
        ? bulk.restingHeartRateAvg
        : null;
    } else {
      next[key] = isBlank(bulk[key]) ? null : bulk[key];
    }
  }

  return next;
}

function classifyDedicatedError(error: unknown): {
  status: HeartHrvDedicatedStatus;
  message: string;
} {
  const message = error instanceof Error ? error.message : String(error);
  if (/timeout|timed out|ETIMEDOUT|abort/i.test(message)) {
    return { status: "timeout", message };
  }
  return { status: "error", message };
}

function dedicatedHasAnyValue(
  heart: Pick<SoxaiVision24, (typeof SOXAI_VISION_HEART_HRV_KEYS)[number]>,
): boolean {
  return SOXAI_VISION_HEART_HRV_KEYS.some((key) => !isBlank(heart[key]));
}

export async function callSoxaiVisionOnce(params: {
  client: OpenAI;
  images: string[];
  sections: Array<SoxaiExtractSection | "">;
}): Promise<{
  vision: SoxaiVision24;
  usage: ReturnType<typeof tokensFromUsage>;
}> {
  const { client, images, sections } = params;
  const content = [
    {
      type: "input_text" as const,
      text: buildVisionPrompt(images.length, sections),
    },
    ...images.map((url) => ({
      type: "input_image" as const,
      image_url: url,
      detail: "high" as const,
    })),
  ];

  const response = await client.responses.create({
    model: SOXAI_VISION_MODEL,
    temperature: SOXAI_VISION_TEMPERATURE,
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
    console.error("[soxai-vision-run] JSON parse failed", parseError, {
      preview: outputText.slice(0, 400),
    });
    throw new Error("Vision JSON の解析に失敗しました。");
  }

  return {
    vision,
    usage: tokensFromUsage(response.usage),
  };
}

async function callHeartHrvVisionOnce(params: {
  client: OpenAI;
  images: string[];
}): Promise<{
  heart: Pick<SoxaiVision24, (typeof SOXAI_VISION_HEART_HRV_KEYS)[number]>;
  usage: ReturnType<typeof tokensFromUsage>;
}> {
  const { client, images } = params;
  const content = [
    {
      type: "input_text" as const,
      text: buildHeartHrvVisionPrompt(images.length),
    },
    ...images.map((url) => ({
      type: "input_image" as const,
      image_url: url,
      detail: "high" as const,
    })),
  ];

  const response = await client.responses.create({
    model: SOXAI_VISION_MODEL,
    temperature: SOXAI_VISION_TEMPERATURE,
    input: [
      {
        role: "user",
        content,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "soxai_vision_heart_hrv",
        strict: true,
        schema: soxaiVisionHeartHrvJsonSchema as unknown as Record<
          string,
          unknown
        >,
      },
    },
  });

  const outputText = response.output_text?.trim() ?? "";
  if (!outputText) {
    throw new Error("Heart/HRV Vision response.output_text was empty.");
  }

  let parsed: SoxaiVision24 = emptySoxaiVision24();
  try {
    parsed = normalizeSoxaiVision24(parseJsonObject(outputText));
  } catch (parseError) {
    console.error("[soxai-vision-run] heart_hrv JSON parse failed", parseError, {
      preview: outputText.slice(0, 400),
    });
    throw new Error("Heart/HRV Vision JSON の解析に失敗しました。");
  }

  const heart = {} as Pick<
    SoxaiVision24,
    (typeof SOXAI_VISION_HEART_HRV_KEYS)[number]
  >;
  for (const key of SOXAI_VISION_HEART_HRV_KEYS) {
    heart[key] = parsed[key];
  }
  return { heart, usage: tokensFromUsage(response.usage) };
}

export type SoxaiVisionRunResult = {
  vision: SoxaiVision24;
  metrics: AnalysisMetrics;
  telemetry: SoxaiVisionTelemetry;
  usage: ReturnType<typeof tokensFromUsage>;
  retried: boolean;
};

/**
 * 1) 一括 Vision と heart_hrv 専用パスを並行実行
 * 2) sleep 系が空なら一括だけ 1 回リトライ
 * 3) 専用の非空で心拍系を置換。専用失敗・空なら一括を残す（RHR Avg は平均同居の手がかり必須）
 * 4) heart_hrv 画像が無い場合は心拍系を要確認（null）
 */
export async function runSoxaiVisionExtract(params: {
  client: OpenAI;
  images: string[];
  sections: Array<SoxaiExtractSection | "">;
  imageSizes?: SoxaiVisionImageSizeTelemetry[];
}): Promise<SoxaiVisionRunResult> {
  const { client, images, sections, imageSizes } = params;
  const startedAt = Date.now();

  const heartIndexes = images
    .map((_, index) => index)
    .filter((index) => sections[index] === "heart_hrv");
  const heartImages = heartIndexes.map((index) => images[index]);

  type DedicatedOutcome =
    | {
        kind: "ok";
        heart: Pick<
          SoxaiVision24,
          (typeof SOXAI_VISION_HEART_HRV_KEYS)[number]
        >;
        usage: ReturnType<typeof tokensFromUsage>;
        durationMs: number;
      }
    | {
        kind: "fail";
        status: HeartHrvDedicatedStatus;
        message: string;
        durationMs: number;
      }
    | { kind: "skipped" };

  const bulkStarted = Date.now();
  const bulkPromise = callSoxaiVisionOnce({ client, images, sections }).then(
    (result) => ({
      ...result,
      durationMs: Date.now() - bulkStarted,
    }),
  );

  const dedicatedPromise: Promise<DedicatedOutcome> =
    heartImages.length === 0
      ? Promise.resolve({ kind: "skipped" as const })
      : (async (): Promise<DedicatedOutcome> => {
          const t0 = Date.now();
          try {
            const result = await callHeartHrvVisionOnce({
              client,
              images: heartImages,
            });
            return {
              kind: "ok",
              heart: result.heart,
              usage: result.usage,
              durationMs: Date.now() - t0,
            };
          } catch (error) {
            const classified = classifyDedicatedError(error);
            console.error("[soxai-vision-run] heart_hrv dedicated failed", {
              status: classified.status,
              message: classified.message,
              durationMs: Date.now() - t0,
              heartHrvImageCount: heartImages.length,
            });
            return {
              kind: "fail",
              status: classified.status,
              message: classified.message,
              durationMs: Date.now() - t0,
            };
          }
        })();

  const [bulkFirst, dedicatedOutcome] = await Promise.all([
    bulkPromise,
    dedicatedPromise,
  ]);

  let vision = bulkFirst.vision;
  let usage = bulkFirst.usage;
  let bulkDurationMs = bulkFirst.durationMs;
  let retried = false;
  const filledByRetry: SoxaiVisionCriticalKey[] = [];

  if (emptyBulkRetryVisionKeys(vision).length > 0) {
    retried = true;
    const retryStarted = Date.now();
    const second = await callSoxaiVisionOnce({ client, images, sections });
    bulkDurationMs += Date.now() - retryStarted;
    for (const key of retryFilledBulkKeys(vision, second.vision)) {
      filledByRetry.push(key);
    }
    vision = mergeVisionPreferFilled(vision, second.vision);
    usage = addUsage(usage, second.usage);
  }

  let heartHrvDedicatedPass = false;
  let heartHrvDedicatedStatus: HeartHrvDedicatedStatus = "skipped";
  let heartHrvDedicatedError: string | null = null;
  let heartHrvDedicatedDurationMs: number | null = null;

  if (heartImages.length === 0) {
    vision = clearHeartHrvFields(vision);
    heartHrvDedicatedStatus = "skipped";
  } else if (dedicatedOutcome.kind === "ok") {
    heartHrvDedicatedPass = true;
    heartHrvDedicatedDurationMs = dedicatedOutcome.durationMs;
    usage = addUsage(usage, dedicatedOutcome.usage);
    if (dedicatedHasAnyValue(dedicatedOutcome.heart)) {
      heartHrvDedicatedStatus = "success";
      vision = mergeHeartHrvPreferDedicatedKeepBulk({
        bulk: vision,
        dedicated: dedicatedOutcome.heart,
        dedicatedOk: true,
      });
    } else {
      heartHrvDedicatedStatus = "empty";
      vision = mergeHeartHrvPreferDedicatedKeepBulk({
        bulk: vision,
        dedicated: dedicatedOutcome.heart,
        dedicatedOk: false,
      });
    }
  } else if (dedicatedOutcome.kind === "fail") {
    heartHrvDedicatedPass = true;
    heartHrvDedicatedStatus = dedicatedOutcome.status;
    heartHrvDedicatedError = dedicatedOutcome.message;
    heartHrvDedicatedDurationMs = dedicatedOutcome.durationMs;
    vision = mergeHeartHrvPreferDedicatedKeepBulk({
      bulk: vision,
      dedicated: null,
      dedicatedOk: false,
    });
  }

  const qolGuard = guardQolAgainstHomeScoreCrossFill(vision);
  vision = qolGuard.vision;
  const heartGuard = guardHeartHrvAvgMinMax(vision);
  vision = heartGuard.vision;
  if (heartGuard.restingCleared || heartGuard.hrvCleared) {
    console.info("[soxai-vision-run] avg/min/max guard", {
      restingCleared: heartGuard.restingCleared,
      hrvCleared: heartGuard.hrvCleared,
    });
  }

  const metrics = normalizeMetricsForDisplay(
    mapVision24ToAnalysisMetrics(vision),
  );
  const telemetry = buildSoxaiVisionTelemetry({
    imageCount: images.length,
    sections,
    vision,
    retried,
    retryFilledKeys: filledByRetry,
    heartHrvDedicatedPass,
    heartHrvImageCount: heartImages.length,
    heartHrvDedicatedStatus,
    heartHrvDedicatedError,
    heartHrvDedicatedDurationMs,
    bulkDurationMs,
    totalDurationMs: Date.now() - startedAt,
    imageSizes: imageSizes ?? [],
  });

  return { vision, metrics, telemetry, usage, retried };
}
