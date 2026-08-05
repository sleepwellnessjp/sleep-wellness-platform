/**
 * クライアント側: アップロード画像 → /api/vision-classify → 割当モード判定。
 */

import { prepareImageForVision } from "@/lib/oura-image-prep";
import type { WearableDevice, WearableUploadedImage } from "@/lib/wearable-analysis";
import {
  createWearableImageId,
  toWearableUploadedImage,
} from "@/lib/wearable-analysis";
import {
  assignmentModeForConfidence,
  logWearableClassifySummary,
  mapClassifyCategoryForDevice,
  type ClassifyAssignmentMode,
  type WearableClassifyItemResult,
  type WearableClassifyResponse,
} from "@/lib/wearable-classify";

export type ClassifiedUploadItem = {
  image: WearableUploadedImage;
  mode: ClassifyAssignmentMode;
  detectedDevice: WearableClassifyItemResult["detectedDevice"];
  analyzable: boolean;
  reason?: string;
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("画像の読み込みに失敗しました。"));
    };
    reader.onerror = () => reject(new Error("画像の読み込みに失敗しました。"));
    reader.readAsDataURL(file);
  });
}

export async function classifyWearableImages(args: {
  files: File[];
  deviceType: WearableDevice;
  signal?: AbortSignal;
}): Promise<{
  items: ClassifiedUploadItem[];
  elapsedMs: number;
  successRate: number;
  error?: string;
}> {
  const startedAt = Date.now();
  if (args.files.length === 0) {
    return { items: [], elapsedMs: 0, successRate: 0 };
  }

  try {
    const rawUrls = await Promise.all(args.files.map(fileToDataUrl));
    const images = await Promise.all(
      rawUrls.map((url) => prepareImageForVision(url)),
    );

    const response = await fetch("/api/vision-classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        images,
        expectedDevice: args.deviceType,
      }),
      signal: args.signal,
    });

    const json = (await response.json()) as WearableClassifyResponse & {
      error?: string;
      details?: string;
    };

    if (!response.ok) {
      const message =
        json.error ||
        json.details ||
        "画像の自動分類に失敗しました。";
      return {
        items: args.files.map((file) => ({
          image: {
            ...toWearableUploadedImage({
              file,
              deviceType: args.deviceType,
              imageCategory: "unknown",
              required: false,
            }),
            status: "needs_manual",
            confidence: 0,
            errorMessage: message,
          },
          mode: "manual",
          detectedDevice: "unknown",
          analyzable: false,
          reason: message,
        })),
        elapsedMs: Date.now() - startedAt,
        successRate: 0,
        error: message,
      };
    }

    const results = Array.isArray(json.results) ? json.results : [];
    const items: ClassifiedUploadItem[] = args.files.map((file, index) => {
      const result = results.find((row) => row.index === index) ?? {
        index,
        detectedDevice: "unknown" as const,
        imageCategory: "unknown" as const,
        confidence: 0,
        analyzable: false,
        reason: "分類結果なし",
      };
      const mode = assignmentModeForConfidence(
        result.confidence,
        result.imageCategory,
      );
      const mappedCategory =
        mode === "manual"
          ? "unknown"
          : mapClassifyCategoryForDevice(
              args.deviceType,
              result.imageCategory,
            );

      const image: WearableUploadedImage = {
        id: createWearableImageId(),
        file,
        previewUrl: URL.createObjectURL(file),
        deviceType: args.deviceType,
        imageCategory: mappedCategory,
        required: false,
        status:
          mode === "auto"
            ? "assigned"
            : mode === "candidate"
              ? "candidate"
              : "needs_manual",
        confidence: result.confidence,
        errorMessage: null,
      };

      return {
        image,
        mode,
        detectedDevice: result.detectedDevice,
        analyzable: result.analyzable,
        reason: result.reason,
      };
    });

    const elapsedMs = json.elapsedMs ?? Date.now() - startedAt;
    const successRate = json.successRate ?? 0;

    logWearableClassifySummary({
      source: "client",
      deviceType: args.deviceType,
      elapsedMs,
      successRate,
      totalCount: items.length,
      successCount: items.filter((item) => item.mode !== "manual").length,
      results: items.map((item, index) => ({
        index,
        imageCategory: item.image.imageCategory,
        confidence: item.image.confidence ?? 0,
        mode: item.mode,
        analyzable: item.analyzable,
      })),
    });

    return { items, elapsedMs, successRate };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "画像の自動分類に失敗しました。";
    return {
      items: args.files.map((file) => ({
        image: {
          ...toWearableUploadedImage({
            file,
            deviceType: args.deviceType,
            imageCategory: "unknown",
            required: false,
          }),
          status: "needs_manual",
          confidence: 0,
          errorMessage: message,
        },
        mode: "manual",
        detectedDevice: "unknown",
        analyzable: false,
        reason: message,
      })),
      elapsedMs: Date.now() - startedAt,
      successRate: 0,
      error: message,
    };
  }
}
