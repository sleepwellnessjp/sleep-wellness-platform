/**
 * SOXAI Vision クライアントランナー。
 * OCR runner は残すが本番フローでは使わない。戻り形は confirm/result 互換。
 */

import { prepareImageForOcr } from "@/lib/soxai-image-prep";
import {
  collectedMetricKeys,
  emptyMetrics,
  type AnalysisMetrics,
} from "@/lib/soxai-metrics";
import type { SoxaiVision24 } from "@/lib/soxai-vision-schema";
import type {
  OcrProgressSnapshot,
  SoxaiExtractSection,
  SoxaiOcrImageStatusRecord,
} from "@/lib/soxai-ocr-runner";

export const VISION_CLIENT_TIMEOUT_MS = 240_000;

export type SoxaiVisionExtractionResult = {
  metrics: AnalysisMetrics;
  vision: SoxaiVision24 | null;
  conflicts: [];
  graphs: Record<string, never>;
  confidence: Record<string, never>;
  imageStatuses: SoxaiOcrImageStatusRecord[];
  cancelled: boolean;
  elapsedMs: number;
  error?: string;
};

function emptyVisionResult(
  images: string[],
  sections: Array<SoxaiExtractSection | "">,
  partial?: Partial<SoxaiVisionExtractionResult>,
): SoxaiVisionExtractionResult {
  return {
    metrics: emptyMetrics(),
    vision: null,
    conflicts: [],
    graphs: {},
    confidence: {},
    imageStatuses: images.map((_, index) => ({
      index,
      section: (sections[index] ?? "") as SoxaiExtractSection | "",
      label: String(index + 1),
      status: "failed",
      error: "Vision未完了",
    })),
    cancelled: false,
    elapsedMs: 0,
    ...partial,
  };
}

function emitProgress(
  onProgress: ((snapshot: OcrProgressSnapshot) => void) | undefined,
  params: {
    phase: OcrProgressSnapshot["phase"];
    message: string;
    images: string[];
    sections: Array<SoxaiExtractSection | "">;
    completed: number;
    startedAt: number;
    status: "running" | "success" | "failed";
  },
) {
  const { images, sections, completed, startedAt } = params;
  onProgress?.({
    phase: params.phase,
    message: params.message,
    total: images.length,
    completed,
    activeLabels: [],
    startedAt,
    estimatedRemainingMs: null,
    cancelled: false,
    images: images.map((_, index) => ({
      index,
      section: (sections[index] ?? "") as SoxaiExtractSection | "",
      label: String(index + 1),
      status:
        completed >= images.length
          ? params.status === "failed"
            ? "failed"
            : "success"
          : index < completed
            ? "success"
            : "running",
      startedAt,
      endedAt: completed >= images.length ? Date.now() : null,
    })),
  });
}

/**
 * 9枚（前後可）を /api/vision-soxai へ送り、AnalysisMetrics に変換した結果を返す。
 */
export async function resolveSoxaiVisionExtraction(
  images: string[],
  sections: Array<SoxaiExtractSection | ""> = [],
  options?: {
    signal?: AbortSignal;
    onProgress?: (snapshot: OcrProgressSnapshot) => void;
  },
): Promise<SoxaiVisionExtractionResult> {
  const signal = options?.signal;
  const startedAt = Date.now();

  if (images.length === 0) {
    return emptyVisionResult(images, sections, {
      error: "画像がありません",
    });
  }

  if (signal?.aborted) {
    return emptyVisionResult(images, sections, { cancelled: true });
  }

  emitProgress(options?.onProgress, {
    phase: "preparing",
    message: "画像を準備しています…",
    images,
    sections,
    completed: 0,
    startedAt,
    status: "running",
  });

  const prepared = await Promise.all(
    images.map((image) => prepareImageForOcr(image)),
  );

  if (signal?.aborted) {
    return emptyVisionResult(images, sections, { cancelled: true });
  }

  emitProgress(options?.onProgress, {
    phase: "ocr",
    message: "Vision解析中…",
    images,
    sections,
    completed: 0,
    startedAt,
    status: "running",
  });

  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort);
  const timer = setTimeout(() => controller.abort(), VISION_CLIENT_TIMEOUT_MS);

  try {
    const response = await fetch("/api/vision-soxai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ images: prepared }),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as {
      metrics?: AnalysisMetrics;
      vision?: SoxaiVision24;
      error?: string;
      details?: string;
    } | null;

    if (!response.ok || !payload?.metrics) {
      const message =
        payload?.details ||
        payload?.error ||
        `Vision API error (${response.status})`;
      const imageStatuses: SoxaiOcrImageStatusRecord[] = images.map(
        (_, index) => ({
          index,
          section: (sections[index] ?? "") as SoxaiExtractSection | "",
          label: String(index + 1),
          status: "failed",
          error: message,
        }),
      );
      emitProgress(options?.onProgress, {
        phase: "done",
        message: "Vision解析に失敗しました",
        images,
        sections,
        completed: images.length,
        startedAt,
        status: "failed",
      });
      return emptyVisionResult(images, sections, {
        error: message,
        imageStatuses,
      });
    }

    const metrics = payload.metrics;
    const metricCount = collectedMetricKeys(metrics).length;
    const imageStatuses: SoxaiOcrImageStatusRecord[] = images.map(
      (_, index) => ({
        index,
        section: (sections[index] ?? "") as SoxaiExtractSection | "",
        label: String(index + 1),
        status: metricCount > 0 ? "success" : "failed",
        error: metricCount > 0 ? undefined : "項目が空でした",
        durationMs: Date.now() - startedAt,
      }),
    );

    emitProgress(options?.onProgress, {
      phase: "done",
      message: `Vision解析完了（${metricCount}項目）`,
      images,
      sections,
      completed: images.length,
      startedAt,
      status: metricCount > 0 ? "success" : "failed",
    });

    return {
      metrics,
      vision: payload.vision ?? null,
      conflicts: [],
      graphs: {},
      confidence: {},
      cancelled: false,
      elapsedMs: Date.now() - startedAt,
      imageStatuses,
    };
  } catch (error) {
    if (signal?.aborted || controller.signal.aborted) {
      return emptyVisionResult(images, sections, { cancelled: true });
    }
    const message = error instanceof Error ? error.message : String(error);
    return emptyVisionResult(images, sections, {
      error: message,
      imageStatuses: images.map((_, index) => ({
        index,
        section: (sections[index] ?? "") as SoxaiExtractSection | "",
        label: String(index + 1),
        status: /abort|timeout/i.test(message) ? "timeout" : "failed",
        error: message,
      })),
    });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}
