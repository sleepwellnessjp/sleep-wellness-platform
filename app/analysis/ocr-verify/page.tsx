"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  extractSoxaiOcrVerifyData,
  formatExtractErrorMessage,
  type OcrVerifyResult,
  type SoxaiExtractSection,
} from "@/lib/analysis-session";

type SoxaiUploadSlot = {
  id: SoxaiExtractSection;
  title: string;
  maxFiles: number;
};

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const SOXAI_UPLOAD_SLOTS: SoxaiUploadSlot[] = [
  { id: "home", title: "概要", maxFiles: 1 },
  { id: "stress", title: "ストレス", maxFiles: 1 },
  { id: "sleep_overview", title: "睡眠概要", maxFiles: 1 },
  { id: "sleep_detail", title: "睡眠詳細", maxFiles: 1 },
  { id: "sleep_stages", title: "睡眠ステージ", maxFiles: 2 },
  { id: "circadian", title: "体内時計", maxFiles: 1 },
  { id: "heart_hrv", title: "呼吸・心拍", maxFiles: 2 },
  { id: "skin_temp", title: "皮膚温", maxFiles: 1 },
];

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

export default function OcrVerifyPage() {
  const [slotFiles, setSlotFiles] = useState<
    Partial<Record<SoxaiExtractSection, File[]>>
  >({});
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OcrVerifyResult | null>(null);

  const files = useMemo(
    () =>
      SOXAI_UPLOAD_SLOTS.flatMap((slot) => {
        const list = slotFiles[slot.id];
        return Array.isArray(list) ? list : [];
      }),
    [slotFiles],
  );

  const sections = useMemo(
    () =>
      SOXAI_UPLOAD_SLOTS.flatMap((slot) => {
        const list = slotFiles[slot.id];
        if (!Array.isArray(list) || list.length === 0) return [];
        return list.map(() => slot.id);
      }),
    [slotFiles],
  );

  const setSlot = (slot: SoxaiUploadSlot, selected: File[]) => {
    if (
      selected.some(
        (file) =>
          !(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type),
      )
    ) {
      setError("JPG / JPEG / PNG / WEBP 形式の画像のみアップロードできます。");
      return;
    }

    setError(null);
    setResult(null);
    setSlotFiles((current) => {
      const next = { ...current };
      if (selected.length === 0) {
        delete next[slot.id];
      } else {
        next[slot.id] = selected.slice(0, slot.maxFiles);
      }
      return next;
    });
  };

  const runVerify = async () => {
    if (files.length === 0) {
      setError("SOXAI画像を1枚以上アップロードしてください。");
      return;
    }
    setIsRunning(true);
    setError(null);
    try {
      const images = await Promise.all(files.map(fileToDataUrl));
      const verified = await extractSoxaiOcrVerifyData(images, sections);
      setResult(verified);
    } catch (verifyError) {
      setError(formatExtractErrorMessage(verifyError));
      setResult(null);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f7f7f5] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-[#8a6a2d]">
            OCR VERIFY MODE
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#071426]">
            SOXAI OCR 検証画面
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            取得漏れの原因特定用です。分析画面・PDFには影響しません。
          </p>
          <Link
            href="/analysis/new"
            className="mt-4 inline-flex text-sm font-semibold text-[#315f68]"
          >
            ← 入力画面へ戻る
          </Link>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-[#071426]">画像アップロード</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {SOXAI_UPLOAD_SLOTS.map((slot) => {
              const filesInSlot = slotFiles[slot.id] ?? [];
              return (
                <label
                  key={slot.id}
                  className="rounded-2xl border border-slate-200 bg-[#fafaf8] p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-[#071426]">
                      {slot.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {filesInSlot.length}/{slot.maxFiles}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                    multiple={slot.maxFiles > 1}
                    className="mt-3 block w-full text-xs"
                    onChange={(event) =>
                      setSlot(slot, Array.from(event.target.files ?? []))
                    }
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runVerify}
              disabled={isRunning}
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#071426] px-6 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isRunning ? "OCR解析中..." : "OCR検証を実行"}
            </button>
            <p className="text-sm text-slate-500">
              選択中: {files.length}枚
            </p>
          </div>
          {error && <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>}
        </section>

        {result && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
              <p>画像枚数: {result.imageCount}</p>
              <p>OCR読取数: {result.visibleCount}</p>
              <p>取得: {result.acquiredCount} / {result.rows.length} 項目</p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-[#fafaf8] text-left">
                    <th className="px-3 py-2">項目名</th>
                    <th className="px-3 py-2">取得値</th>
                    <th className="px-3 py-2">取得元(section)</th>
                    <th className="px-3 py-2">取得成功</th>
                    <th className="px-3 py-2">未取得</th>
                    <th className="px-3 py-2">異常値</th>
                    <th className="px-3 py-2">未取得理由</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row) => (
                    <tr key={row.key} className="border-b border-slate-100">
                      <td className="px-3 py-2 font-medium text-[#071426]">{row.label}</td>
                      <td className="px-3 py-2 text-slate-700">{row.value || "-"}</td>
                      <td className="px-3 py-2 text-slate-600">{row.section}</td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={
                            row.success
                              ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                              : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"
                          }
                        >
                          {row.success ? "○" : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={
                            row.missing
                              ? "rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700"
                              : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"
                          }
                        >
                          {row.missing ? "○" : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={
                            row.abnormal
                              ? "rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700"
                              : "rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500"
                          }
                        >
                          {row.abnormal ? "○" : "-"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{row.missingReason || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
