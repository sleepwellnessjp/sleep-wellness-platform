"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { flushSync } from "react-dom";
import AnalysisFlow from "@/components/AnalysisFlow";
import AnalysisAccessBanner from "@/components/AnalysisAccessBanner";
import {
  getExtractionDraft,
  reanalyzeSoxaiImages,
  setExtractionDraft,
  setPendingAnalysisRequest,
  type AnalysisMetrics,
  type ExtractionDraft,
  type MetricConflict,
  type OuraScoresSnapshot,
  type SoxaiExtractSection,
  type SoxaiOcrImageStatusRecord,
} from "@/lib/analysis-session";
import { resetProgressiveAnalysisJobs } from "@/lib/analysis-progressive";
import { HOME_TOP_HREF } from "@/lib/home-intro";
import {
  buildAnalysisAiInput,
  compactPreviousAnalysisForAi,
  logAnalysisAiInputInDev,
} from "@/lib/client-profiles";
import { buildOuraAnalysisAiInput } from "@/lib/oura-analysis-input";
import {
  buildOuraDisplayCategories,
  countOuraPresentItems,
} from "@/lib/oura-display-categories";
import OuraCategoryResults from "@/components/analysis/OuraCategoryResults";
import { getClientById } from "@/lib/repositories/client-repository";
import { graphPanelCount, parseDurationMinutes } from "@/lib/soxai-graphs";
import {
  detectMetricConsistencyWarnings,
  consistencyWarningKeys,
} from "@/lib/soxai-consistency";
import {
  fieldStatus,
  diagnoseNeedsReview,
  type FieldStatus,
} from "@/lib/soxai-field-status";
import {
  collectedMetricKeys,
  isMetricPresent,
  metricDisplayValue,
  normalizeMetrics,
  setMetricValue,
  SOXAI_METRIC_FIELDS,
  SOXAI_UI_METRIC_FIELDS,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";
import { normalizeMetricsForDisplay } from "@/lib/soxai-display-normalize";
import { CRITICAL_OCR_KEYS, isCriticalOcrKey, SCREEN_PRIMARY_METRICS } from "@/lib/soxai-screen";
import { toSwsMetrics } from "@/lib/sws-standard";
import SoxaiOcrProgressPanel from "@/components/SoxaiOcrProgressPanel";
import type { OcrProgressSnapshot } from "@/lib/soxai-ocr-runner";
import {
  fillEmptyMetricsFromOuraVision,
} from "@/lib/oura-metrics";
import {
  emptyOuraVisionMetrics,
  type OuraVisionMetrics,
} from "@/lib/oura-vision-schema";

const SECTION_DISPLAY: Array<{
  id: SoxaiExtractSection;
  title: string;
  screens: Array<keyof typeof SCREEN_PRIMARY_METRICS>;
}> = [
  { id: "home", title: "Overview", screens: ["home"] },
  { id: "stress", title: "Stress", screens: ["stress"] },
  {
    id: "sleep_overview",
    title: "Sleep Summary",
    screens: ["sleep_overview"],
  },
  {
    id: "sleep_detail",
    title: "Sleep Detail",
    screens: ["sleep_detail", "bed_wake"],
  },
  {
    id: "sleep_stages",
    title: "Sleep Stages",
    screens: ["sleep_stages"],
  },
  { id: "circadian", title: "Circadian", screens: ["circadian"] },
  {
    id: "heart_hrv",
    title: "Respiration / HRV",
    screens: ["respiration", "rhr", "hrv"],
  },
  { id: "skin_temp", title: "Skin Temp", screens: ["skin_temp"] },
];

function sectionMetricKeys(
  section: SoxaiExtractSection,
): MetricFieldKey[] {
  const entry = SECTION_DISPLAY.find((item) => item.id === section);
  if (!entry) return [];
  const keys = new Set<MetricFieldKey>();
  for (const screen of entry.screens) {
    for (const key of SCREEN_PRIMARY_METRICS[screen]) {
      keys.add(key);
    }
  }
  return [...keys];
}

const inputClass =
  "mt-2.5 min-h-12 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:min-h-0 sm:px-5 sm:py-4 sm:text-base";

const inputEmptyClass =
  "mt-2.5 min-h-12 w-full rounded-2xl border border-[#C48A2D]/30 bg-[#FFF8EC] px-4 py-3.5 text-[16px] text-[#C48A2D] outline-none transition duration-300 placeholder:text-[#C48A2D] focus:border-[#C48A2D] focus:bg-white focus:text-[#071426] focus:ring-4 focus:ring-[#C48A2D]/15 sm:min-h-0 sm:px-5 sm:py-4 sm:text-base";

const inputConflictClass =
  "mt-2.5 min-h-12 w-full rounded-2xl border border-amber-300 bg-[#fffbeb] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15 sm:min-h-0 sm:px-5 sm:py-4 sm:text-base";

const inputLowConfidenceClass =
  "mt-2.5 min-h-12 w-full rounded-2xl border border-[#8a6a2d]/35 bg-[#fbf7ef] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#8a6a2d] focus:bg-white focus:ring-4 focus:ring-[#8a6a2d]/15 sm:min-h-0 sm:px-5 sm:py-4 sm:text-base";

function statusBadge(status: FieldStatus, present: boolean) {
  // Vision方式: 「要確認」は Vision 未取得のときだけ。値が入っている項目は画像から取得。
  if (!present || status === "no_explicit" || status === "manual_needed") {
    return {
      label: "要確認",
      className:
        "rounded-full bg-[#8a6a2d]/12 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#8a6a2d]",
    };
  }
  if (status === "conflict") {
    return {
      label: "複数画像で競合",
      className:
        "rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800",
    };
  }
  return {
    label: "画像から取得",
    className:
      "rounded-full bg-[#315f68]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#315f68]",
  };
}

function imageStatusLabel(status: SoxaiOcrImageStatusRecord["status"]): {
  label: string;
  className: string;
} {
  switch (status) {
    case "success":
      return {
        label: "成功",
        className: "bg-[#315f68]/10 text-[#315f68]",
      };
    case "failed":
      return {
        label: "OCR失敗",
        className: "bg-[#a33a3a]/10 text-[#a33a3a]",
      };
    case "timeout":
      return {
        label: "タイムアウト",
        className: "bg-amber-100 text-amber-800",
      };
    case "cancelled":
      return {
        label: "中止",
        className: "bg-slate-100 text-slate-600",
      };
  }
}

export default function ConfirmExtractionPage() {
  const router = useRouter();
  // sessionStorage は SSR で読めないため、初回は必ず null で揃えて Hydration mismatch を防ぐ
  const [draft, setDraft] = useState<ExtractionDraft | null>(null);
  const [metrics, setMetrics] = useState<AnalysisMetrics | null>(null);
  const [ouraVisionMetrics, setOuraVisionMetrics] =
    useState<OuraVisionMetrics | null>(null);
  const [ouraScores, setOuraScores] = useState<OuraScoresSnapshot | null>(null);
  const [ouraTagsText, setOuraTagsText] = useState("");
  const [ouraNotesText, setOuraNotesText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [ocrOverlayOpen, setOcrOverlayOpen] = useState(false);
  const [ocrProgress, setOcrProgress] = useState<OcrProgressSnapshot | null>(
    null,
  );
  const [showOcrCancelConfirm, setShowOcrCancelConfirm] = useState(false);
  const [ocrCancelledMenu, setOcrCancelledMenu] = useState(false);
  const [reanalyzeAbort, setReanalyzeAbort] =
    useState<AbortController | null>(null);

  /** 遷移・bfcache 復帰・unmount 時に OCR overlay を必ず落とす（Safari 幽霊レイヤー対策） */
  useEffect(() => {
    const purgeOverlayDom = () => {
      document
        .querySelectorAll("[data-soxai-ocr-overlay]")
        .forEach((node) => node.remove());
    };
    const forceCloseOverlay = () => {
      setOcrOverlayOpen(false);
      setShowOcrCancelConfirm(false);
      setOcrCancelledMenu(false);
      purgeOverlayDom();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) forceCloseOverlay();
    };
    const onPageHide = () => forceCloseOverlay();
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      window.removeEventListener("pagehide", onPageHide);
      forceCloseOverlay();
    };
  }, []);

  useEffect(() => {
    const initialDraft = getExtractionDraft();
    if (!initialDraft) {
      router.replace("/analysis/new");
      return;
    }
    setDraft(initialDraft);
    const normalized = normalizeMetricsForDisplay(
      normalizeMetrics(initialDraft.extractedMetrics),
    );
    setMetrics(normalized);
    if (initialDraft.inputSource === "oura") {
      const seeded = {
        ...(initialDraft.ouraVisionMetrics ?? emptyOuraVisionMetrics()),
      };
      if (seeded.sleepScore == null && initialDraft.ouraScores?.sleepScore != null) {
        seeded.sleepScore = initialDraft.ouraScores.sleepScore;
      }
      if (
        seeded.readinessScore == null &&
        initialDraft.ouraScores?.readinessScore != null
      ) {
        seeded.readinessScore = initialDraft.ouraScores.readinessScore;
      }
      if (
        seeded.activityScore == null &&
        initialDraft.ouraScores?.activityScore != null
      ) {
        seeded.activityScore = initialDraft.ouraScores.activityScore;
      }
      setOuraVisionMetrics(seeded);
      setOuraScores(
        initialDraft.ouraScores ?? {
          sleepScore: seeded.sleepScore,
          readinessScore: seeded.readinessScore,
          activityScore: seeded.activityScore,
        },
      );
      setOuraTagsText(
        (initialDraft.deviceSpecificMetrics?.tags ?? []).join(", "),
      );
      setOuraNotesText(
        (initialDraft.deviceSpecificMetrics?.notes ?? []).join("\n"),
      );
    }
    // Vision metrics を正とする。取得済みキーはすべて「画像から取得」扱いで自動入力
    const keys = collectedMetricKeys(normalized);
    const prevKeys = initialDraft.imageKeys ?? [];
    const keysMismatch =
      keys.length !== prevKeys.length ||
      keys.some((key) => !prevKeys.includes(key));
    if (keys.length > 0 && keysMismatch) {
      const synced = {
        ...initialDraft,
        extractedMetrics: normalized,
        imageKeys: keys,
      };
      setDraft(synced);
      setExtractionDraft(synced);
    }
  }, [router]);

  const imageKeySet = useMemo(
    () => new Set(draft?.imageKeys ?? []),
    [draft?.imageKeys],
  );

  const conflictByKey = useMemo(() => {
    const map = new Map<MetricFieldKey, MetricConflict>();
    for (const conflict of draft?.conflicts ?? []) {
      map.set(conflict.key, conflict);
    }
    return map;
  }, [draft?.conflicts]);

  const confidenceMap = useMemo(() => draft?.ocrConfidence ?? {}, [draft]);

  const consistencyCheckOptions = useMemo(() => {
    const fromMetrics =
      metrics != null ? parseDurationMinutes(metrics.timeInBed) : null;
    const fromOura = draft?.ouraVisionMetrics?.timeInBed ?? null;
    const timeInBedMinutes =
      fromMetrics != null && fromMetrics > 0
        ? fromMetrics
        : fromOura != null && Number.isFinite(fromOura) && fromOura > 0
          ? fromOura
          : null;
    return {
      inputSource: draft?.inputSource,
      timeInBedMinutes,
    };
  }, [
    draft?.inputSource,
    draft?.ouraVisionMetrics?.timeInBed,
    metrics?.timeInBed,
  ]);
  const consistencyWarnings = useMemo(
    () =>
      metrics
        ? detectMetricConsistencyWarnings(metrics, consistencyCheckOptions)
        : [],
    [metrics, consistencyCheckOptions],
  );
  const consistencyKeySet = useMemo(
    () => consistencyWarningKeys(consistencyWarnings),
    [consistencyWarnings],
  );

  const extractedCount = (draft?.imageKeys ?? []).filter((key) =>
    SOXAI_UI_METRIC_FIELDS.some((field) => field.key === key),
  ).length;
  const missingCount = SOXAI_UI_METRIC_FIELDS.length - extractedCount;
  const conflictCount = draft?.conflicts?.length ?? 0;
  const graphCount = draft ? graphPanelCount(draft.graphs) : 0;
  const sectionAcquisition = useMemo(() => {
    if (!draft || !metrics) return [];
    const uploaded = new Set(draft.ocrSections ?? []);
    const presentKeys = new Set(collectedMetricKeys(metrics));
    return SECTION_DISPLAY.filter(
      (section) => uploaded.size === 0 || uploaded.has(section.id),
    ).map((section) => {
      const keys = sectionMetricKeys(section.id);
      const acquired = keys.filter((key) => presentKeys.has(key)).length;
      return {
        id: section.id,
        title: section.title,
        acquired,
        total: keys.length,
      };
    });
  }, [draft, metrics]);
  const needsReviewCount = useMemo(() => {
    if (!metrics || !draft) return 0;
    return diagnoseNeedsReview({
      metrics,
      imageKeys: draft.imageKeys ?? [],
      conflicts: draft.conflicts,
      confidence: confidenceMap,
      consistencyWarnings,
    }).needsReviewCount;
  }, [metrics, draft, confidenceMap, consistencyWarnings]);

  const backHref = draft?.lifestyle.clientId
    ? `/analysis/new?clientId=${encodeURIComponent(draft.lifestyle.clientId)}`
    : "/analysis/new";
  const isManualInput = draft?.inputSource === "manual";
  const isOuraInput = draft?.inputSource === "oura";
  const ouraDisplayCategories = useMemo(
    () =>
      isOuraInput
        ? buildOuraDisplayCategories({
            vision: ouraVisionMetrics,
            deviceSpecific: draft?.deviceSpecificMetrics ?? null,
          })
        : [],
    [isOuraInput, ouraVisionMetrics, draft?.deviceSpecificMetrics],
  );
  const ouraPresentCount = countOuraPresentItems(ouraDisplayCategories);
  const deviceLabel = isOuraInput
    ? "Oura Ring"
    : isManualInput
      ? "手入力"
      : "SOXAI Ring";
  const analysisMethodLabel = isManualInput
    ? "手入力"
    : isOuraInput
      ? "Vision画像解析"
      : "Vision画像解析";

  const updateField = (key: MetricFieldKey, value: string) => {
    setMetrics((current) => {
      if (!current) return current;
      return setMetricValue(current, key, value);
    });
  };

  const imageStatuses = draft?.ocrImageStatuses ?? [];
  const failedImageIndexes = imageStatuses
    .filter((item) => item.status !== "success")
    .map((item) => item.index);

  const applyOcrResultToDraft = (
    current: ExtractionDraft,
    result: {
      metrics: AnalysisMetrics;
      conflicts: MetricConflict[];
      graphs: NonNullable<ExtractionDraft["graphs"]>;
      confidence: NonNullable<ExtractionDraft["ocrConfidence"]>;
      imageStatuses: SoxaiOcrImageStatusRecord[];
    },
  ) => {
    const metricCount = collectedMetricKeys(result.metrics).length;
    try {
      const next: ExtractionDraft = {
        ...current,
        extractedMetrics: result.metrics,
        imageKeys: collectedMetricKeys(result.metrics),
        conflicts: result.conflicts,
        ocrConfidence: result.confidence,
        graphs: result.graphs,
        ocrImageStatuses: result.imageStatuses,
          swsMetrics: toSwsMetrics(
          result.metrics,
          current.inputSource === "manual"
            ? "manual"
            : current.inputSource === "oura"
              ? "oura"
              : "soxai",
        ),
      };
      setExtractionDraft(next);
      setDraft(next);
      setMetrics(normalizeMetricsForDisplay(normalizeMetrics(result.metrics)));
    } catch (error) {
      throw error;
    }
  };

  const handleReanalyzeIndexes = async (indexes: number[]) => {
    if (!draft || indexes.length === 0) return;
    setAccessError(null);
    setReanalyzing(true);
    setOcrOverlayOpen(true);
    setOcrCancelledMenu(false);
    setShowOcrCancelConfirm(false);
    setOcrProgress(null);
    const controller = new AbortController();
    setReanalyzeAbort(controller);
    let retainOcrOverlay = false;

    try {
      const result = await reanalyzeSoxaiImages({
        images: draft.images,
        sections: draft.ocrSections,
        indexes,
        seed: {
          metrics: draft.extractedMetrics,
          graphs: draft.graphs,
          confidence: draft.ocrConfidence,
          conflicts: draft.conflicts,
          imageStatuses: draft.ocrImageStatuses,
        },
        signal: controller.signal,
        onProgress: setOcrProgress,
      });

      if (result.cancelled) {
        applyOcrResultToDraft(draft, {
          metrics: result.metrics,
          conflicts: result.conflicts,
          graphs: result.graphs,
          confidence: result.confidence,
          imageStatuses: result.imageStatuses,
        });
        retainOcrOverlay = true;
        setOcrCancelledMenu(true);
        return;
      }

      applyOcrResultToDraft(draft, {
        metrics: result.metrics,
        conflicts: result.conflicts,
        graphs: result.graphs,
        confidence: result.confidence,
        imageStatuses: result.imageStatuses,
      });
      flushSync(() => {
        setOcrOverlayOpen(false);
      });
      document
        .querySelectorAll("[data-soxai-ocr-overlay]")
        .forEach((node) => node.remove());
    } catch (error) {
      console.error("[analysis/confirm] reanalyze failed:", error);
      setAccessError(
        error instanceof Error
          ? error.message
          : "再解析に失敗しました。もう一度お試しください。",
      );
      flushSync(() => {
        setOcrOverlayOpen(false);
      });
      document
        .querySelectorAll("[data-soxai-ocr-overlay]")
        .forEach((node) => node.remove());
    } finally {
      setReanalyzing(false);
      setReanalyzeAbort(null);
      if (!retainOcrOverlay) {
        setOcrOverlayOpen(false);
      }
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || !metrics) return;

    setAccessError(null);
    setIsSubmitting(true);

    try {
      let accessResponse: Response;
      try {
        accessResponse = await fetch("/api/platform/analysis-access", {
          cache: "no-store",
        });
      } catch {
        setAccessError(
          "アクセス確認に失敗しました。ネットワーク接続を確認して、もう一度お試しください。",
        );
        return;
      }

      if (!accessResponse.ok) {
        setAccessError(
          "アクセス確認に失敗しました。しばらくしてから再度お試しください。",
        );
        return;
      }

      const access = (await accessResponse.json()) as {
        allowed?: boolean;
        message?: string;
      };
      if (!access.allowed) {
        setAccessError(
          access.message ??
            "認定資格の更新が必要です。Sleep Wellness Institute Japan までお問い合わせください。",
        );
        return;
      }

      // 確認画面の値（手動修正含む）を最終分析にそのまま使用
      const confirmed = normalizeMetrics(
        isOuraInput
          ? fillEmptyMetricsFromOuraVision(metrics, ouraVisionMetrics)
          : metrics,
      );

      let previousAnalysis: ReturnType<typeof compactPreviousAnalysisForAi>;
      let firstAnalysis: ReturnType<typeof compactPreviousAnalysisForAi>;
      const clientId = draft.lifestyle.clientId?.trim();
      if (clientId) {
        try {
          const client = await getClientById(clientId);
          const analyses = client?.analyses ?? [];
          const prior = analyses[0];
          const first =
            analyses.length > 1 ? analyses[analyses.length - 1] : null;
          if (prior) {
            previousAnalysis = compactPreviousAnalysisForAi({
              analysisDate: prior.analysisDate,
              sleepScore: prior.sleepScore,
              wellnessScore: prior.wellnessScore,
              metrics: prior.metrics ?? prior.result?.metrics,
              summary: prior.result?.summary,
              karteSummary: prior.result?.karteSummary,
              evidence: prior.result?.evidence,
              goodPoints: prior.result?.goodPoints,
              improvements: prior.result?.improvements,
              nextComparisonPoints: prior.result?.nextComparisonPoints,
              recommendationsUntilNext: prior.result?.recommendationsUntilNext,
              homeworkAchievement: prior.result?.homeworkAchievement,
            });
          }
          if (first && first.id !== prior?.id) {
            firstAnalysis = compactPreviousAnalysisForAi({
              analysisDate: first.analysisDate,
              sleepScore: first.sleepScore,
              wellnessScore: first.wellnessScore,
              metrics: first.metrics ?? first.result?.metrics,
              summary: first.result?.summary,
              karteSummary: first.result?.karteSummary,
              evidence: first.result?.evidence,
              goodPoints: first.result?.goodPoints,
              improvements: first.result?.improvements,
              nextComparisonPoints: first.result?.nextComparisonPoints,
              recommendationsUntilNext: first.result?.recommendationsUntilNext,
              homeworkAchievement: first.result?.homeworkAchievement,
            });
          }
        } catch {
          // オフライン時は前回なしで継続
        }
      }

      resetProgressiveAnalysisJobs();

      const nextDeviceSpecific = isOuraInput
        ? {
            sleepContributors:
              draft.deviceSpecificMetrics?.sleepContributors ?? {},
            readinessContributors:
              draft.deviceSpecificMetrics?.readinessContributors ?? {},
            tags: ouraTagsText
              .split(/[,、\n]/)
              .map((item) => item.trim())
              .filter(Boolean),
            notes: ouraNotesText
              .split(/\n/)
              .map((item) => item.trim())
              .filter(Boolean),
            extra: draft.deviceSpecificMetrics?.extra,
          }
        : draft.deviceSpecificMetrics;

      const nextOuraScores =
        isOuraInput && ouraScores
          ? ouraScores
          : draft.ouraScores;

      if (isOuraInput) {
        const syncedDraft: ExtractionDraft = {
          ...draft,
          extractedMetrics: confirmed,
          imageKeys: collectedMetricKeys(confirmed),
          deviceSpecificMetrics: nextDeviceSpecific,
          ouraScores: nextOuraScores,
          ouraVisionMetrics: ouraVisionMetrics ?? draft.ouraVisionMetrics,
        };
        setExtractionDraft(syncedDraft);
        setDraft(syncedDraft);
      }

      setPendingAnalysisRequest({
        lifestyle: draft.lifestyle,
        // Vision方式: 分析APIは metrics のみ。巨大な画像 data URL は送らない
        // （表示用画像は extraction draft / IndexedDB 側を参照）
        images: [],
        inputSource: draft.inputSource ?? "soxai",
        swsMetrics: toSwsMetrics(
          confirmed,
          draft.inputSource === "oura"
            ? "oura"
            : draft.inputSource === "manual"
              ? "manual"
              : "soxai",
        ),
        metrics: confirmed,
        extractedMetrics: draft.extractedMetrics,
        graphs: draft.graphs,
        ocrConfidence: draft.ocrConfidence,
        fixedProfile: draft.fixedProfile,
        dayContext: draft.dayContext,
        deviceSpecificMetrics: nextDeviceSpecific,
        ouraScores: nextOuraScores,
        ouraVisionMetrics: isOuraInput
          ? (ouraVisionMetrics ?? draft.ouraVisionMetrics)
          : undefined,
        aiInput: (() => {
          const aiInput = isOuraInput
            ? buildOuraAnalysisAiInput({
                analysisDate: draft.lifestyle.measurementDate,
                clientId: draft.lifestyle.clientId,
                clientName: draft.lifestyle.clientName,
                soxaiMetrics: confirmed,
                dayContext: draft.dayContext ?? null,
                lifestyleForm: draft.lifestyle,
                fixedProfile: draft.fixedProfile ?? null,
                previousAnalysis,
                firstAnalysis,
              })
            : buildAnalysisAiInput({
                analysisDate: draft.lifestyle.measurementDate,
                clientId: draft.lifestyle.clientId,
                clientName: draft.lifestyle.clientName,
                soxaiMetrics: confirmed,
                dayContext: draft.dayContext ?? null,
                lifestyleForm: draft.lifestyle,
                fixedProfile: draft.fixedProfile ?? null,
                previousAnalysis,
                firstAnalysis,
              });
          logAnalysisAiInputInDev(aiInput);
          return aiInput;
        })(),
      });
      router.push("/analysis/loading");
    } catch (error) {
      console.error("[analysis/confirm] submit failed:", error);
      setAccessError(
        error instanceof Error
          ? error.message
          : "分析の開始に失敗しました。もう一度お試しください。",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!draft || !metrics) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm text-slate-500">抽出結果を読み込み中...</p>
      </main>
    );
  }

  const images = draft.images;
  const safeImageIndex = Math.min(
    activeImageIndex,
    Math.max(0, images.length - 1),
  );

  const renderField = (field: (typeof SOXAI_METRIC_FIELDS)[number]) => {
    const fromImage = imageKeySet.has(field.key);
    const conflict = conflictByKey.get(field.key);
    const value = metricDisplayValue(metrics, field.key);
    const present = isMetricPresent(metrics, field.key);
    const confidence = confidenceMap[field.key];
    const status = fieldStatus(
      fromImage,
      conflict,
      confidence,
      present,
      consistencyKeySet.has(field.key),
    );
    const badge = statusBadge(status, present);
    const critical = isCriticalOcrKey(field.key);

    return (
      <label
        key={field.key}
        className={`block ${
          critical
            ? "rounded-2xl border border-[#315f68]/15 bg-[#f7fafb] px-3 py-3 sm:px-4"
            : ""
        }`}
      >
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-semibold text-[#071426] sm:text-sm">
            {field.label}
          </span>
          <span className={badge.className}>{badge.label}</span>
          {typeof confidence === "number" && fromImage && (
            <span className="text-[10px] text-slate-400">
              信頼度 {Math.round(confidence * 100)}%
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-[11px] text-slate-400">
          {field.hint}
        </span>
        <input
          type={
            field.inputType === "time" && !/^\d{2}:\d{2}$/.test(value)
              ? "text"
              : field.inputType === "number"
                ? "number"
                : field.inputType
          }
          inputMode={field.inputType === "number" ? "decimal" : undefined}
          step={field.inputType === "number" ? "1" : undefined}
          value={value}
          onChange={(event) => updateField(field.key, event.target.value)}
          className={
            conflict
              ? inputConflictClass
              : status === "needs_review"
                ? inputLowConfidenceClass
                : present
                  ? inputClass
                  : inputEmptyClass
          }
          placeholder={present ? field.placeholder : "要確認"}
          readOnly={!isManualInput && !isOuraInput}
          aria-readonly={!isManualInput && !isOuraInput ? "true" : undefined}
        />
        {conflict && (
          <span className="mt-1.5 block text-[11px] leading-5 text-amber-800">
            候補:{" "}
            {[conflict.adopted, ...conflict.alternatives].join(" / ")}
          </span>
        )}
      </label>
    );
  };

  const criticalFields = SOXAI_UI_METRIC_FIELDS.filter((f) =>
    CRITICAL_OCR_KEYS.includes(f.key),
  );
  const otherFields = SOXAI_UI_METRIC_FIELDS.filter(
    (f) => !CRITICAL_OCR_KEYS.includes(f.key),
  );


  return (
    <main className="min-h-screen overflow-x-hidden bg-[#f7f7f5]">
      {ocrOverlayOpen && (
        <SoxaiOcrProgressPanel
          progress={ocrProgress}
          showCancelConfirm={showOcrCancelConfirm}
          cancelledMenu={ocrCancelledMenu}
          inputSource={draft?.inputSource ?? "soxai"}
          onRequestCancel={() => setShowOcrCancelConfirm(true)}
          onContinue={() => setShowOcrCancelConfirm(false)}
          onConfirmCancel={() => {
            setShowOcrCancelConfirm(false);
            reanalyzeAbort?.abort();
          }}
          onReviewPartial={() => {
            setOcrOverlayOpen(false);
            setOcrCancelledMenu(false);
          }}
          onResumeIncomplete={() => {
            void handleReanalyzeIndexes(failedImageIndexes);
          }}
          onBackToUpload={() => {
            reanalyzeAbort?.abort();
            setOcrOverlayOpen(false);
            router.push(backHref);
          }}
        />
      )}
      <div className="border-b border-slate-200/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-8 sm:py-4">
          <Link href={HOME_TOP_HREF} className="flex items-center gap-3">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={160}
              height={40}
              className="h-auto w-[110px] sm:w-[140px]"
            />
          </Link>
          <div className="flex shrink-0 items-center gap-3 sm:gap-6">
            <Link
              href="/clients"
              className="inline-flex min-h-11 items-center text-[11px] font-semibold tracking-[0.18em] text-slate-500 transition active:text-[#071426] sm:min-h-10 sm:text-xs sm:hover:text-[#071426] sm:active:text-slate-500"
            >
              CLIENTS
            </Link>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d] sm:text-xs sm:tracking-[0.28em]">
              AI ANALYSIS
            </p>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-12 sm:pb-12 lg:py-14 lg:pb-14">
        <div className="mb-6 sm:mb-10">
          <AnalysisFlow current={2} />
        </div>

        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
            {isManualInput
              ? "MANUAL INPUT REVIEW"
              : isOuraInput
                ? "OURA EXTRACTION"
                : "SOXAI EXTRACTION"}
          </p>
          <h1 className="mt-3 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] text-[#071426] sm:mt-5 sm:text-4xl sm:leading-normal">
            抽出結果の確認
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            {isManualInput
              ? "手入力値を確認し、必要なら修正してから「AI分析を開始する」へ進んでください。"
              : isOuraInput
                ? "Oura画像から取得できたデータだけを表示しています。内容を確認して「AI分析を開始する」へ進んでください。"
                : "Vision解析の結果を自動入力しています。値が入っている項目はそのまま「AI分析を開始する」へ進めます。未取得は「要確認」です。空欄と0は区別されます。"}
          </p>
          <div className="mx-auto mt-4 flex max-w-md flex-wrap items-center justify-center gap-2 text-[12px] text-slate-600 sm:text-[13px]">
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              デバイス：{deviceLabel}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              解析方式：{analysisMethodLabel}
            </span>
          </div>
        </header>

        <AnalysisAccessBanner />

        {accessError && (
          <p className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[#a33a3a]/25 bg-[#a33a3a]/06 px-4 py-4 text-sm leading-7 text-[#a33a3a]">
            {accessError}
          </p>
        )}

        <div className="mx-auto mt-6 grid max-w-3xl grid-cols-2 gap-2.5 sm:mt-10 sm:grid-cols-4 sm:gap-3">
          {isOuraInput ? (
            <>
              <div className="min-w-0 rounded-2xl border border-[#315f68]/15 bg-white px-2.5 py-3.5 text-center sm:col-span-2 sm:px-4 sm:py-4">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-[#315f68] sm:text-[11px]">
                  取得できた項目
                </p>
                <p className="mt-1 break-words text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                  {ouraPresentCount}
                  <span className="ml-1 text-sm font-medium text-slate-400">
                    項目
                  </span>
                </p>
              </div>
              <div className="min-w-0 rounded-2xl border border-[#315f68]/15 bg-white px-2.5 py-3.5 text-center sm:col-span-2 sm:px-4 sm:py-4">
                <p className="text-[10px] font-semibold tracking-[0.18em] text-[#315f68] sm:text-[11px]">
                  解析画像
                </p>
                <p className="mt-1 break-words text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                  {images.length}
                  <span className="ml-1 text-sm font-medium text-slate-400">
                    枚
                  </span>
                </p>
              </div>
            </>
          ) : (
            <>
          <div className="min-w-0 rounded-2xl border border-[#315f68]/15 bg-white px-2.5 py-3.5 text-center sm:px-4 sm:py-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#315f68] sm:text-[11px]">
              画像から取得
            </p>
            <p className="mt-1 break-words text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
              {extractedCount}
              <span className="ml-1 text-sm font-medium text-slate-400">
                / {SOXAI_UI_METRIC_FIELDS.length}
              </span>
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-[#C48A2D]/25 bg-[#FFF8EC] px-2.5 py-3.5 text-center sm:px-4 sm:py-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#C48A2D] sm:text-[11px]">
              要確認
            </p>
            <p className="mt-1 break-words text-lg font-semibold tracking-[-0.03em] text-[#C48A2D] sm:text-2xl">
              {missingCount}
              <span className="ml-1 text-sm font-medium text-[#C48A2D]/70">
                項目
              </span>
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-[#315f68]/15 bg-white px-2.5 py-3.5 text-center sm:px-4 sm:py-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#315f68] sm:text-[11px]">
              グラフ解析
            </p>
            <p className="mt-1 break-words text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
              {graphCount}
              <span className="ml-1 text-sm font-medium text-slate-400">/ 8</span>
            </p>
          </div>
          <div className="min-w-0 rounded-2xl border border-amber-200 bg-[#fffbeb] px-2.5 py-3.5 text-center sm:px-4 sm:py-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-amber-700 sm:text-[11px]">
              要確認
            </p>
            <p className="mt-1 break-words text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
              {needsReviewCount}
              <span className="ml-1 text-sm font-medium text-slate-400">項目</span>
            </p>
          </div>
            </>
          )}
        </div>

        {!isOuraInput && sectionAcquisition.length > 0 && (
          <div className="mx-auto mt-4 max-w-3xl rounded-2xl border border-slate-200/90 bg-white px-4 py-4 sm:px-5">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">
              SECTION 取得状況
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {sectionAcquisition.map((section) => (
                <li
                  key={section.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#fafaf8] px-3 py-2.5 text-[13px]"
                >
                  <span className="font-semibold text-[#071426]">
                    {section.title}
                  </span>
                  <span
                    className={
                      section.acquired >= section.total
                        ? "font-semibold text-[#315f68]"
                        : section.acquired === 0
                          ? "font-semibold text-[#C48A2D]"
                          : "font-semibold text-[#071426]"
                    }
                  >
                    {section.acquired}/{section.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {consistencyWarnings.length > 0 && (
          <div
            className={`mx-auto mt-5 max-w-2xl rounded-2xl px-4 py-4 text-[14px] leading-7 sm:px-5 ${
              consistencyWarnings.some((w) => w.severity === "blocking")
                ? "border-2 border-red-500 bg-red-50 text-red-950"
                : "border border-amber-200 bg-[#fffbeb] text-amber-950"
            }`}
            role="alert"
          >
            <p className="font-semibold">
              {consistencyWarnings.some((w) => w.severity === "blocking")
                ? "睡眠バランスが整合していません（修正必須）"
                : "合計時間・割合に矛盾があります"}
            </p>
            {consistencyWarnings.some((w) => w.severity === "blocking") ? (
              <p className="mt-2 text-[13px] text-red-900/90">
                このまま確定すると、PDFの「③ 睡眠バランス」は内訳を印刷せず空欄になります。画像と照合して数値を直してください。
              </p>
            ) : null}
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {consistencyWarnings.map((warning) => (
                <li key={warning.message}>
                  {warning.severity === "blocking" ? (
                    <span className="mr-1 font-semibold text-red-700">[必須]</span>
                  ) : null}
                  {warning.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {conflictCount > 0 && (
          <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-amber-200 bg-[#fffbeb] px-4 py-4 text-[14px] leading-7 text-amber-950 sm:px-5">
            <p className="font-semibold">複数画像で異なる値が検出されました</p>
            <p className="mt-1 text-[13px] text-amber-900/80">
              仮採用値を表示しています。画像と照合して必要な項目を修正してください。
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {(draft.conflicts ?? []).map((conflict) => (
                <li key={conflict.key}>
                  <span className="font-semibold">{conflict.label}</span>
                  {" ：採用 "}
                  <span className="font-medium">{conflict.adopted}</span>
                  {" ／ 他の候補 "}
                  {conflict.alternatives.join("、")}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!draft.lifestyle.measurementDate?.trim() && (
          <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-amber-200 bg-[#fffbeb] px-4 py-4 text-[14px] leading-7 text-amber-950">
            分析日（測定日）が未入力です。入力画面に戻り、測定日を確認してください。
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="mt-7 space-y-6 sm:mt-10 sm:space-y-8"
        >
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
            <aside className="lg:sticky lg:top-6 lg:col-span-5">
              <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
                <div className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                  <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                    SOURCE IMAGES
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#071426]">
                    元画像との照合
                  </h2>
                  <p className="mt-1 text-[13px] leading-6 text-slate-500">
                    抽出値と並べて確認できます（{images.length}枚）
                  </p>
                </div>
                {imageStatuses.length > 0 && (
                  <div className="space-y-2 border-b border-slate-100 px-4 py-4 sm:px-6">
                    {imageStatuses.map((item) => {
                      const badge = imageStatusLabel(item.status);
                      const canRetry = item.status !== "success";
                      return (
                        <div
                          key={item.index}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-[#fafaf8] px-3 py-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => setActiveImageIndex(item.index)}
                            className="min-w-0 flex-1 text-left"
                          >
                            <span className="block truncate text-[13px] font-semibold text-[#071426]">
                              {item.label}
                            </span>
                            <span
                              className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </button>
                          {canRetry && !isOuraInput && (
                            <button
                              type="button"
                              disabled={reanalyzing}
                              onClick={() =>
                                void handleReanalyzeIndexes([item.index])
                              }
                              className="shrink-0 rounded-full border border-[#315f68]/25 px-3 py-1.5 text-[12px] font-semibold text-[#315f68] transition hover:bg-[#315f68]/08 disabled:opacity-50"
                            >
                              再解析
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {failedImageIndexes.length > 1 && !isOuraInput && (
                      <button
                        type="button"
                        disabled={reanalyzing}
                        onClick={() =>
                          void handleReanalyzeIndexes(failedImageIndexes)
                        }
                        className="mt-1 w-full rounded-full border border-[#315f68]/25 bg-white px-3 py-2.5 text-[13px] font-semibold text-[#315f68] transition hover:bg-[#f3f7f8] disabled:opacity-50"
                      >
                        未完了の画像をまとめて再解析
                      </button>
                    )}
                  </div>
                )}
                <div className="px-4 py-4 sm:px-6 sm:py-5">
                  {images.length > 0 ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={images[safeImageIndex]}
                        alt={`${isOuraInput ? "Oura" : "SOXAI"}スクリーンショット ${safeImageIndex + 1}`}
                        className="max-h-[70vh] w-full rounded-2xl border border-slate-100 bg-[#f7f7f5] object-contain"
                      />
                      {images.length > 1 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {images.map((src, index) => (
                            <button
                              key={`${index}-${src.slice(0, 24)}`}
                              type="button"
                              onClick={() => setActiveImageIndex(index)}
                              className={`overflow-hidden rounded-xl border-2 transition ${
                                index === safeImageIndex
                                  ? "border-[#315f68]"
                                  : "border-transparent opacity-70 hover:opacity-100"
                              }`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt={`サムネイル ${index + 1}`}
                                className="h-14 w-10 object-cover"
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-slate-500">
                      {isManualInput ? "手入力モードでは画像表示はありません" : "画像がありません"}
                    </p>
                  )}
                </div>
              </section>
            </aside>

            <div className="space-y-6 lg:col-span-7">
              {isOuraInput ? (
                <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white p-4 shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)] sm:p-6">
                  <div className="mb-4 border-b border-slate-100 pb-4">
                    <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                      OURA DATA
                    </p>
                    <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                      取得できたOuraデータ
                    </h2>
                    <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-500 sm:text-sm sm:leading-7">
                      画像から読み取れた項目だけを表示しています。内容を確認して分析へ進んでください。
                    </p>
                  </div>
                  <OuraCategoryResults
                    categories={ouraDisplayCategories}
                    imageCount={images.length}
                    compact
                  />
                </section>
              ) : (
                <>
              <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
                <div className="border-b border-slate-100 px-4 py-5 sm:px-8 sm:py-8">
                  <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                    PRIORITY · BEDTIME / WAKE / SKIN / STRESS
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                    重点4項目の確認
                  </h2>
                  <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-500 sm:text-sm sm:leading-7">
                    入眠時間・起床時間・皮膚温度・ストレスは Vision
                    解析で自動入力します。取得できなかった項目は「要確認」表示のまま分析へ進めます（手入力・推測補完しません）。
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-3.5 px-4 py-5 sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-8">
                  {criticalFields.map(renderField)}
                </div>
              </section>

              <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
                <div className="border-b border-slate-100 px-4 py-5 sm:px-8 sm:py-8">
                  <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                    CONFIRMED METRICS
                  </p>
                  <h2 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                    その他の睡眠データ
                  </h2>
                  <p className="mt-2 max-w-xl text-[14px] leading-6 text-slate-500 sm:text-sm sm:leading-7">
                    Vision解析で取得した値を自動入力しています。取得できなかった項目のみ「要確認」です（手入力は不要です）。
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-3.5 px-4 py-5 sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-8">
                  {otherFields.map(renderField)}
                </div>
              </section>
                </>
              )}
            </div>
          </div>

          <section className="rounded-[28px] border border-slate-200/90 bg-white px-4 py-4 sm:px-8 sm:py-5">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[#8a6a2d]">
              SUBJECT
            </p>
            <p className="mt-2 text-base font-semibold text-[#071426]">
              {draft.lifestyle.clientName}
              <span className="ml-3 text-sm font-medium text-slate-400">
                {draft.lifestyle.measurementDate || "測定日未設定"}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {[
                draft.lifestyle.age?.trim()
                  ? `${draft.lifestyle.age.trim()}歳`
                  : null,
                draft.lifestyle.gender === "female"
                  ? "女性"
                  : draft.lifestyle.gender === "male"
                    ? "男性"
                    : draft.lifestyle.gender === "other"
                      ? "その他"
                      : draft.lifestyle.gender === "unspecified"
                        ? "回答しない"
                        : null,
              ]
                .filter(Boolean)
                .join(" · ") || "年齢・性別未入力（参考分析）"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {isOuraInput ? "Oura Ring" : isManualInput ? "手入力" : "SOXAI"}画像{" "}
              {draft.images.length} 枚 · 生活習慣データ付き
              {draft.lifestyle.clientId ? " · 既存クライアントに紐づけ" : ""}
            </p>
          </section>

          <section className="relative overflow-hidden rounded-[28px] bg-[#071426] px-4 py-8 text-center shadow-[0_30px_90px_-40px_rgba(7,20,38,0.55)] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.35),transparent_55%)]" />
            <div className="relative z-10">
              <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
                READY TO ANALYZE
              </p>
              <h2 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                抽出結果を確認して分析する
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-white/60 sm:text-sm sm:leading-7">
                この確認データが Medical / Visual / PDF /
                長期推移の共通データソースになります。
              </p>

              <div className="mt-7 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center">
                <Link
                  href={backHref}
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/25 px-8 py-3.5 text-base font-semibold text-white/85 transition active:bg-white/10 sm:w-auto sm:hover:bg-white/10 sm:active:bg-transparent"
                >
                  入力に戻る
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-full bg-white px-8 py-4 text-base font-semibold text-[#071426] shadow-[0_18px_50px_-20px_rgba(255,255,255,0.55)] transition duration-500 active:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-12 sm:text-lg sm:hover:-translate-y-1 sm:hover:bg-[#f4f4f4] sm:active:translate-y-0 disabled:sm:hover:translate-y-0"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-[#071426]/20 border-t-[#071426]" />
                      準備中...
                    </>
                  ) : (
                    <>
                      AI分析を開始する
                      <span className="transition-transform duration-500 group-hover:translate-x-1">
                        →
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}
