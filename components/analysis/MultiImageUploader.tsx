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
  CLASSIFY_CONFIDENCE_AUTO,
  CLASSIFY_CONFIDENCE_CANDIDATE,
  formatConfidencePercent,
} from "@/lib/wearable-classify";

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

function roomInCategory(
  map: CategoryImageMap,
  category: WearableImageCategory,
  maxFiles: number,
): number {
  const existing = map[category] ?? [];
  return Math.max(0, maxFiles - existing.length);
}

function placeImage(
  map: CategoryImageMap,
  image: WearableUploadedImage,
  specs: readonly WearableRequiredImageSpec[],
): { map: CategoryImageMap; overflow: boolean } {
  const category = image.imageCategory;
  if (category === "unknown") {
    return {
      map: {
        ...map,
        unknown: [...(map.unknown ?? []), image],
      },
      overflow: false,
    };
  }
  const spec = specs.find((s) => s.category === category);
  const maxFiles = spec?.maxFiles ?? 2;
  const room = roomInCategory(map, category, maxFiles);
  if (room <= 0) {
    return {
      map: {
        ...map,
        unknown: [
          ...(map.unknown ?? []),
          {
            ...image,
            imageCategory: "unknown",
            status: "needs_manual",
            errorMessage: "該当カテゴリの枠が埋まっているため要手動割当",
          },
        ],
      },
      overflow: true,
    };
  }
  return {
    map: {
      ...map,
      [category]: [...(map[category] ?? []), image],
    },
    overflow: false,
  };
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
  const [classifySummary, setClassifySummary] = useState<string | null>(null);
  const classifyAbortRef = useRef<AbortController | null>(null);

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

  const unknownImages = imagesByCategory.unknown ?? [];
  const totalCount = flattenImages(imagesByCategory).length;

  const commitMap = useCallback(
    (next: CategoryImageMap) => {
      onChange(next);
    },
    [onChange],
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
      setClassifying(true);
      setClassifySummary(null);
      classifyAbortRef.current?.abort();
      const controller = new AbortController();
      classifyAbortRef.current = controller;

      const { items, elapsedMs, successRate, error } =
        await classifyWearableImages({
          files: accepted,
          deviceType,
          signal: controller.signal,
        });

      if (controller.signal.aborted) return;

      let next: CategoryImageMap = { ...imagesByCategory };
      let overflowCount = 0;
      for (const item of items) {
        const placed = placeImage(next, item.image, specs);
        next = placed.map;
        if (placed.overflow) overflowCount += 1;
      }

      const autoCount = items.filter((i) => i.mode === "auto").length;
      const candidateCount = items.filter((i) => i.mode === "candidate").length;
      const manualCount = items.filter((i) => i.mode === "manual").length;

      setClassifySummary(
        `分類完了: 自動${autoCount} / 候補${candidateCount} / 要手動${manualCount} · 成功率 ${successRate}% · ${elapsedMs}ms` +
          (error ? ` · ${error}` : ""),
      );
      if (overflowCount > 0) {
        setLocalErrors((prev) => [
          ...prev,
          `${overflowCount}枚はカテゴリ枠が埋まっていたため「要手動」に移しました。`,
        ]);
      }
      setClassifying(false);
      commitMap(next);
    },
    [commitMap, deviceType, imagesByCategory, specs],
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

      setClassifySummary(
        `枠指定で登録: ${created.length}枚 · 参考成功率 ${successRate}% · ${elapsedMs}ms`,
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

      setClassifying(true);
      const { items } = await classifyWearableImages({
        files: [accepted[0]],
        deviceType,
      });
      setClassifying(false);

      const classified = items[0]?.image;
      const spec = specs.find((s) => s.category === category);
      const list = imagesByCategory[category] ?? [];
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
    [commitMap, deviceType, imagesByCategory, specs],
  );

  const assignUnknownCategory = useCallback(
    (imageId: string, category: WearableImageCategory) => {
      const unknownList = imagesByCategory.unknown ?? [];
      const target = unknownList.find((item) => item.id === imageId);
      if (!target) return;
      const spec = specs.find((s) => s.category === category);
      const maxFiles = spec?.maxFiles ?? 2;
      if (roomInCategory(imagesByCategory, category, maxFiles) <= 0) {
        setLocalErrors([
          `「${spec?.label ?? category}」の枠が埋まっています。先に不要な画像を削除してください。`,
        ]);
        return;
      }
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
    classifyAbortRef.current?.abort();
    revokeWearablePreviewUrls(flattenImages(imagesByCategory));
    setLocalErrors([]);
    setClassifySummary(null);
    setClassifying(false);
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
          複数画像をまとめて追加（AI自動分類）
        </p>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          ドラッグ＆ドロップ、またはファイル選択（PNG / JPG / JPEG / WEBP · 1枚10MBまで ·
          最大{WEARABLE_MAX_IMAGES}枚）
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          {CLASSIFY_CONFIDENCE_AUTO}%以上は自動登録 · {CLASSIFY_CONFIDENCE_CANDIDATE}〜
          {CLASSIFY_CONFIDENCE_AUTO - 1}%は候補 · 未満は要手動選択
        </p>
        <input
          id={`wearable-bulk-${deviceType}`}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={classifying}
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) void ingestBulkFiles(files);
            event.target.value = "";
          }}
        />
        <label
          htmlFor={`wearable-bulk-${deviceType}`}
          className={`mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#315f68]/25 bg-white px-4 py-3 text-[14px] font-semibold text-[#071426] transition hover:border-[#315f68]/45 hover:bg-white ${
            classifying ? "cursor-wait opacity-60" : "cursor-pointer"
          }`}
        >
          {classifying ? "AI分類中…" : "画像を選択（複数可）"}
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

      {classifying ? (
        <p className="rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3 text-[13px] text-[#315f68]">
          画像を理解して画面種類を分類しています（OCRではありません）…
        </p>
      ) : null}

      {classifySummary ? (
        <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[13px] text-slate-600">
          {classifySummary}
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

      {unknownImages.length > 0 ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 sm:p-5">
          <p className="text-[14px] font-semibold text-[#071426]">
            要手動選択（unknown）
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            信頼度が低い、または判別できなかった画像です。画面種類を選んでください。
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {unknownImages.map((image) => (
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
                      ? `アップロード済み ${images.length}/${spec.maxFiles}`
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
  return specs.flatMap((spec) =>
    (map[spec.category] ?? []).map((image) => image.file),
  );
}

/** SOXAI 用: category map → slot Files */
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
  return out;
}
