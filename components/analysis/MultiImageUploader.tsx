"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import RequiredImageGuide from "@/components/analysis/RequiredImageGuide";
import UploadedImageCard from "@/components/analysis/UploadedImageCard";
import MissingImagesAlert from "@/components/analysis/MissingImagesAlert";
import type {
  WearableDevice,
  WearableImageCategory,
  WearableRequiredImageSpec,
  WearableUploadedImage,
} from "@/lib/wearable-analysis";
import {
  revokeWearablePreviewUrls,
  toWearableUploadedImage,
  validateWearableImageFiles,
  WEARABLE_MAX_IMAGES,
} from "@/lib/wearable-analysis";
import { listMissingRequiredCategories } from "@/lib/wearable-devices";
import { classifyWearableImages } from "@/lib/wearable-classify-runner";
import {
  formatConfidencePercent,
} from "@/lib/wearable-classify";
import { resolveSoxaiVisionExtraction } from "@/lib/soxai-vision-runner";
import {
  buildBulkExtractSummary,
  type BulkExtractSummary,
} from "@/lib/soxai-bulk-extract-summary";

export type CategoryImageMap = Partial<
  Record<WearableImageCategory, WearableUploadedImage[]>
>;

type MultiImageUploaderProps = {
  deviceType: WearableDevice;
  specs: readonly WearableRequiredImageSpec[];
  imagesByCategory: CategoryImageMap;
  onChange: (next: CategoryImageMap) => void;
  showMissingAlert?: boolean;
};

function flattenImages(map: CategoryImageMap): WearableUploadedImage[] {
  return Object.values(map).flatMap((list) => list ?? []);
}

function allFiles(map: CategoryImageMap): File[] {
  return flattenImages(map).map((image) => image.file);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("failed to read file"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("read error"));
    reader.readAsDataURL(file);
  });
}

/** 一括解析セット（カテゴリ未割当・解析用）。要手動とは status で区別する */
function isBulkAnalysisImage(image: WearableUploadedImage): boolean {
  return (
    image.imageCategory === "unknown" &&
    image.status !== "needs_manual" &&
    image.status !== "error"
  );
}

function isNeedsManualImage(image: WearableUploadedImage): boolean {
  return (
    image.imageCategory === "unknown" &&
    (image.status === "needs_manual" || image.status === "error")
  );
}

export default function MultiImageUploader({
  deviceType,
  specs,
  imagesByCategory,
  onChange,
  showMissingAlert = false,
}: MultiImageUploaderProps) {
  const [dragOver, setDragOver] = useState(false);
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [classifying, setClassifying] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extractPhase, setExtractPhase] = useState<string | null>(null);
  const [slotNote, setSlotNote] = useState<string | null>(null);
  const [bulkExtractSummary, setBulkExtractSummary] =
    useState<BulkExtractSummary | null>(null);
  const [bulkExtractError, setBulkExtractError] = useState<string | null>(null);
  const bulkAbortRef = useRef<AbortController | null>(null);

  const filledCategories = useMemo(() => {
    const set = new Set<WearableImageCategory>();
    for (const spec of specs) {
      const list = imagesByCategory[spec.category];
      if (list && list.length > 0) set.add(spec.category);
    }
    return set;
  }, [imagesByCategory, specs]);

  const missing = useMemo(
    () =>
      listMissingRequiredCategories({
        device: deviceType,
        filledCategories,
      }),
    [deviceType, filledCategories],
  );

  const unknownList = imagesByCategory.unknown ?? [];
  const bulkAnalysisImages = useMemo(
    () => unknownList.filter(isBulkAnalysisImage),
    [unknownList],
  );
  const needsManualImages = useMemo(
    () => unknownList.filter(isNeedsManualImage),
    [unknownList],
  );
  const totalCount = flattenImages(imagesByCategory).length;

  const commitMap = useCallback(
    (next: CategoryImageMap) => {
      onChange(next);
    },
    [onChange],
  );

  /**
   * SOXAI 一括解析専用: 画面種類の事前分類は行わない。
   * （Oura は OuraAnalysisPanel を使用。このコンポーネントでは扱わない）
   */
  const runBulkVisionOnMap = useCallback(
    async (map: CategoryImageMap, signal: AbortSignal) => {
      if (deviceType !== "soxai") return;
      const allForExtract = flattenImages(map).map((image) => image.file);
      if (allForExtract.length === 0) return;

      setBulkExtractSummary(null);
      setBulkExtractError(null);
      setExtractPhase(`${allForExtract.length}枚の画像を解析中…`);
      setExtracting(true);

      try {
        const dataUrls = await Promise.all(allForExtract.map(fileToDataUrl));
        if (signal.aborted) return;

        setExtractPhase("データを抽出しています…");
        const vision = await resolveSoxaiVisionExtraction(dataUrls, [], {
          signal,
        });
        if (signal.aborted) return;
        if (vision.cancelled) return;

        setExtractPhase("抽出結果を統合しています…");
        const summary = buildBulkExtractSummary({
          metrics: vision.metrics,
          imageCount: allForExtract.length,
        });
        setBulkExtractSummary(summary);
        if (vision.error) setBulkExtractError(vision.error);
        else if (summary.confirmedCount === 0) {
          setBulkExtractError(
            "数値を取得できませんでした。画像が鮮明か、下の1〜7から不足項目だけ追加してください。",
          );
        }
      } catch (extractError) {
        setBulkExtractError(
          extractError instanceof Error
            ? extractError.message
            : String(extractError),
        );
      } finally {
        setExtracting(false);
        setExtractPhase(null);
      }
    },
    [deviceType],
  );

  const ingestBulkFiles = useCallback(
    async (files: File[]) => {
      const { accepted, errors } = validateWearableImageFiles({
        incoming: files,
        existing: allFiles(imagesByCategory),
        maxTotal: WEARABLE_MAX_IMAGES,
      });
      if (accepted.length === 0) {
        setLocalErrors(errors);
        return;
      }

      setLocalErrors(errors);
      setSlotNote(null);
      bulkAbortRef.current?.abort();
      const controller = new AbortController();
      bulkAbortRef.current = controller;

      // 分類せず解析セットへ追加（カテゴリ確定はしない）
      const created: WearableUploadedImage[] = accepted.map((file) => ({
        ...toWearableUploadedImage({
          file,
          deviceType,
          imageCategory: "unknown",
          required: false,
        }),
        status: "ready",
        confidence: null,
        errorMessage: null,
      }));

      const next: CategoryImageMap = {
        ...imagesByCategory,
        unknown: [...(imagesByCategory.unknown ?? []), ...created],
      };
      commitMap(next);

      if (deviceType === "soxai") {
        await runBulkVisionOnMap(next, controller.signal);
        return;
      }

      setSlotNote(
        `${accepted.length}枚を解析セットに追加しました。分析開始でデータを読み取ります。`,
      );
    },
    [commitMap, deviceType, imagesByCategory, runBulkVisionOnMap],
  );

  const addFilesToCategory = useCallback(
    async (category: WearableImageCategory, files: File[], required: boolean) => {
      const spec = specs.find((s) => s.category === category);
      const maxFiles = spec?.maxFiles ?? 2;
      const existingInCategory = imagesByCategory[category] ?? [];
      const remainingSlots = Math.max(0, maxFiles - existingInCategory.length);
      if (remainingSlots <= 0) {
        setLocalErrors([
          `「${spec?.label ?? category}」は最大${maxFiles}枚までです。差し替えは削除後に行ってください。`,
        ]);
        return;
      }

      const { accepted, errors } = validateWearableImageFiles({
        incoming: files.slice(0, remainingSlots),
        existing: allFiles(imagesByCategory),
        maxTotal: WEARABLE_MAX_IMAGES,
      });
      setLocalErrors(errors);
      if (accepted.length === 0) return;

      setClassifying(true);
      const { items, elapsedMs, successRate } = await classifyWearableImages({
        files: accepted,
        deviceType,
      });
      setClassifying(false);

      const created = items.map((item) => ({
        ...item.image,
        imageCategory: category,
        required,
        // ユーザーが枠を指定した場合は手動確定（confidence は参考表示）
        status: "ready" as const,
      }));

      setSlotNote(
        `「${spec?.label ?? category}」に ${created.length}枚を追加しました（参考成功率 ${successRate}% · ${elapsedMs}ms）`,
      );
      commitMap({
        ...imagesByCategory,
        [category]: [...existingInCategory, ...created],
      });
    },
    [commitMap, deviceType, imagesByCategory, specs],
  );

  const removeImage = useCallback(
    (category: WearableImageCategory, imageId: string) => {
      const list = imagesByCategory[category] ?? [];
      const target = list.find((item) => item.id === imageId);
      if (target) revokeWearablePreviewUrls([target]);
      const remaining = list.filter((item) => item.id !== imageId);
      const next = { ...imagesByCategory };
      if (remaining.length === 0) delete next[category];
      else next[category] = remaining;
      commitMap(next);
    },
    [commitMap, imagesByCategory],
  );

  const replaceImage = useCallback(
    async (category: WearableImageCategory, imageId: string, file: File) => {
      const { accepted, errors } = validateWearableImageFiles({
        incoming: [file],
        existing: allFiles(imagesByCategory).filter((f) => {
          const current = (imagesByCategory[category] ?? []).find(
            (img) => img.id === imageId,
          );
          return current ? f !== current.file : true;
        }),
        maxTotal: WEARABLE_MAX_IMAGES,
      });
      setLocalErrors(errors);
      if (accepted[0] == null) return;

      const spec = specs.find((s) => s.category === category);
      const list = imagesByCategory[category] ?? [];
      const current = list.find((img) => img.id === imageId);

      // 一括解析セット（unknown）の差し替えは分類しない
      if (category === "unknown" && current && isBulkAnalysisImage(current)) {
        revokeWearablePreviewUrls([current]);
        const replaced = {
          ...toWearableUploadedImage({
            file: accepted[0],
            deviceType,
            imageCategory: "unknown",
            required: false,
          }),
          status: "ready" as const,
          confidence: null,
          errorMessage: null,
        };
        const nextList = list.map((item) =>
          item.id === imageId ? replaced : item,
        );
        const next: CategoryImageMap = {
          ...imagesByCategory,
          unknown: nextList,
        };
        commitMap(next);
        bulkAbortRef.current?.abort();
        const controller = new AbortController();
        bulkAbortRef.current = controller;
        void runBulkVisionOnMap(next, controller.signal);
        return;
      }

      setClassifying(true);
      const { items } = await classifyWearableImages({
        files: [accepted[0]],
        deviceType,
      });
      setClassifying(false);

      const classified = items[0]?.image;
      const nextList = list.map((item) => {
        if (item.id !== imageId) return item;
        revokeWearablePreviewUrls([item]);
        if (classified) {
          return {
            ...classified,
            imageCategory: category,
            required: spec?.required ?? item.required,
            status: "ready" as const,
          };
        }
        return toWearableUploadedImage({
          file: accepted[0]!,
          deviceType,
          imageCategory: category,
          required: spec?.required ?? item.required,
        });
      });
      commitMap({ ...imagesByCategory, [category]: nextList });
    },
    [commitMap, deviceType, imagesByCategory, runBulkVisionOnMap, specs],
  );

  const assignUnknownCategory = useCallback(
    (imageId: string, category: WearableImageCategory) => {
      const unknownList = imagesByCategory.unknown ?? [];
      const target = unknownList.find((item) => item.id === imageId);
      if (!target) return;
      const spec = specs.find((s) => s.category === category);
      // 一括フローでは同一カテゴリ複数枚を許可（枠埋まりで拒否しない）
      const remainingUnknown = unknownList.filter((item) => item.id !== imageId);
      const assigned: WearableUploadedImage = {
        ...target,
        imageCategory: category,
        required: spec?.required ?? false,
        status: "ready",
        errorMessage: null,
      };
      const next: CategoryImageMap = {
        ...imagesByCategory,
        [category]: [...(imagesByCategory[category] ?? []), assigned],
      };
      if (remainingUnknown.length === 0) delete next.unknown;
      else next.unknown = remainingUnknown;
      setLocalErrors([]);
      commitMap(next);
    },
    [commitMap, imagesByCategory, specs],
  );

  const clearAll = useCallback(() => {
    bulkAbortRef.current?.abort();
    revokeWearablePreviewUrls(flattenImages(imagesByCategory));
    setLocalErrors([]);
    setSlotNote(null);
    setBulkExtractSummary(null);
    setBulkExtractError(null);
    setClassifying(false);
    setExtracting(false);
    setExtractPhase(null);
    commitMap({});
  }, [commitMap, imagesByCategory]);

  return (
    <div className="space-y-5">
      <RequiredImageGuide specs={specs} filledCategories={filledCategories} />

      <div
        onDragEnter={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDragOver(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const files = Array.from(event.dataTransfer.files ?? []);
          if (files.length > 0) void ingestBulkFiles(files);
        }}
        className={`rounded-2xl border border-dashed px-4 py-6 text-center transition sm:px-6 ${
          dragOver
            ? "border-[#315f68] bg-[#f4f7f7]"
            : "border-slate-300 bg-[#fafaf8]"
        }`}
      >
        <p className="text-[14px] font-semibold text-[#071426]">
          複数画像をまとめて解析
        </p>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          複数のスクリーンショットをまとめて追加すると、AIが画像全体を解析し、睡眠分析に必要なデータを抽出します。
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          PNG / JPG / JPEG / WEBP · 1枚10MBまで · 最大{WEARABLE_MAX_IMAGES}枚
        </p>
        <input
          id={`wearable-bulk-${deviceType}`}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={classifying || extracting}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) void ingestBulkFiles(files);
            event.target.value = "";
          }}
        />
        <label
          htmlFor={`wearable-bulk-${deviceType}`}
          className={`mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#315f68]/25 bg-white px-4 py-3 text-[14px] font-semibold text-[#071426] transition hover:border-[#315f68]/45 hover:bg-white ${
            classifying || extracting
              ? "cursor-wait opacity-60"
              : "cursor-pointer"
          }`}
        >
          {extracting || classifying
            ? "解析中…"
            : "画像を選択（複数可）"}
        </label>
        <p className="mt-3 text-[12px] text-slate-400">
          {totalCount} / {WEARABLE_MAX_IMAGES} 枚
        </p>
        {totalCount > 0 ? (
          <button
            type="button"
            onClick={clearAll}
            className="mt-2 text-[12px] font-semibold text-slate-500 transition hover:text-[#071426]"
          >
            すべてクリア
          </button>
        ) : null}
      </div>

      {extracting || classifying ? (
        <p className="rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3 text-[13px] text-[#315f68]">
          {extractPhase ??
            (classifying
              ? "画像を登録しています…"
              : "画像を解析しています…")}
        </p>
      ) : null}

      {slotNote ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-600">
          {slotNote}
        </p>
      ) : null}

      {bulkExtractSummary ? (
        <div className="rounded-2xl border border-[#315f68]/20 bg-white px-4 py-4 sm:px-5">
          <p className="text-[14px] font-semibold text-[#071426]">
            解析完了
          </p>
          <p className="mt-1 text-[13px] text-slate-600">
            {bulkExtractSummary.imageCount}枚の画像を解析しました
          </p>
          <p className="mt-1.5 text-[13px] font-medium text-[#071426]">
            取得済み {bulkExtractSummary.confirmedCount} /{" "}
            {bulkExtractSummary.confirmedCount +
              bulkExtractSummary.reviewCount +
              bulkExtractSummary.missingCount}
            項目
            {bulkExtractSummary.reviewCount > 0
              ? ` · 要確認 ${bulkExtractSummary.reviewCount}項目`
              : ""}
            {bulkExtractSummary.missingCount > 0
              ? ` · 未取得 ${bulkExtractSummary.missingCount}項目`
              : ""}
          </p>
          {bulkExtractSummary.missingCount > 0 ? (
            <p className="mt-2 text-[12px] leading-5 text-slate-500">
              未取得がある場合は、下の1〜7から不足項目の画面だけ追加してください。
            </p>
          ) : null}
          <ul className="mt-3 max-h-64 space-y-1.5 overflow-y-auto text-[13px]">
            {bulkExtractSummary.items
              .filter((item) => item.status !== "missing")
              .map((item) => (
                <li
                  key={item.key}
                  className="flex items-start gap-2 text-[#071426]"
                >
                  <span className="mt-0.5 shrink-0 font-semibold text-[#315f68]">
                    {item.status === "review" ? "△" : "✓"}
                  </span>
                  <span>
                    {item.label}
                    {item.displayValue ? (
                      <span className="text-slate-600">
                        {"　"}
                        {item.displayValue}
                      </span>
                    ) : null}
                    {item.status === "review" ? (
                      <span className="ml-1 text-[12px] text-amber-700">
                        要確認
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            {bulkExtractSummary.items
              .filter((item) => item.status === "missing")
              .map((item) => (
                <li
                  key={item.key}
                  className="flex items-start gap-2 text-slate-400"
                >
                  <span className="mt-0.5 shrink-0">×</span>
                  <span>
                    {item.label}
                    <span className="ml-1 text-[12px]">未取得</span>
                  </span>
                </li>
              ))}
          </ul>
          {bulkExtractError ? (
            <p className="mt-3 text-[12px] text-amber-700">{bulkExtractError}</p>
          ) : null}
        </div>
      ) : null}

      {bulkExtractError && !bulkExtractSummary ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          データ読み取りで問題がありました: {bulkExtractError}
          （画像は登録済みです。下の1〜7から不足項目を追加できます）
        </p>
      ) : null}

      {localErrors.length > 0 ? (
        <ul className="space-y-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] text-rose-700">
          {localErrors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      ) : null}

      {showMissingAlert ? <MissingImagesAlert missing={missing} /> : null}

      {bulkAnalysisImages.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-[#fafaf8] p-4 sm:p-5">
          <p className="text-[14px] font-semibold text-[#071426]">
            一括解析セット（{bulkAnalysisImages.length}枚）
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            カテゴリ分けせず、これらの画像全体から睡眠データを読み取ります。不足があれば下の1〜7から追加できます。
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {bulkAnalysisImages.map((image) => (
              <UploadedImageCard
                key={image.id}
                image={image}
                label="解析セット"
                replaceInputId={`replace-bulk-${image.id}`}
                onRemove={() => removeImage("unknown", image.id)}
                onReplace={(file) => void replaceImage("unknown", image.id, file)}
              />
            ))}
          </div>
        </div>
      ) : null}

      {needsManualImages.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 sm:p-5">
          <p className="text-[14px] font-semibold text-[#071426]">
            要手動選択
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            画面種類を選んでください（個別補完用）。
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {needsManualImages.map((image) => (
              <UploadedImageCard
                key={image.id}
                image={image}
                label="要手動"
                replaceInputId={`replace-unknown-${image.id}`}
                categoryOptions={specs}
                onAssignCategory={(category) =>
                  assignUnknownCategory(image.id, category)
                }
                onRemove={() => removeImage("unknown", image.id)}
                onReplace={(file) => void replaceImage("unknown", image.id, file)}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        {specs.map((spec, index) => {
          const images = imagesByCategory[spec.category] ?? [];
          const hasFile = images.length > 0;
          const canPickMore = images.length < spec.maxFiles;
          const inputId = `wearable-slot-${deviceType}-${spec.category}`;
          return (
            <div
              key={spec.category}
              className="rounded-2xl border border-slate-200 bg-[#fafaf8] p-4 transition sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-[#071426] sm:text-sm">
                    <span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#071426] text-[11px] font-bold text-white">
                      {index + 1}
                    </span>
                    {spec.label}
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-slate-500 sm:text-xs sm:leading-5">
                    {spec.description}
                  </p>
                  <ul className="mt-2.5 space-y-1 text-[12px] leading-5 text-slate-500 sm:text-[11px]">
                    {spec.metrics.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#8a6a2d]" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      spec.required
                        ? "bg-[#8a6a2d]/12 text-[#8a6a2d]"
                        : "bg-slate-200/70 text-slate-500"
                    }`}
                  >
                    {spec.required ? "必須" : "任意"}
                  </span>
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      hasFile
                        ? "bg-[#315f68]/12 text-[#315f68]"
                        : "bg-slate-200/60 text-slate-500"
                    }`}
                  >
                    {hasFile
                      ? images.length > spec.maxFiles
                        ? `登録 ${images.length}枚`
                        : `アップロード済み ${images.length}/${spec.maxFiles}`
                      : "未登録"}
                  </span>
                </div>
              </div>

              <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
                <input
                  id={inputId}
                  type="file"
                  multiple={spec.maxFiles > 1}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={classifying}
                  onChange={(event) => {
                    const selected = Array.from(event.target.files ?? []);
                    if (selected.length > 0) {
                      void addFilesToCategory(
                        spec.category,
                        selected,
                        spec.required,
                      );
                    }
                    event.target.value = "";
                  }}
                />
                <label
                  htmlFor={inputId}
                  className={`inline-flex min-h-11 items-center justify-center rounded-xl border border-[#315f68]/25 bg-white px-4 py-3 text-[14px] font-semibold text-[#071426] transition hover:border-[#315f68]/45 hover:bg-[#f4f7f7] sm:text-sm ${
                    classifying ? "cursor-wait opacity-60" : "cursor-pointer"
                  }`}
                >
                  {!hasFile
                    ? "画像を選択"
                    : canPickMore
                      ? "画像を追加"
                      : "枠が埋まりました"}
                </label>
              </div>

              {hasFile ? (
                <div className="mt-3 flex flex-wrap gap-3">
                  {images.map((image) => (
                    <div key={image.id} className="space-y-1">
                      <UploadedImageCard
                        image={image}
                        label={spec.label}
                        replaceInputId={`replace-${image.id}`}
                        onRemove={() => removeImage(spec.category, image.id)}
                        onReplace={(file) =>
                          void replaceImage(spec.category, image.id, file)
                        }
                      />
                      {image.confidence != null ? (
                        <p className="text-[11px] text-slate-400">
                          信頼度 {formatConfidencePercent(image.confidence)}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** MultiImageUploader の状態から File[] をカテゴリ順で取り出す（既存 API 送信用） */
export function filesFromCategoryMap(
  specs: readonly WearableRequiredImageSpec[],
  map: CategoryImageMap,
): File[] {
  const fromSpecs = specs.flatMap((spec) =>
    (map[spec.category] ?? []).map((image) => image.file),
  );
  // 一括解析セット（unknown）も提出対象に含める
  const fromBulk = (map.unknown ?? []).map((image) => image.file);
  return [...fromSpecs, ...fromBulk];
}

/** SOXAI 用: category map → slot Files（一括解析セット unknown も含める） */
export function soxaiSlotFilesFromCategoryMap(
  specs: readonly WearableRequiredImageSpec[],
  map: CategoryImageMap,
): Partial<
  Record<NonNullable<WearableRequiredImageSpec["soxaiSection"]>, File[]>
> {
  const out: Partial<
    Record<NonNullable<WearableRequiredImageSpec["soxaiSection"]>, File[]>
  > = {};
  for (const spec of specs) {
    if (!spec.soxaiSection) continue;
    const files = (map[spec.category] ?? []).map((image) => image.file);
    if (files.length > 0) out[spec.soxaiSection] = files;
  }
  // 一括解析セット（カテゴリ未割当）も Vision 解析から除外しない
  const unknownFiles = (map.unknown ?? []).map((image) => image.file);
  if (unknownFiles.length > 0) {
    const anchor =
      specs.find((s) => s.soxaiSection === "sleep_overview")?.soxaiSection ??
      specs.find((s) => s.soxaiSection)?.soxaiSection;
    if (anchor) {
      out[anchor] = [...(out[anchor] ?? []), ...unknownFiles];
    }
  }
  return out;
}
