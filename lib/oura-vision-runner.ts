/**
 * Oura Vision クライアントランナー。
 * OpenAI Vision（画像全体理解）専用。OCR / ROI / 座標認識は使わない。
 */

import { prepareImageForVision } from "@/lib/oura-image-prep";
import {
  emptyMetrics,
  type AnalysisMetrics,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import {
  mapOuraVisionToExtraction,
  type OuraMappedExtraction,
} from "@/lib/oura-metrics";
import type {
  OuraDeviceSpecificMetrics,
  OuraVisionMetrics,
} from "@/lib/oura-vision-schema";
import { emptyOuraVisionMetrics } from "@/lib/oura-vision-schema";
import type { OcrProgressSnapshot } from "@/lib/soxai-ocr-runner";

export const OURA_VISION_CLIENT_TIMEOUT_MS = 240_000;
/** 安全上限のみ。枚数は固定しない（ユーザーは任意枚数を追加できる） */
export const OURA_MAX_IMAGES = 16;

export type OuraVisionExtractionResult = {
  metrics: AnalysisMetrics;
  imageKeys: MetricFieldKey[];
  deviceSpecificMetrics: OuraDeviceSpecificMetrics;
  ouraScores: OuraMappedExtraction["ouraScores"];
  /** Vision 生 metrics（confirm の Oura 固有表示・手修正用） */
  visionMetrics: OuraVisionMetrics;
  warnings: string[];
  conflicts: [];
  graphs: Record<string, never>;
  confidence: Record<string, never>;
  imageStatuses: Array<{
    index: number;
    section: "";
    label: string;
    status: "success" | "failed" | "timeout";
    error?: string;
  }>;
  cancelled: boolean;
  elapsedMs: number;
  error?: string;
  /** 開発用: fixture 経由のとき true */
  fromFixture?: boolean;
};

function emptyResult(
  images: string[],
  partial?: Partial<OuraVisionExtractionResult>,
): OuraVisionExtractionResult {
  return {
    metrics: emptyMetrics(),
    imageKeys: [],
    deviceSpecificMetrics: {
      sleepContributors: {},
      readinessContributors: {},
      tags: [],
      notes: [],
    },
    ouraScores: {
      sleepScore: null,
      readinessScore: null,
      activityScore: null,
    },
    visionMetrics: emptyOuraVisionMetrics(),
    warnings: [],
    conflicts: [],
    graphs: {},
    confidence: {},
    imageStatuses: images.map((_, index) => ({
      index,
      section: "" as const,
      label: String(index + 1),
      status: "failed" as const,
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
    completed: number;
    startedAt: number;
    status: "running" | "success" | "failed";
  },
) {
  const { images, completed, startedAt } = params;
  onProgress?.({
    phase: params.phase,
    message: params.message,
    total: images.length,
    completed,
    activeLabels: [],
    startedAt,
    estimatedRemainingMs: null,
    cancelled: false,
    inputSource: "oura",
    images: images.map((_, index) => ({
      index,
      section: "" as const,
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

/**
 * Oura 画像を /api/vision-oura へ送り、AnalysisMetrics に変換する。
 * options.fixture があれば API を呼ばず fixture JSON を使う（開発用）。
 */
export async function resolveOuraVisionExtraction(
  images: string[],
  options?: {
    signal?: AbortSignal;
    onProgress?: (snapshot: OcrProgressSnapshot) => void;
    /** 開発テスト用。本番フローでは渡さない */
    fixture?: unknown;
  },
): Promise<OuraVisionExtractionResult> {
  const signal = options?.signal;
  const startedAt = Date.now();

  if (images.length === 0 && !options?.fixture) {
    return emptyResult(images, { error: "画像がありません" });
  }

  if (images.length > OURA_MAX_IMAGES) {
    return emptyResult(images, {
      error: `画像は最大${OURA_MAX_IMAGES}枚までです`,
    });
  }

  if (signal?.aborted) {
    return emptyResult(images, { cancelled: true });
  }

  console.info("[oura-vision-runner] start", {
    imageCount: images.length,
    hasFixture: Boolean(options?.fixture),
    summaries: images.map((image, index) => ({
      index,
      ...summarizeDataUrl(image),
    })),
  });

  emitProgress(options?.onProgress, {
    phase: "preparing",
    message: "Oura画像を準備しています…",
    images,
    completed: 0,
    startedAt,
    status: "running",
  });

  try {
    if (options?.fixture) {
      const mapped = mapOuraVisionToExtraction(options.fixture);
      emitProgress(options?.onProgress, {
        phase: "done",
        message: "Oura fixture を適用しました",
        images: images.length > 0 ? images : [""],
        completed: Math.max(images.length, 1),
        startedAt,
        status: "success",
      });
      return {
        metrics: mapped.metrics,
        imageKeys: mapped.imageKeys,
        deviceSpecificMetrics: mapped.deviceSpecificMetrics,
        ouraScores: mapped.ouraScores,
        visionMetrics: mapped.visionMetrics,
        warnings: mapped.warnings,
        conflicts: [],
        graphs: {},
        confidence: {},
        imageStatuses: (images.length > 0 ? images : [""]).map((_, index) => ({
          index,
          section: "" as const,
          label: String(index + 1),
          status: "success" as const,
        })),
        cancelled: false,
        elapsedMs: Date.now() - startedAt,
        fromFixture: true,
      };
    }

    const prepared: string[] = [];
    for (let i = 0; i < images.length; i++) {
      if (signal?.aborted) {
        return emptyResult(images, { cancelled: true });
      }
      const original = images[i]!;
      const prep = await prepareImageForVision(original);
      if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(prep)) {
        console.error("[oura-vision-runner] invalid prepared image", {
          index: i,
          head: prep.slice(0, 64),
        });
        return emptyResult(images, {
          error: `画像${i + 1}の data URL 生成に失敗しました（Vision送信用形式ではありません）`,
          elapsedMs: Date.now() - startedAt,
        });
      }
      prepared.push(prep);
      console.info("[oura-vision-runner] prepared image", {
        index: i,
        original: summarizeDataUrl(original),
        prepared: summarizeDataUrl(prep),
      });
      emitProgress(options?.onProgress, {
        phase: "preparing",
        message: `画像準備 ${i + 1}/${images.length}`,
        images,
        completed: i + 1,
        startedAt,
        status: "running",
      });
    }

    emitProgress(options?.onProgress, {
      phase: "ocr",
      message: "Oura Vision 解析中…",
      images,
      completed: 0,
      startedAt,
      status: "running",
    });

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      OURA_VISION_CLIENT_TIMEOUT_MS,
    );
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort);

    const requestBody = JSON.stringify({ images: prepared });
    console.info("[oura-vision-runner] POST /api/vision-oura", {
      imageCount: prepared.length,
      bodyChars: requestBody.length,
      timeoutMs: OURA_VISION_CLIENT_TIMEOUT_MS,
    });

    let response: Response;
    try {
      response = await fetch("/api/vision-oura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }

    if (signal?.aborted) {
      return emptyResult(images, { cancelled: true });
    }

    let payload: {
      metrics?: AnalysisMetrics;
      imageKeys?: MetricFieldKey[];
      deviceSpecificMetrics?: OuraDeviceSpecificMetrics;
      ouraScores?: OuraMappedExtraction["ouraScores"];
      warnings?: string[];
      vision?: unknown;
      error?: string;
      errorType?: string;
      details?: string;
    };
    try {
      payload = (await response.json()) as typeof payload;
    } catch (parseError) {
      const message =
        parseError instanceof Error ? parseError.message : String(parseError);
      console.error("[oura-vision-runner] response JSON parse failed", {
        status: response.status,
        message,
      });
      return emptyResult(images, {
        error: `Oura Vision レスポンスのJSON解析に失敗しました: ${message}`,
        elapsedMs: Date.now() - startedAt,
      });
    }

    if (!response.ok) {
      const detail =
        typeof payload.details === "string" && payload.details.trim()
          ? payload.details.trim()
          : "";
      const type =
        typeof payload.errorType === "string" && payload.errorType.trim()
          ? ` [${payload.errorType}]`
          : "";
      const message =
        (payload.error || "Oura Vision 解析に失敗しました") +
        type +
        (detail ? `: ${detail}` : "");
      console.error("[oura-vision-runner] API error", {
        status: response.status,
        error: payload.error,
        errorType: payload.errorType,
        details: payload.details,
      });
      emitProgress(options?.onProgress, {
        phase: "done",
        message: "Oura Vision 解析に失敗しました",
        images,
        completed: images.length,
        startedAt,
        status: "failed",
      });
      return emptyResult(images, {
        error: message,
        elapsedMs: Date.now() - startedAt,
      });
    }

    const mapped = payload.vision
      ? mapOuraVisionToExtraction(payload.vision)
      : {
          metrics: payload.metrics ?? emptyMetrics(),
          imageKeys: payload.imageKeys ?? [],
          deviceSpecificMetrics: payload.deviceSpecificMetrics ?? {
            sleepContributors: {},
            readinessContributors: {},
            tags: [],
            notes: [],
          },
          ouraScores: payload.ouraScores ?? {
            sleepScore: null,
            readinessScore: null,
            activityScore: null,
          },
          visionMetrics: emptyOuraVisionMetrics(),
          warnings: payload.warnings ?? [],
          measurementDate: null,
        };

    console.info("[oura-vision-runner] success", {
      elapsedMs: Date.now() - startedAt,
      imageKeys: mapped.imageKeys.length,
      ouraScores: mapped.ouraScores,
      warnings: mapped.warnings,
    });

    emitProgress(options?.onProgress, {
      phase: "done",
      message: "Oura Vision 解析が完了しました",
      images,
      completed: images.length,
      startedAt,
      status: "success",
    });

    return {
      metrics: mapped.metrics,
      imageKeys: mapped.imageKeys,
      deviceSpecificMetrics: mapped.deviceSpecificMetrics,
      ouraScores: mapped.ouraScores,
      visionMetrics: mapped.visionMetrics,
      warnings: mapped.warnings,
      conflicts: [],
      graphs: {},
      confidence: {},
      imageStatuses: images.map((_, index) => ({
        index,
        section: "" as const,
        label: String(index + 1),
        status: "success" as const,
      })),
      cancelled: false,
      elapsedMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (signal?.aborted) {
      return emptyResult(images, { cancelled: true });
    }
    const message = error instanceof Error ? error.message : String(error);
    const isTimeout =
      error instanceof Error &&
      (error.name === "AbortError" || /aborted|timeout/i.test(message));
    console.error("[oura-vision-runner] failed", {
      message,
      isTimeout,
      elapsedMs: Date.now() - startedAt,
    });
    emitProgress(options?.onProgress, {
      phase: "done",
      message: "Oura Vision 解析に失敗しました",
      images,
      completed: images.length,
      startedAt,
      status: "failed",
    });
    return emptyResult(images, {
      error: isTimeout
        ? `Oura Vision がタイムアウトしました（${OURA_VISION_CLIENT_TIMEOUT_MS}ms）: ${message}`
        : `Oura Vision 解析に失敗しました: ${message}`,
      elapsedMs: Date.now() - startedAt,
    });
  }
}
