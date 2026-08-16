"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import OuraCategoryResults from "@/components/analysis/OuraCategoryResults";
import {
  buildOuraDisplayCategories,
  type OuraDisplayCategory,
} from "@/lib/oura-display-categories";
import {
  OURA_MAX_IMAGES,
  resolveOuraVisionExtraction,
} from "@/lib/oura-vision-runner";
import type { OuraVisionMetrics } from "@/lib/oura-vision-schema";

type OuraAnalysisPanelProps = {
  files: File[];
  onChange: (files: File[]) => void;
  showMissing?: boolean;
  /** 解析完了時に親へ Vision 結果を渡す（任意） */
  onExtracted?: (payload: {
    vision: OuraVisionMetrics;
    categories: OuraDisplayCategory[];
  }) => void;
};

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

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

/**
 * Oura 専用の一括画像解析パネル。
 * カテゴリ分類 UI は持たない。SOXAI MultiImageUploader とは完全分離。
 */
export default function OuraAnalysisPanel({
  files,
  onChange,
  showMissing = false,
  onExtracted,
}: OuraAnalysisPanelProps) {
  const [extracting, setExtracting] = useState(false);
  const [phase, setPhase] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<OuraDisplayCategory[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const lastExtractKeyRef = useRef<string>("");

  const filesFingerprint = useMemo(
    () => files.map(fileKey).join("|"),
    [files],
  );

  // プレビュー URL（解析と非同期で更新）
  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, [filesFingerprint]); // eslint-disable-line react-hooks/exhaustive-deps -- fingerprint tracks files

  const runExtract = useCallback(
    async (targetFiles: File[]) => {
      if (targetFiles.length === 0) {
        setCategories([]);
        setError(null);
        setPhase(null);
        setExtracting(false);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setExtracting(true);
      setError(null);
      setPhase("Ouraデータを解析しています…");

      try {
        const dataUrls = await Promise.all(targetFiles.map(fileToDataUrl));
        if (controller.signal.aborted) return;

        setPhase("データを抽出・統合しています…");
        const vision = await resolveOuraVisionExtraction(dataUrls, {
          signal: controller.signal,
        });
        if (controller.signal.aborted || vision.cancelled) return;

        const nextCategories = buildOuraDisplayCategories({
          vision: vision.visionMetrics,
          deviceSpecific: vision.deviceSpecificMetrics,
        });
        setCategories(nextCategories);
        onExtracted?.({
          vision: vision.visionMetrics,
          categories: nextCategories,
        });

        if (vision.error) {
          setError(vision.error);
        } else if (nextCategories.length === 0) {
          setError(
            "数値を読み取れませんでした。別のスクリーンショットを追加してみてください。",
          );
        }
      } catch (extractError) {
        setError(
          extractError instanceof Error
            ? extractError.message
            : String(extractError),
        );
      } finally {
        if (!controller.signal.aborted) {
          setExtracting(false);
          setPhase(null);
        }
      }
    },
    [onExtracted],
  );

  useEffect(() => {
    if (filesFingerprint === lastExtractKeyRef.current) return;
    lastExtractKeyRef.current = filesFingerprint;
    void runExtract(files);
  }, [files, filesFingerprint, runExtract]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const addFiles = (incoming: File[]) => {
    if (incoming.length === 0) return;
    const next = [...files, ...incoming].slice(0, OURA_MAX_IMAGES);
    onChange(next);
  };

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border border-dashed border-slate-300 bg-[#fafaf8] p-4 sm:p-5"
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={(event) => {
          event.preventDefault();
          const dropped = Array.from(event.dataTransfer.files ?? []).filter(
            (file) => file.type.startsWith("image/"),
          );
          addFiles(dropped);
        }}
      >
        <p className="text-[14px] font-semibold text-[#071426]">
          複数画像をまとめて解析
        </p>
        <p className="mt-2 text-[13px] leading-6 text-slate-500">
          Oura Ringのスクリーンショットをまとめて追加すると、AIが画像全体を解析し、睡眠・回復・ストレスに必要なデータを抽出します。
        </p>
        <p className="mt-1 text-[12px] text-slate-400">
          PNG / JPG / JPEG / WEBP · 枚数固定なし · 上限 {OURA_MAX_IMAGES} 枚
        </p>
        <input
          id="oura-dedicated-upload"
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={extracting}
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
        <label
          htmlFor="oura-dedicated-upload"
          className={`mt-4 inline-flex min-h-11 items-center justify-center rounded-xl border border-[#315f68]/25 bg-white px-4 py-3 text-[14px] font-semibold text-[#071426] transition hover:border-[#315f68]/45 hover:bg-white ${
            extracting ? "cursor-wait opacity-60" : "cursor-pointer"
          }`}
        >
          {extracting
            ? "解析中…"
            : files.length === 0
              ? "画像を選択（複数可）"
              : "画像を追加"}
        </label>
        <p className="mt-3 text-[12px] text-slate-400">
          {files.length} / {OURA_MAX_IMAGES} 枚
        </p>
        {files.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="mt-2 text-[12px] font-semibold text-slate-500 transition hover:text-[#071426]"
          >
            すべてクリア
          </button>
        ) : null}
      </div>

      {extracting || phase ? (
        <p className="rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3 text-[13px] text-[#315f68]">
          {phase ?? "Ouraデータを解析しています…"}
        </p>
      ) : null}

      {showMissing && files.length === 0 ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-[13px] font-medium text-rose-700">
          Oura画像を1枚以上選択してください
        </p>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          {error}
        </p>
      ) : null}

      {previewUrls.length > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <p className="text-[14px] font-semibold text-[#071426]">
            解析セット（{previewUrls.length}枚）
          </p>
          <p className="mt-1 text-[13px] text-slate-500">
            画面種類の指定は不要です。これらの画像全体からデータを読み取ります。
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            {previewUrls.map((url, index) => (
              <div
                key={`${url}-${index}`}
                className="overflow-hidden rounded-xl border border-slate-200 bg-[#fafaf8]"
              >
                <div className="relative aspect-[9/16] max-h-48 w-[120px] sm:w-[140px]">
                  <Image
                    src={url}
                    alt={`Oura画像 ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 px-2 py-2">
                  <span className="truncate text-[11px] text-slate-500">
                    {files[index]?.name ?? `${index + 1}`}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeAt(index)}
                    className="shrink-0 text-[11px] font-semibold text-slate-500 hover:text-[#071426]"
                  >
                    削除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!extracting && categories.length > 0 ? (
        <OuraCategoryResults
          categories={categories}
          imageCount={files.length}
        />
      ) : null}
    </div>
  );
}
