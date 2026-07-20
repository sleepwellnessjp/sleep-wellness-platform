"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AnalysisFlow from "@/components/AnalysisFlow";
import { AnalysisError, runPendingAnalysis } from "@/lib/analysis-session";
import { saveAnalysisToRepository } from "@/lib/repositories/client-repository";

const steps = [
  {
    title: "確認済みデータを反映中",
    detail: "抽出・手入力した睡眠指標を分析に渡しています",
  },
  {
    title: "生活習慣との関連を分析中",
    detail: "回復力と生活リズムの整合を見ています",
  },
  {
    title: "レポートを生成中",
    detail: "Sleep Wellness Report を作成しています",
  },
];

const isDev = process.env.NODE_ENV === "development";

type AnalysisFailure = {
  message: string;
  status?: number;
  errorType?: string;
  details?: string;
};

export default function AnalysisLoadingPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<AnalysisFailure | null>(null);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % steps.length);
    }, 2400);

    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 92) return current;
        return current + Math.random() * 4 + 1.5;
      });
    }, 700);

    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(progressTimer);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    runPendingAnalysis()
      .then(async (result) => {
        if (cancelled) return;
        try {
          await saveAnalysisToRepository(result);
        } catch (saveError) {
          console.error("Failed to save analysis to client store:", saveError);
        }

        try {
          await fetch("/api/platform/consume-credit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clientName: result.clientName ?? "睡眠分析",
              measurementDate: result.measurementDate,
              sleepScore:
                typeof result.metrics?.sleepScore === "number"
                  ? result.metrics.sleepScore
                  : result.score,
            }),
          });
        } catch (creditError) {
          console.error("Failed to consume analysis credit:", creditError);
        }

        setProgress(100);
        router.replace("/analysis/result");
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        console.error("Analysis loading failed:", err);

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
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
            <Link href="/">
              <Image
                src="/swij-logo-horizontal.png"
                alt="Sleep Wellness Institute Japan"
                width={160}
                height={40}
                className="h-auto w-[120px] sm:w-[140px]"
              />
            </Link>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d] sm:text-xs sm:tracking-[0.28em]">
              AI ANALYSIS
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center px-5 py-16">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)] sm:max-w-xl sm:p-10">
            <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
              ANALYSIS ERROR
            </p>

            <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#071426] sm:text-3xl">
              分析を完了できませんでした
            </h1>

            <p className="mt-5 text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8">
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
              className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#071426] px-8 py-3.5 text-base font-semibold text-white transition hover:-translate-y-1 hover:bg-[#10233c]"
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

      <div className="relative z-10 border-b border-white/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/">
            <Image
              src="/swij-logo-horizontal.png"
              alt="Sleep Wellness Institute Japan"
              width={160}
              height={40}
              className="h-auto w-[120px] brightness-0 invert sm:w-[140px]"
            />
          </Link>
          <p className="text-[10px] font-semibold tracking-[0.22em] text-[#d8b36a] sm:text-xs sm:tracking-[0.28em]">
            AI ANALYSIS
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 items-center justify-center px-5 py-12 sm:py-16">
        <div className="w-full max-w-lg text-center">
          <div className="mb-8 sm:mb-10">
            <AnalysisFlow current={3} variant="dark" />
          </div>

          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
            AI ANALYSIS
          </p>

          <h1 className="mt-5 text-[1.85rem] font-semibold tracking-[-0.05em] text-white sm:text-4xl">
            睡眠データを分析中
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[15px] leading-7 text-white/65 sm:text-base sm:leading-8">
            確認済みの睡眠データと生活習慣をもとに、
            Sleep Wellness Report を作成しています。
          </p>

          <div className="relative mx-auto mt-12 flex h-36 w-36 items-center justify-center sm:mt-14 sm:h-40 sm:w-40">
            <div className="absolute inset-0 animate-[analysis-pulse_2.4s_ease-in-out_infinite] rounded-full border border-[#d8b36a]/25" />
            <div className="absolute inset-3 animate-[analysis-spin_8s_linear_infinite] rounded-full border border-dashed border-white/15" />
            <div className="absolute inset-6 animate-[analysis-spin-reverse_5s_linear_infinite] rounded-full border border-white/10" />
            <div className="absolute inset-[34%] rounded-full bg-gradient-to-br from-[#d8b36a] to-[#8a6a2d] shadow-[0_0_40px_rgba(216,179,106,0.35)]" />
            <div className="absolute inset-[42%] rounded-full bg-[#071426]" />
            <div className="absolute h-2.5 w-2.5 animate-[analysis-orbit_3.2s_linear_infinite] rounded-full bg-[#d8b36a]" />
          </div>

          <div className="mx-auto mt-10 max-w-xs">
            <div className="mb-2 flex items-center justify-between text-[11px] tracking-[0.14em] text-white/45">
              <span>PROGRESS</span>
              <span>{Math.min(100, Math.round(progress))}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#315f68] via-[#d8b36a] to-[#d8b36a] transition-[width] duration-700 ease-out"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          </div>

          <ul className="mx-auto mt-10 max-w-md space-y-3 text-left">
            {steps.map((step, index) => {
              const isActive = index === activeStep;
              const isDone = index < activeStep;

              return (
                <li
                  key={step.title}
                  className={`rounded-2xl border px-4 py-3.5 transition duration-500 sm:px-5 sm:py-4 ${
                    isActive
                      ? "border-[#d8b36a]/35 bg-white/10"
                      : "border-transparent bg-transparent"
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <span
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isActive
                          ? "bg-[#d8b36a] text-[#071426]"
                          : isDone
                            ? "bg-white/20 text-white"
                            : "bg-white/10 text-white/40"
                      }`}
                    >
                      {isDone ? "✓" : String(index + 1)}
                    </span>
                    <div>
                      <p
                        className={`text-[15px] font-semibold tracking-[-0.01em] sm:text-sm ${
                          isActive ? "text-white" : "text-white/45"
                        }`}
                      >
                        {step.title}
                      </p>
                      <p
                        className={`mt-1 text-[13px] leading-5 sm:text-xs ${
                          isActive ? "text-white/55" : "text-white/25"
                        }`}
                      >
                        {step.detail}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}
