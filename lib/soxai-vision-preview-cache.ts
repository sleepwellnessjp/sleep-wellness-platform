/**
 * 一括アップロード経路の vision-soxai プレビュー結果キャッシュ（メモリ / React state 用）。
 */

import { emptyGraphBundle } from "@/lib/soxai-graphs";
import { collectedMetricKeys } from "@/lib/soxai-metrics";
import type { SoxaiExtractSection } from "@/lib/soxai-ocr-runner";
import type { SoxaiOcrRunResult } from "@/lib/soxai-ocr-runner";
import type { SoxaiVisionExtractionResult } from "@/lib/soxai-vision-runner";

export type SoxaiVisionPreviewCacheEntry = {
  /** プレビュー解析時の File[] 順序で生成した fingerprint */
  fingerprint: string;
  vision: SoxaiVisionExtractionResult;
  cachedAt: number;
};

export type SoxaiVisionPreviewCacheLookup = {
  entry: SoxaiVisionPreviewCacheEntry;
  /** 提出時の File[] 順序で生成した fingerprint */
  submitFingerprint: string;
};

const LOG_PREFIX = "[soxai-vision]" as const;

export function logVisionPreviewCacheHit(): void {
  console.info(`${LOG_PREFIX} cache hit (fingerprint一致)`);
}

export function logVisionPreviewCacheMiss(reason: string): void {
  console.info(`${LOG_PREFIX} cache miss (${reason})`);
}

export function logVisionPreviewCacheCleared(reason: string): void {
  console.info(`${LOG_PREFIX} preview cache cleared (${reason})`);
}

export function visionPreviewToOcrRunResult(
  vision: SoxaiVisionExtractionResult,
  sections: Array<SoxaiExtractSection | "">,
  imageCount: number,
  fromCache: boolean,
): SoxaiOcrRunResult {
  const metricCount = collectedMetricKeys(vision.metrics).length;
  const imageStatuses = Array.from({ length: imageCount }, (_, index) => ({
    index,
    section: (sections[index] ?? "") as SoxaiExtractSection | "",
    label: String(index + 1),
    status:
      metricCount > 0 ? ("success" as const) : ("failed" as const),
    error:
      metricCount > 0 ? undefined : vision.error ?? "項目が空でした",
    durationMs: vision.elapsedMs,
  }));

  return {
    metrics: vision.metrics,
    conflicts: [],
    graphs: emptyGraphBundle(),
    confidence: {},
    imageStatuses,
    cancelled: vision.cancelled,
    elapsedMs: vision.elapsedMs,
    fromCache,
  };
}
