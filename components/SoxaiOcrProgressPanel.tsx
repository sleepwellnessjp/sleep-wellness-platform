"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatOcrElapsed,
  formatOcrEta,
  ocrProgressBarSymbols,
  type OcrProgressSnapshot,
} from "@/lib/soxai-ocr-runner";

type SoxaiOcrProgressPanelProps = {
  progress: OcrProgressSnapshot | null;
  showCancelConfirm: boolean;
  cancelledMenu: boolean;
  onRequestCancel: () => void;
  onContinue: () => void;
  onConfirmCancel: () => void;
  onReviewPartial: () => void;
  onResumeIncomplete: () => void;
  onBackToUpload: () => void;
};

/**
 * Full-screen OCR progress shell.
 * Portaled to document.body so it is not trapped under PageTransition's
 * transform (which makes position:fixed relative to the page wrapper).
 * Avoid backdrop-filter — Safari can leave a ghost dim layer after unmount
 * / soft navigation (bfcache).
 */
export default function SoxaiOcrProgressPanel({
  progress,
  showCancelConfirm,
  cancelledMenu,
  onRequestCancel,
  onContinue,
  onConfirmCancel,
  onReviewPartial,
  onResumeIncomplete,
  onBackToUpload,
}: SoxaiOcrProgressPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (cancelledMenu) return;
    const id = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(id);
  }, [cancelledMenu]);

  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const startedAt = progress?.startedAt ?? now;
  const elapsedMs = Math.max(0, now - startedAt);
  const activeLabels = progress?.activeLabels ?? [];
  const message = progress?.message ?? "画像を準備しています";
  const eta = formatOcrEta(progress?.estimatedRemainingMs ?? null);
  const symbols = total > 0 ? ocrProgressBarSymbols(completed, total) : "□";
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (!mounted) return null;

  return createPortal(
    <div
      data-soxai-ocr-overlay
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071426]/80 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="soxai-ocr-overlay-title"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-white/10 bg-white shadow-[0_40px_120px_-40px_rgba(7,20,38,0.65)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.18),transparent_70%)]" />
        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
            SOXAI OCR
          </p>
          <h2
            id="soxai-ocr-overlay-title"
            className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[#071426]"
          >
            SOXAI OCR解析中
          </h2>

          {cancelledMenu ? (
            <div className="mt-8 space-y-4">
              <p className="text-[14px] leading-7 text-slate-600">
                解析を中止しました。完了済みの読み取り結果は保持されています。
              </p>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onReviewPartial}
                  className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#071426] px-5 text-[15px] font-semibold text-white transition hover:bg-[#0c1f38]"
                >
                  取得済みデータを確認する
                </button>
                <button
                  type="button"
                  onClick={onResumeIncomplete}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#315f68]/30 bg-white px-5 text-[15px] font-semibold text-[#315f68] transition hover:bg-[#f3f7f8]"
                >
                  未完了の画像から再開する
                </button>
                <button
                  type="button"
                  onClick={onBackToUpload}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  アップロード画面へ戻る
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-7">
                <div className="flex items-end justify-between gap-3">
                  <p className="font-mono text-[15px] tracking-wide text-[#071426]">
                    {symbols}{" "}
                    <span className="font-sans font-semibold">
                      {completed} / {total || "—"}
                    </span>
                  </p>
                  <p className="text-[12px] font-medium text-slate-400">
                    {pct}%
                  </p>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#315f68] to-[#d8b36a] transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <dl className="mt-7 space-y-4 text-[14px]">
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">
                    現在解析中
                  </dt>
                  <dd className="mt-1.5 font-semibold text-[#071426]">
                    {activeLabels.length > 0
                      ? activeLabels.join("、")
                      : progress?.phase === "merging" ||
                          progress?.phase === "finishing"
                        ? "—"
                        : "待機中"}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">
                      経過時間
                    </dt>
                    <dd className="mt-1.5 font-semibold text-[#071426]">
                      {formatOcrElapsed(elapsedMs)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">
                      推定残り時間
                    </dt>
                    <dd className="mt-1.5 font-semibold text-[#071426]">
                      {eta}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">
                    進捗
                  </dt>
                  <dd className="mt-1.5 text-slate-600">{message}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={onRequestCancel}
                className="mt-8 inline-flex min-h-12 w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 text-[15px] font-semibold text-slate-700 transition hover:border-[#a33a3a]/40 hover:bg-[#fff5f5] hover:text-[#a33a3a]"
              >
                解析を中止
              </button>
            </>
          )}
        </div>
      </div>

      {showCancelConfirm && !cancelledMenu && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#071426]/50 px-4">
          <div className="w-full max-w-sm rounded-[24px] border border-slate-200 bg-white p-6 shadow-xl">
            <p className="text-[15px] font-semibold leading-7 text-[#071426]">
              OCR解析を中止しますか？完了済みの読み取り結果は保持されます。
            </p>
            <div className="mt-5 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onContinue}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#071426] px-4 text-[14px] font-semibold text-white"
              >
                解析を続ける
              </button>
              <button
                type="button"
                onClick={onConfirmCancel}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#a33a3a]/30 bg-white px-4 text-[14px] font-semibold text-[#a33a3a]"
              >
                解析を中止する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
