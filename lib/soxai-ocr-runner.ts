/**
 * SOXAI 複数画像 OCR のクライアント側オーケストレーション。
 * - 画像圧縮 → SHA-256 セットキャッシュ → 未ヒット時は一括 /api/extract（原則1回）
 * - 確認・分析・PDF ではこの結果JSONを再利用（再OCRしない）
 */

import {
  emptyGraphBundle,
  type SoxaiGraphBundle,
} from "@/lib/soxai-graphs";
import {
  OCR_LOW_CONFIDENCE_THRESHOLD,
  type MergedMetricConflict,
  type MetricConfidenceMap,
} from "@/lib/soxai-merge";
import {
  collectedMetricKeys,
  emptyMetrics,
  missingMetricKeys,
  missingMetricLabels,
  normalizeMetrics,
  SOXAI_METRIC_FIELDS,
  type AnalysisMetrics,
} from "@/lib/soxai-metrics";
import {
  mergeMetricsFromVisibleReadings,
  normalizeVisibleReadings,
} from "@/lib/soxai-reading-map";
import type { SoxaiScreenType } from "@/lib/soxai-screen";
import { prepareImagesForOcr } from "@/lib/soxai-image-prep";
import {
  getCachedOcrSet,
  hashImageDataUrls,
  setCachedOcrSet,
  setFingerprintFromHashes,
} from "@/lib/soxai-ocr-cache";
import {
  recordOpenAiUsage,
  type OpenAiUsageSummary,
} from "@/lib/openai-usage";
import {
  detectMetricConsistencyWarnings,
  consistencyWarningKeys,
} from "@/lib/soxai-consistency";
import { normalizeMetricsForDisplay } from "@/lib/soxai-display-normalize";

export const OCR_IMAGE_TIMEOUT_MS = 540_000;
export const OCR_OVERALL_BUDGET_MS = 600_000;
export const OCR_CONCURRENCY = 2;
/** キャッシュ採用の最低取得率（25項目中） */
const MIN_CACHE_METRIC_COUNT = 24;

function isAbortError(error: unknown): boolean {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

/** 429 / タイムアウト / Abort など再試行対象の一時的エラー */
function isTransientOcrFailure(params: {
  error?: unknown;
  message?: string;
  httpStatus?: number;
  timedOut?: boolean;
}): boolean {
  if (params.timedOut) return true;
  if (params.httpStatus === 429) return true;
  if (params.error != null && isAbortError(params.error)) return true;
  const message =
    params.message ??
    (params.error instanceof Error
      ? params.error.message
      : params.error != null
        ? String(params.error)
        : "");
  return /429|rate limit|タイムアウト|timeout|temporar|ECONNRESET|ETIMEDOUT|AbortError|aborted|中止/i.test(
    message,
  );
}

/**
 * OCR トレースログ。再試行対象の一時エラーは warn、
 * OCR 全体の最終失敗のみ error（Next.js 開発オーバーレイ抑制）。
 */
function logOcrTraceFailure(
  where: string,
  params: {
    message: string;
    final?: boolean;
    httpStatus?: number;
    timedOut?: boolean;
    error?: unknown;
    extra?: Record<string, unknown>;
  },
): void {
  const transient = isTransientOcrFailure({
    error: params.error,
    message: params.message,
    httpStatus: params.httpStatus,
    timedOut: params.timedOut,
  });
  const payload = {
    where,
    message: params.message,
    ...(params.httpStatus != null ? { httpStatus: params.httpStatus } : {}),
    ...(params.error instanceof Error && params.error.stack
      ? { stack: params.error.stack }
      : {}),
    ...params.extra,
  };
  if (params.final && !transient) {
    console.error("[ocr-trace] ⑧ エラー発生箇所", payload);
  } else {
    console.warn("[ocr-trace] ⑧ エラー発生箇所", payload);
  }
}

export type SoxaiExtractSection =
  | "home"
  | "sleep_overview"
  | "sleep_stages"
  | "sleep_detail"
  | "stress"
  | "circadian"
  | "respiration"
  | "heart_hrv"
  | "skin_temp";

export type ExtractSoxaiResult = {
  metrics: AnalysisMetrics;
  conflicts: MergedMetricConflict[];
  graphs: SoxaiGraphBundle;
  confidence: MetricConfidenceMap;
};

export type OcrImageOutcome =
  | "pending"
  | "running"
  | "success"
  | "failed"
  | "timeout"
  | "cancelled";

export type OcrImageProgress = {
  index: number;
  section: SoxaiExtractSection | "";
  label: string;
  status: OcrImageOutcome;
  startedAt: number | null;
  endedAt: number | null;
  error?: string;
};

export type OcrProgressPhase =
  | "preparing"
  | "ocr"
  | "merging"
  | "finishing"
  | "cancelled"
  | "done";

export type OcrProgressSnapshot = {
  phase: OcrProgressPhase;
  message: string;
  total: number;
  completed: number;
  activeLabels: string[];
  startedAt: number;
  estimatedRemainingMs: number | null;
  images: OcrImageProgress[];
  cancelled: boolean;
};

export type SoxaiOcrImageStatusRecord = {
  index: number;
  section: SoxaiExtractSection | "";
  label: string;
  status: Exclude<OcrImageOutcome, "pending" | "running">;
  error?: string;
  durationMs?: number;
};

export type SoxaiOcrRunResult = ExtractSoxaiResult & {
  imageStatuses: SoxaiOcrImageStatusRecord[];
  cancelled: boolean;
  elapsedMs: number;
  usage?: OpenAiUsageSummary;
  imageHashes?: string[];
  fromCache?: boolean;
};

export type RunSoxaiOcrOptions = {
  images: string[];
  sections?: SoxaiExtractSection[];
  signal?: AbortSignal;
  concurrency?: number;
  imageTimeoutMs?: number;
  overallBudgetMs?: number;
  onlyIndexes?: number[];
  seed?: {
    metrics?: AnalysisMetrics;
    graphs?: SoxaiGraphBundle;
    confidence?: MetricConfidenceMap;
    conflicts?: MergedMetricConflict[];
    imageStatuses?: SoxaiOcrImageStatusRecord[];
  };
  onProgress?: (snapshot: OcrProgressSnapshot) => void;
  forceRefresh?: boolean;
};

const SECTION_TITLES: Record<SoxaiExtractSection, string> = {
  home: "概要",
  stress: "ストレス",
  sleep_overview: "睡眠概要",
  sleep_detail: "睡眠詳細",
  sleep_stages: "睡眠ステージ",
  circadian: "体内時計",
  respiration: "呼吸",
  heart_hrv: "呼吸・心拍",
  skin_temp: "皮膚温",
};

const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"] as const;

export function soxaiSectionDisplayLabels(
  sections: Array<SoxaiExtractSection | "">,
): string[] {
  const seen = new Map<string, number>();
  const totals = new Map<string, number>();
  for (const section of sections) {
    if (!section) continue;
    totals.set(section, (totals.get(section) ?? 0) + 1);
  }
  return sections.map((section) => {
    if (!section) return "画像";
    const title = SECTION_TITLES[section] ?? section;
    const total = totals.get(section) ?? 1;
    if (total <= 1) return title;
    const n = (seen.get(section) ?? 0) + 1;
    seen.set(section, n);
    return `${title}${CIRCLED[n - 1] ?? String(n)}`;
  });
}

function emptySnapshot(
  total: number,
  labels: string[],
  sections: Array<SoxaiExtractSection | "">,
  startedAt: number,
): OcrProgressSnapshot {
  return {
    phase: "preparing",
    message: "画像を準備しています",
    total,
    completed: 0,
    activeLabels: [],
    startedAt,
    estimatedRemainingMs: null,
    cancelled: false,
    images: labels.map((label, index) => ({
      index,
      section: sections[index] ?? "",
      label,
      status: "pending",
      startedAt: null,
      endedAt: null,
    })),
  };
}

function mergePreferExisting(
  existing: AnalysisMetrics,
  incoming: AnalysisMetrics,
): AnalysisMetrics {
  const base = normalizeMetrics(existing);
  const next = normalizeMetrics(incoming);
  for (const key of collectedMetricKeys(next)) {
    if (key === "sleepScore") {
      if (typeof next.sleepScore === "number") {
        base.sleepScore = next.sleepScore;
      }
      continue;
    }
    const value = next[key];
    if (typeof value === "string" && value.trim()) {
      base[key] = value;
    }
  }
  return base;
}

function mergeGraphsPreferExisting(
  existing: SoxaiGraphBundle,
  incoming: SoxaiGraphBundle,
): SoxaiGraphBundle {
  return {
    ...existing,
    ...Object.fromEntries(
      Object.entries(incoming).filter(([, panel]) => Boolean(panel)),
    ),
  };
}

function applyConsistencyToConfidence(
  metrics: AnalysisMetrics,
  confidence: MetricConfidenceMap,
): MetricConfidenceMap {
  const next = { ...confidence };
  const keys = consistencyWarningKeys(detectMetricConsistencyWarnings(metrics));
  for (const key of keys) {
    if (next[key] != null) {
      next[key] = Math.min(next[key]!, OCR_LOW_CONFIDENCE_THRESHOLD - 0.01);
    }
  }
  return next;
}

async function callExtractApi(params: {
  images: string[];
  sections?: SoxaiExtractSection[];
  imageHashes: string[];
  total: number;
  mode: "batch" | "single";
  timeoutMs: number;
  signal: AbortSignal;
}): Promise<{
  merged: ExtractSoxaiResult | null;
  perImage: Array<{
    imageIndex: number;
    screenType: SoxaiScreenType;
    error: string | null;
  }>;
  usage?: OpenAiUsageSummary["entries"][number];
  timing?: {
    totalMs?: number;
    concurrency?: number;
    phases?: Array<{
      name?: string;
      durationMs?: number;
      detail?: Record<string, unknown>;
    }>;
    perImage?: Array<{
      imageIndex?: number;
      durationMs?: number;
      phases?: Array<{ name?: string; durationMs?: number }>;
    }>;
  };
  error?: string;
}> {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  params.signal.addEventListener("abort", onAbort, { once: true });

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, params.timeoutMs);

  try {
    console.info("[ocr-trace] ② OpenAIへリクエスト送信直前", {
      mode: params.mode,
      imageCount: params.images.length,
      timeoutMs: params.timeoutMs,
      at: new Date().toISOString(),
    });
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        images: params.images,
        sections: params.sections,
        options: {
          mode: params.mode,
          imageTotal: params.total,
          imageHashes: params.imageHashes,
          skipRetries: false,
          skipCriticalReOcr: false,
        },
      }),
    });

    console.info("[ocr-trace] ③ OpenAIレスポンス受信", {
      mode: params.mode,
      httpStatus: response.status,
      ok: response.ok,
      contentType: response.headers.get("content-type"),
      contentLength: response.headers.get("content-length"),
      at: new Date().toISOString(),
    });

    let data: unknown;
    const jsonStartedAt = Date.now();
    try {
      data = await response.json();
    } catch (parseError) {
      // 呼び出し元で最終成否を判断するため、ここでは warn のみ
      logOcrTraceFailure("callExtractApi.json", {
        message:
          parseError instanceof Error
            ? parseError.message
            : String(parseError),
        error: parseError,
      });
      return {
        merged: null,
        perImage: [],
        error: "画像解析結果のJSON解析に失敗しました。",
      };
    }
    console.info("[ocr-trace] ③b JSON parse完了", {
      parseMs: Date.now() - jsonStartedAt,
      topLevelKeys:
        data && typeof data === "object" && !Array.isArray(data)
          ? Object.keys(data as Record<string, unknown>)
          : [],
    });

    // 画面反映調査用: APIが返した metrics をそのまま出す
    const rawMetrics =
      data && typeof data === "object" && "metrics" in data
        ? (data as { metrics: unknown }).metrics
        : undefined;
    const rawCollectedCount =
      data && typeof data === "object" && "collectedCount" in data
        ? (data as { collectedCount?: unknown }).collectedCount
        : undefined;
    console.log("[ocr-trace] ③c APIレスポンス metrics 生JSON", {
      collectedCount: rawCollectedCount,
      metrics: rawMetrics,
    });

    const timing =
      data && typeof data === "object" && "timing" in data
        ? (
            data as {
              timing?: {
                totalMs?: number;
                concurrency?: number;
                phases?: Array<{
                  name?: string;
                  durationMs?: number;
                  detail?: Record<string, unknown>;
                }>;
                perImage?: Array<{
                  imageIndex?: number;
                  durationMs?: number;
                  phases?: Array<{ name?: string; durationMs?: number }>;
                }>;
              };
            }
          ).timing
        : undefined;
    if (timing) {
      console.info("[ocr-trace] timing（サーバー計測）", {
        totalMs: timing.totalMs,
        concurrency: timing.concurrency,
        phases: (timing.phases ?? []).map((p) => ({
          name: p.name,
          durationMs: p.durationMs,
          detail: p.detail,
        })),
        perImage: (timing.perImage ?? []).map((row) => ({
          imageIndex: row.imageIndex,
          durationMs: row.durationMs,
          phases: (row.phases ?? []).map((p) => ({
            name: p.name,
            durationMs: p.durationMs,
          })),
        })),
      });
    }

    const usage =
      data && typeof data === "object" && "usage" in data
        ? (data as { usage?: OpenAiUsageSummary["entries"][number] }).usage
        : undefined;

    if (!response.ok) {
      const payload =
        data && typeof data === "object" ? (data as { error?: unknown }) : {};
      const errorMessage =
        typeof payload.error === "string"
          ? payload.error
          : "画像の自動解析に失敗しました。";
      const is429 = response.status === 429 || /429|rate limit/i.test(errorMessage);
      if (is429) {
        console.warn("[ocr-trace] 429発生", {
          imageIndex: null,
          callNo: 1,
          purpose: "callExtractApi",
          action: "呼び出し元へ返却（再試行対象）",
          continued: true,
          aborted: false,
          httpStatus: response.status,
          message: errorMessage,
        });
      }
      // HTTP 失敗は返却のみ。最終失敗の error は runSoxaiOcr 側で1回出す
      logOcrTraceFailure("callExtractApi.http", {
        message: errorMessage,
        httpStatus: response.status,
      });
      return {
        merged: null,
        perImage: [],
        usage,
        timing,
        error: errorMessage,
      };
    }

    const visibleReadings = normalizeVisibleReadings(
      data && typeof data === "object" && "visibleReadings" in data
        ? (data as { visibleReadings: unknown }).visibleReadings
        : [],
    );
    const graphs =
      data && typeof data === "object" && "graphs" in data
        ? ((data as { graphs: SoxaiGraphBundle }).graphs ?? emptyGraphBundle())
        : emptyGraphBundle();
    const confidence =
      data && typeof data === "object" && "confidence" in data
        ? ((data as { confidence: MetricConfidenceMap }).confidence ?? {})
        : {};
    const conflicts =
      data && typeof data === "object" && "conflicts" in data
        ? ((data as { conflicts: MergedMetricConflict[] }).conflicts ?? [])
        : [];
    const metricsRaw =
      data && typeof data === "object" && "metrics" in data
        ? (data as { metrics: Partial<AnalysisMetrics> }).metrics
        : undefined;
    const metrics = normalizeMetricsForDisplay(
      normalizeMetrics(
        mergeMetricsFromVisibleReadings(metricsRaw ?? emptyMetrics(), visibleReadings),
      ),
    );

    const formKeys = SOXAI_METRIC_FIELDS.map((field) => field.key);
    const presentKeys = collectedMetricKeys(metrics);
    const rawMetricKeys =
      metricsRaw && typeof metricsRaw === "object" && !Array.isArray(metricsRaw)
        ? Object.keys(metricsRaw as Record<string, unknown>)
        : [];
    const unknownRawKeys = rawMetricKeys.filter(
      (key) => !formKeys.includes(key as (typeof formKeys)[number]),
    );
    const missingFormKeys = formKeys.filter((key) => !presentKeys.includes(key));
    console.log("[ocr-trace] ③d 正規化後metrics / キー突合", {
      rawMetricKeys,
      presentKeys,
      missingFormKeys,
      unknownRawKeys,
      metrics,
    });

    const perImageRaw =
      data && typeof data === "object" && "perImage" in data
        ? (
            data as {
              perImage?: Array<{
                imageIndex?: number;
                screenType?: string;
                error?: string | null;
              }>;
            }
          ).perImage
        : undefined;

    const perImage = (perImageRaw ?? []).map((row, index) => ({
      imageIndex:
        typeof row.imageIndex === "number" ? row.imageIndex : index,
      screenType: (row.screenType ?? "other") as SoxaiScreenType,
      error: typeof row.error === "string" ? row.error : null,
    }));

    if (
      collectedMetricKeys(metrics).length === 0 &&
      visibleReadings.length === 0
    ) {
      return {
        merged: null,
        perImage,
        usage,
        timing,
        error: "OCR失敗",
      };
    }

    console.info("[ocr-trace] ④ OCR結果（取得項目数）", {
      mode: params.mode,
      mappedMetricCount: collectedMetricKeys(metrics).length,
      visibleReadingCount: visibleReadings.length,
      perImageCount: perImage.length,
      perImageErrors: perImage.filter((row) => row.error).length,
    });

    return {
      merged: {
        metrics,
        conflicts,
        graphs,
        confidence: applyConsistencyToConfidence(metrics, confidence),
      },
      perImage,
      usage,
      timing,
    };
  } catch (error) {
    // 再試行対象（Abort / タイムアウト等）は warn。成功時に error を残さない
    logOcrTraceFailure("callExtractApi", {
      message: error instanceof Error ? error.message : String(error),
      error,
      timedOut,
    });
    if (isAbortError(error)) {
      if (timedOut && !params.signal.aborted) {
        return { merged: null, perImage: [], error: "タイムアウト" };
      }
      throw error;
    }
    return {
      merged: null,
      perImage: [],
      error: error instanceof Error ? error.message : "OCR失敗",
    };
  } finally {
    clearTimeout(timer);
    params.signal.removeEventListener("abort", onAbort);
  }
}

function resultFromCacheSet(
  cached: NonNullable<ReturnType<typeof getCachedOcrSet>>,
  sections: Array<SoxaiExtractSection | ""> | undefined,
  hashes: string[],
  elapsedMs: number,
): SoxaiOcrRunResult {
  return {
    metrics: cached.metrics,
    conflicts: cached.conflicts,
    graphs: cached.graphs,
    confidence: cached.confidence,
    imageStatuses: cached.imageStatuses.map((status, index) => ({
      ...status,
      index,
      section: (sections?.[index] ?? status.section) as SoxaiExtractSection | "",
      status: status.status,
    })),
    cancelled: false,
    elapsedMs,
    imageHashes: hashes,
    fromCache: true,
    usage: {
      apiCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      durationMs: elapsedMs,
      entries: [],
    },
  };
}

function isAcceptableCachedOcrSet(
  cached: NonNullable<ReturnType<typeof getCachedOcrSet>>,
  imageCount: number,
): boolean {
  const metricCount = collectedMetricKeys(cached.metrics).length;
  if (metricCount < MIN_CACHE_METRIC_COUNT) return false;
  if (cached.imageStatuses.length !== imageCount) return false;
  return cached.imageStatuses.every((status) => status.status === "success");
}

export async function runSoxaiOcr(
  options: RunSoxaiOcrOptions,
): Promise<SoxaiOcrRunResult> {
  const {
    images,
    sections,
    signal,
    imageTimeoutMs = OCR_IMAGE_TIMEOUT_MS,
    overallBudgetMs = OCR_OVERALL_BUDGET_MS,
    onlyIndexes,
    seed,
    onProgress,
    forceRefresh = false,
  } = options;

  if (!Array.isArray(images) || images.length === 0) {
    throw new Error("睡眠データ画像が不足しています。");
  }

  const startedAt = Date.now();
  const sectionList: Array<SoxaiExtractSection | ""> = images.map(
    (_, index) => sections?.[index] ?? "",
  );
  const labels = soxaiSectionDisplayLabels(sectionList);
  let snapshot = emptySnapshot(images.length, labels, sectionList, startedAt);
  const emit = (next: Partial<OcrProgressSnapshot>) => {
    snapshot = { ...snapshot, ...next, images: [...snapshot.images] };
    onProgress?.(snapshot);
  };

  emit({ phase: "preparing", message: "画像を準備しています" });

  const targetIndexes =
    onlyIndexes && onlyIndexes.length > 0
      ? onlyIndexes.filter((i) => i >= 0 && i < images.length)
      : images.map((_, i) => i);

  const seedStatuses = seed?.imageStatuses ?? [];
  for (const record of seedStatuses) {
    if (targetIndexes.includes(record.index)) continue;
    const img = snapshot.images[record.index];
    if (!img) continue;
    img.status = record.status;
    img.error = record.error;
  }

  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onOuterAbort, { once: true });
  }

  const preparedAll = await prepareImagesForOcr(images);
  if (controller.signal.aborted) {
    if (signal) signal.removeEventListener("abort", onOuterAbort);
    return {
      metrics: seed?.metrics ?? emptyMetrics(),
      conflicts: seed?.conflicts ?? [],
      graphs: seed?.graphs ?? emptyGraphBundle(),
      confidence: seed?.confidence ?? {},
      imageStatuses: snapshot.images.map((img) => ({
        index: img.index,
        section: img.section,
        label: img.label,
        status: "cancelled",
        error: "中止",
      })),
      cancelled: true,
      elapsedMs: Date.now() - startedAt,
    };
  }

  const allHashes = await hashImageDataUrls(preparedAll);
  const setFp = setFingerprintFromHashes(allHashes);

  // セットキャッシュ（高取得率の完了結果のみ再利用）
  if (!forceRefresh && (!onlyIndexes || onlyIndexes.length === 0)) {
    const cachedSet = getCachedOcrSet(setFp);
    if (cachedSet && isAcceptableCachedOcrSet(cachedSet, images.length)) {
      emit({
        phase: "done",
        message: "キャッシュから復元しました",
        completed: images.length,
        estimatedRemainingMs: 0,
      });
      if (signal) signal.removeEventListener("abort", onOuterAbort);
      return resultFromCacheSet(
        cachedSet,
        sectionList,
        allHashes,
        Date.now() - startedAt,
      );
    }
    // 低取得率キャッシュは破棄して再OCR（高速化残骸を使わない）
  }

  emit({
    phase: "ocr",
    message: "OCR解析を開始しました（全画像・取得率優先）",
    activeLabels: targetIndexes.map((i) => labels[i] ?? ""),
    estimatedRemainingMs: Math.min(imageTimeoutMs, overallBudgetMs),
  });
  console.info("[ocr-trace] ① OCR解析開始", {
    imageCount: images.length,
    targetIndexes,
    forceRefresh,
    fromCache: false,
    at: new Date().toISOString(),
  });

  for (const index of targetIndexes) {
    const img = snapshot.images[index];
    if (!img) continue;
    img.status = "running";
    img.startedAt = Date.now();
  }

  const remainingBudget = startedAt + overallBudgetMs - Date.now();
  let cancelled = false;
  /** APIから有効な merged を受け取ったか（後続の abort で結果を捨てない） */
  let gotMergedResult = false;
  let merged: ExtractSoxaiResult = {
    metrics: seed?.metrics ?? emptyMetrics(),
    conflicts: seed?.conflicts ?? [],
    graphs: seed?.graphs ?? emptyGraphBundle(),
    confidence: seed?.confidence ?? {},
  };
  const usageEntries: OpenAiUsageSummary["entries"] = [];

  if (remainingBudget <= 1_000) {
    for (const index of targetIndexes) {
      const img = snapshot.images[index];
      if (!img) continue;
      img.status = "timeout";
      img.endedAt = Date.now();
      img.error = "全体タイムアウト";
    }
  } else {
    try {
      const batchImages = targetIndexes.map((i) => preparedAll[i]!);
      const batchHashes = targetIndexes.map((i) => allHashes[i]!);
      const batchSections = targetIndexes.map((i) => sections?.[i]);
      const hasSections = batchSections.every((s) => Boolean(s));

      const apiResult = await callExtractApi({
        images: batchImages,
        sections: hasSections
          ? (batchSections as SoxaiExtractSection[])
          : undefined,
        imageHashes: batchHashes,
        total: images.length,
        mode: targetIndexes.length === 1 ? "single" : "batch",
        timeoutMs: Math.min(imageTimeoutMs, remainingBudget),
        signal: controller.signal,
      });

      if (apiResult.usage) {
        usageEntries.push(
          recordOpenAiUsage({
            purpose: "ocr",
            model: apiResult.usage.model ?? "gpt-4o-mini",
            apiCalls: apiResult.usage.apiCalls ?? 1,
            inputTokens: apiResult.usage.inputTokens ?? 0,
            outputTokens: apiResult.usage.outputTokens ?? 0,
            durationMs: apiResult.usage.durationMs,
            imageCount: targetIndexes.length,
            cacheHits: 0,
            note: "per-image-vision",
          }),
        );
      }

      if (apiResult.merged) {
        gotMergedResult = true;
        if (seed?.metrics && onlyIndexes && onlyIndexes.length > 0) {
          merged = {
            metrics: mergePreferExisting(seed.metrics, apiResult.merged.metrics),
            graphs: mergeGraphsPreferExisting(
              seed.graphs ?? emptyGraphBundle(),
              apiResult.merged.graphs,
            ),
            confidence: {
              ...(seed.confidence ?? {}),
              ...apiResult.merged.confidence,
            },
            conflicts:
              apiResult.merged.conflicts.length > 0
                ? apiResult.merged.conflicts
                : (seed.conflicts ?? []),
          };
        } else {
          merged = apiResult.merged;
        }

        for (let i = 0; i < targetIndexes.length; i += 1) {
          const globalIndex = targetIndexes[i]!;
          const img = snapshot.images[globalIndex];
          if (!img) continue;
          img.endedAt = Date.now();
          const meta =
            apiResult.perImage.find((row) => row.imageIndex === i) ??
            apiResult.perImage.find((row) => row.imageIndex === globalIndex);
          if (meta?.error) {
            img.status =
              meta.error === "タイムアウト" ? "timeout" : "failed";
            img.error = meta.error;
          } else {
            img.status = "success";
          }
        }
      } else {
        const failMessage = apiResult.error || "OCR失敗";
        // callExtractApi 側で既に warn 済みの一時エラーは重ねて error しない。
        // 非一時的な最終失敗のみ console.error を1回出す。
        logOcrTraceFailure("runSoxaiOcr.batch", {
          message: failMessage,
          final: true,
        });
        for (const index of targetIndexes) {
          const img = snapshot.images[index];
          if (!img) continue;
          img.endedAt = Date.now();
          img.status =
            apiResult.error === "タイムアウト" ? "timeout" : "failed";
          img.error = failMessage;
        }
      }
    } catch (error) {
      const aborted =
        controller.signal.aborted || isAbortError(error);
      const failMessage = aborted
        ? "中止"
        : error instanceof Error
          ? error.message
          : "OCR失敗";
      // 内部で処理済み・再試行対象の Abort/一時エラーは warn のみ（重ねて error しない）
      logOcrTraceFailure("runSoxaiOcr.batch", {
        message: failMessage,
        error,
        final: true,
        extra: { aborted },
      });
      cancelled = aborted;
      for (const index of targetIndexes) {
        const img = snapshot.images[index];
        if (!img) continue;
        img.endedAt = Date.now();
        img.status = aborted ? "cancelled" : "failed";
        img.error = failMessage;
      }
    }
  }

  // API成功後の遅延 abort で結果を cancelled 扱いにしない（確認画面へ進める）
  if (controller.signal.aborted || signal?.aborted) {
    if (gotMergedResult) {
      console.warn("[ocr-trace] abort after successful merge — keep result", {
        collected: collectedMetricKeys(merged.metrics).length,
        at: new Date().toISOString(),
      });
    } else {
      cancelled = true;
      for (const img of snapshot.images) {
        if (img.status === "pending" || img.status === "running") {
          img.status = "cancelled";
          img.endedAt = Date.now();
          img.error = "中止";
        }
      }
    }
  }

  emit({
    phase: cancelled ? "cancelled" : "merging",
    message: cancelled ? "解析を中止しました" : "取得結果を統合しています",
    activeLabels: [],
    completed: snapshot.images.filter((item) =>
      ["success", "failed", "timeout", "cancelled"].includes(item.status),
    ).length,
    cancelled,
  });
  if (!cancelled) {
    console.info("[ocr-trace] ⑤ mergeImageExtractResults実行", {
      note: "サーバー側で完了済み。クライアントは結果を受け取り統合表示へ",
      collected: collectedMetricKeys(merged.metrics).length,
      at: new Date().toISOString(),
    });
  }

  // onlyIndexes 再解析でキャッシュ画像分が無い場合のフォールバック統合
  if (
    onlyIndexes &&
    onlyIndexes.length > 0 &&
    seed?.metrics &&
    collectedMetricKeys(merged.metrics).length === 0
  ) {
    merged = {
      metrics: seed.metrics,
      graphs: seed.graphs ?? emptyGraphBundle(),
      confidence: seed.confidence ?? {},
      conflicts: seed.conflicts ?? [],
    };
  }

  const imageStatuses: SoxaiOcrImageStatusRecord[] = snapshot.images.map(
    (img) => ({
      index: img.index,
      section: img.section,
      label: img.label,
      status:
        img.status === "pending" || img.status === "running"
          ? "cancelled"
          : img.status,
      error: img.error,
      durationMs:
        img.startedAt && img.endedAt
          ? img.endedAt - img.startedAt
          : undefined,
    }),
  );

  if (!cancelled && (!onlyIndexes || onlyIndexes.length === 0)) {
    setCachedOcrSet({
      fingerprint: setFp,
      imageHashes: allHashes,
      metrics: merged.metrics,
      conflicts: merged.conflicts,
      graphs: merged.graphs,
      confidence: merged.confidence,
      imageStatuses,
      cachedAt: Date.now(),
    });
  }

  const usage: OpenAiUsageSummary = {
    apiCalls: usageEntries.reduce((s, e) => s + e.apiCalls, 0),
    inputTokens: usageEntries.reduce((s, e) => s + e.inputTokens, 0),
    outputTokens: usageEntries.reduce((s, e) => s + e.outputTokens, 0),
    durationMs: Date.now() - startedAt,
    entries: usageEntries,
  };

  if (signal) signal.removeEventListener("abort", onOuterAbort);

  const elapsedMs = Date.now() - startedAt;
  const collected = collectedMetricKeys(merged.metrics);
  const missing = missingMetricKeys(merged.metrics);
  const missingLabels = missingMetricLabels(merged.metrics);
  emit({
    phase: cancelled ? "cancelled" : "done",
    message: cancelled
      ? "解析を中止しました"
      : `${imageStatuses.filter((s) => s.status === "success").length} / ${images.length}枚 完了（${collected.length}/${SOXAI_METRIC_FIELDS.length}項目）`,
    completed: imageStatuses.filter((s) =>
      ["success", "failed", "timeout", "cancelled"].includes(s.status),
    ).length,
    cancelled,
    estimatedRemainingMs: 0,
  });

  console.info("[soxai-ocr] batch complete", {
    elapsedMs,
    cancelled,
    collected: `${collected.length}/${SOXAI_METRIC_FIELDS.length}`,
    missing,
    missingLabels,
    apiCalls: usage.apiCalls,
    fromCache: usage.apiCalls === 0,
    usageDurationMs: usage.durationMs,
  });

  if (missing.length > 0) {
    console.warn("[soxai-ocr] missing metrics", {
      count: missing.length,
      keys: missing,
      labels: missingLabels,
    });
  }

  return {
    ...merged,
    imageStatuses,
    cancelled,
    elapsedMs,
    usage,
    imageHashes: allHashes,
    fromCache: usage.apiCalls === 0,
  };
}

export function formatOcrElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min <= 0) return `${sec}秒`;
  return `${min}分${sec.toString().padStart(2, "0")}秒`;
}

export function formatOcrEta(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "計算中";
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  if (totalSec < 60) return `約${totalSec}秒`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec > 0 ? `約${min}分${sec}秒` : `約${min}分`;
}

export function ocrProgressBarSymbols(completed: number, total: number): string {
  const safeTotal = Math.max(1, total);
  const filled = Math.max(0, Math.min(safeTotal, completed));
  return `${"■".repeat(filled)}${"□".repeat(safeTotal - filled)}`;
}
