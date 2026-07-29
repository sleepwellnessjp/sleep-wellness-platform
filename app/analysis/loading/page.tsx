"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import AnalysisFlow from "@/components/AnalysisFlow";
import { AnalysisError } from "@/lib/analysis-session";
import {
  bootstrapScoreFirstAnalysis,
  startProgressiveAnalysisBackground,
} from "@/lib/analysis-progressive";

const isDev = process.env.NODE_ENV === "development";

type AnalysisFailure = {
  message: string;
  status?: number;
  errorType?: string;
  details?: string;
};

/**
 * Score-first ブートストラップ専用。
 * Score 確定後すぐに結果画面へ遷移し、AI / DB / PDF はバックグラウンド継続。
 */
export default function AnalysisLoadingPage() {
  const [error, setError] = useState<AnalysisFailure | null>(null);

  useEffect(() => {
    try {
      const { preliminary, images } = bootstrapScoreFirstAnalysis();
      // AI本文・保存・クレジットは結果表示後に非同期
      void startProgressiveAnalysisBackground(preliminary, images).catch(
        (backgroundError) => {
          console.error(
            "Background analysis completion failed:",
            backgroundError,
          );
        },
      );

      // Soft navigate can be cancelled by React Strict Mode remount in dev.
      // Hard navigation is intentional for this one-shot handoff page.
      window.location.replace("/analysis/result?pending=1");
    } catch (err: unknown) {
      console.error("Score-first bootstrap failed:", err);

      if (err instanceof AnalysisError) {
        setError({
          message: err.message,
          status: err.status,
          errorType: err.errorType,
          details: err.details,
        });
        return;
      }

      setError({
        message:
          err instanceof Error
            ? err.message
            : "AI分析に失敗しました。しばらくしてから再度お試しください。",
        errorType: "Unknown Error",
        details: err instanceof Error ? err.stack : String(err),
      });
    }
  }, []);

  if (error) {
    return (
      <main className="min-h-screen overflow-x-hidden bg-[#f7f7f5]">
        <div className="border-b border-slate-200/80 bg-white/80 pt-[env(safe-area-inset-top)] backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8 sm:py-4">
            <Link href="/" className="inline-flex min-h-11 items-center">
              <Image
                src="/swij-logo-horizontal.png"
                alt="Sleep Wellness Institute Japan"
                width={160}
                height={40}
                className="h-auto w-[110px] sm:w-[140px]"
              />
            </Link>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d] sm:text-xs sm:tracking-[0.28em]">
              AI ANALYSIS
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-4 py-12 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-16">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-5 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)] sm:max-w-xl sm:p-10">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
              ANALYSIS ERROR
            </p>

            <h1 className="mt-3 break-words text-[1.45rem] font-semibold leading-tight tracking-[-0.04em] text-[#071426] sm:mt-4 sm:text-3xl sm:leading-normal">
              分析を完了できませんでした
            </h1>

            <p className="mt-4 text-[14px] leading-6 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
              {error.message}
            </p>

            {isDev && (
              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-left text-[13px] leading-6 text-amber-950">
                <p className="font-semibold tracking-wide text-amber-800">
                  DEV ERROR DETAILS
                </p>
                <p className="mt-2">
                  HTTP Status: {error.status ?? "n/a"}
                </p>
                <p>Error Type: {error.errorType ?? "n/a"}</p>
                {error.details && (
                  <p className="mt-2 break-words whitespace-pre-wrap">
                    Details: {error.details}
                  </p>
                )}
              </div>
            )}

            <Link
              href="/analysis/new"
              className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#071426] px-8 py-3.5 text-base font-semibold text-white transition active:bg-[#10233c] sm:mt-8 sm:w-auto sm:hover:-translate-y-1 sm:hover:bg-[#10233c] sm:active:translate-y-0"
            >
              入力画面に戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#071426]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.4),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(216,179,106,0.18),transparent_42%)]" />

      <div className="relative z-10 border-b border-white/10 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-8 sm:py-4">
          <Link href="/" className="inline-flex min-h-11 items-center">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={160}
              height={40}
              className="h-auto w-[110px] brightness-0 invert sm:w-[140px]"
            />
          </Link>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d8b36a] sm:text-xs sm:tracking-[0.28em]">
            AI ANALYSIS
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-10 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-16 sm:pb-16">
        <div className="w-full max-w-lg text-center">
          <div className="mb-8 sm:mb-10">
            <AnalysisFlow current={3} variant="dark" />
          </div>

          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
            SCORE FIRST
          </p>

          <h1 className="mt-4 break-words text-[1.65rem] font-semibold leading-tight tracking-[-0.05em] text-white sm:mt-5 sm:text-4xl sm:leading-normal">
            Sleep Wellness Score を確定中
          </h1>

          <p className="mx-auto mt-3 max-w-md text-[14px] leading-6 text-white/65 sm:mt-4 sm:text-base sm:leading-8">
            OCRは完了済みです。スコアを先に表示し、Sleep Wellness Insight は結果画面で続けて生成します。
          </p>

          <div className="relative mx-auto mt-12 flex h-28 w-28 items-center justify-center sm:mt-14 sm:h-32 sm:w-32">
            <div className="absolute inset-0 animate-[analysis-pulse_2.4s_ease-in-out_infinite] rounded-full border border-[#d8b36a]/25" />
            <div className="absolute inset-[34%] rounded-full bg-gradient-to-br from-[#d8b36a] to-[#8a6a2d] shadow-[0_0_40px_rgba(216,179,106,0.35)]" />
            <div className="absolute inset-[42%] rounded-full bg-[#071426]" />
          </div>
        </div>
      </div>
    </main>
  );
}
