/**
 * 共有: SOXAI Vision 一括抽出 + heart_hrv 専用パス + 重要項目リトライ。
 * API ルートと検証スクリプトから使う（画像・個人名はログしない）。
 */

import type OpenAI from "openai";
import sharp from "sharp";
import { tokensFromUsage } from "@/lib/openai-usage";
import type { SoxaiExtractSection } from "@/lib/soxai-ocr-runner";
import {
  buildHeartHrvVisionPrompt,
  buildSoxaiVisionTelemetry,
  buildVisionPrompt,
  emptyBulkRetryVisionKeys,
  mergeVisionFillBlanksOnly,
  mergeVisionPreferFilled,
  retryFilledBulkKeys,
  type SoxaiVisionCriticalKey,
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

/** heart_hrv 専用: ラベル付き数値帯の切り出し（開始比・終了比、高さに対する比） */
const HEART_HRV_CROP_WINDOWS: ReadonlyArray<{ top: number; bottom: number }> = [
  // 安静時: 「最小」「平均51」枠（グラフ本体より上）。準備後 1024px でもこの帯が数値を含む
  { top: 0.25, bottom: 0.62 },
  // 心拍変動: 画面上部の「平均」「最大」枠
  { top: 0.0, bottom: 0.42 },
];

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

function clearHeartHrvFields(vision: SoxaiVision24): SoxaiVision24 {
  const next = { ...vision };
  for (const key of SOXAI_VISION_HEART_HRV_KEYS) {
    next[key] = null;
  }
  return next;
}

/** 専用パス結果で心拍系を置換（一括値とは混ぜない） */
function overwriteHeartHrvFields(
  bulk: SoxaiVision24,
  heart: Pick<SoxaiVision24, (typeof SOXAI_VISION_HEART_HRV_KEYS)[number]>,
): SoxaiVision24 {
  const next = clearHeartHrvFields(bulk);
  for (const key of SOXAI_VISION_HEART_HRV_KEYS) {
    next[key] = heart[key] ?? null;
  }
  return next;
}

/**
 * heart_hrv 専用: グラフを避け、ラベル付き数値帯だけ切り出す。
 * 失敗時は空配列（呼び出し側で元画像フォールバック可）。
 */
async function cropHeartHrvNumericWindows(
  dataUrl: string,
): Promise<string[]> {
  try {
    const match = dataUrl.match(/^data:image\/[a-zA-Z0-9+.-]+;base64,(.+)$/);
    if (!match?.[1]) return [];
    const input = Buffer.from(match[1], "base64");
    const meta = await sharp(input).metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) return [];

    const out: string[] = [];
    for (const window of HEART_HRV_CROP_WINDOWS) {
      const top = Math.max(0, Math.min(height - 1, Math.round(height * window.top)));
      const bottom = Math.max(
        top + 1,
        Math.min(height, Math.round(height * window.bottom)),
      );
      const cropHeight = bottom - top;
      const buf = await sharp(input)
        .extract({ left: 0, top, width, height: cropHeight })
        .jpeg({ quality: 95 })
        .toBuffer();
      out.push(`data:image/jpeg;base64,${buf.toString("base64")}`);
    }
    return out;
  } catch {
    return [];
  }
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
 * 1) 一括 Vision（sleep 系の空欄のみ 1 回リトライ）
 * 2) heart_hrv 画像だけの専用パスで安静時心拍・HRV を置換（混ぜない）
 * 3) heart_hrv が無い場合は心拍系を要確認（null）
 */
export async function runSoxaiVisionExtract(params: {
  client: OpenAI;
  images: string[];
  sections: Array<SoxaiExtractSection | "">;
}): Promise<SoxaiVisionRunResult> {
  const { client, images, sections } = params;
  const first = await callSoxaiVisionOnce({ client, images, sections });
  let vision = first.vision;
  let usage = first.usage;
  let retried = false;
  const filledByRetry: SoxaiVisionCriticalKey[] = [];

  if (emptyBulkRetryVisionKeys(vision).length > 0) {
    retried = true;
    const second = await callSoxaiVisionOnce({ client, images, sections });
    for (const key of retryFilledBulkKeys(vision, second.vision)) {
      filledByRetry.push(key);
    }
    vision = mergeVisionPreferFilled(vision, second.vision);
    usage = addUsage(usage, second.usage);
  }

  const heartIndexes = images
    .map((_, index) => index)
    .filter((index) => sections[index] === "heart_hrv");
  const heartImages = heartIndexes.map((index) => images[index]);
  let heartHrvDedicatedPass = false;

  if (heartImages.length === 0) {
    vision = clearHeartHrvFields(vision);
  } else {
    heartHrvDedicatedPass = true;
    // 枚×数値帯クロップごとに読み、心拍キーだけを専用パス内で結合（一括とは混ぜない）
    let heartMerged = clearHeartHrvFields(emptySoxaiVision24());
    for (const image of heartImages) {
      const windows = await cropHeartHrvNumericWindows(image);
      const targets = windows.length > 0 ? windows : [image];
      for (const target of targets) {
        const dedicated = await callHeartHrvVisionOnce({
          client,
          images: [target],
        });
        usage = addUsage(usage, dedicated.usage);
        const asVision = clearHeartHrvFields(emptySoxaiVision24());
        for (const key of SOXAI_VISION_HEART_HRV_KEYS) {
          asVision[key] = dedicated.heart[key];
        }
        heartMerged = mergeVisionFillBlanksOnly(heartMerged, asVision);
      }
    }
    vision = overwriteHeartHrvFields(vision, heartMerged);
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
  });

  return { vision, metrics, telemetry, usage, retried };
}
