"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { runPendingAnalysis } from "@/lib/analysis-session";

const steps = [
  {
    title: "SOXAI画像を読み取り中",
    detail: "睡眠スコア・HRV・SpO₂ などを抽出しています",
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

export default function AnalysisLoadingPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
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
      .then(() => {
        if (!cancelled) {
          setProgress(100);
          router.replace("/analysis/result");
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "AI分析に失敗しました。しばらくしてから再度お試しください。",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5 py-16">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_80px_-48px_rgba(15,23,42,0.2)] sm:max-w-xl sm:rounded-[32px] sm:p-10">
          <p className="text-[11px] font-semibold tracking-[0.32em] text-[#8a6a2d]">
            ANALYSIS ERROR
          </p>

          <h1 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[#071426] sm:text-3xl">
            分析を完了できませんでした
          </h1>

          <p className="mt-5 text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
            {error}
          </p>

          <Link
            href="/analysis/new"
            className="mt-8 inline-flex rounded-full bg-[#071426] px-8 py-4 text-base font-semibold text-white transition hover:-translate-y-1 hover:bg-[#10233c]"
          >
            入力画面に戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071426] px-5 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.4),transparent_52%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(216,179,106,0.18),transparent_42%)]" />

      <div className="relative z-10 w-full max-w-lg text-center">
        <p className="text-[11px] font-semibold tracking-[0.35em] text-[#d8b36a]">
          AI ANALYSIS
        </p>

        <h1 className="mt-5 text-3xl font-semibold tracking-[-0.05em] text-white sm:text-4xl">
          睡眠データを分析中
        </h1>

        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-white/65 sm:text-base sm:leading-8">
          SOXAI画像と生活習慣をもとに、
          Sleep Wellness Report を作成しています。
        </p>

        {/* Orbit animation */}
        <div className="relative mx-auto mt-12 flex h-36 w-36 items-center justify-center sm:mt-14 sm:h-40 sm:w-40">
          <div className="absolute inset-0 animate-[analysis-pulse_2.4s_ease-in-out_infinite] rounded-full border border-[#d8b36a]/25" />
          <div className="absolute inset-3 animate-[analysis-spin_8s_linear_infinite] rounded-full border border-dashed border-white/15" />
          <div className="absolute inset-6 animate-[analysis-spin-reverse_5s_linear_infinite] rounded-full border border-white/10" />
          <div className="absolute inset-[34%] rounded-full bg-gradient-to-br from-[#d8b36a] to-[#8a6a2d] shadow-[0_0_40px_rgba(216,179,106,0.35)]" />
          <div className="absolute inset-[42%] rounded-full bg-[#071426]" />
          <div className="absolute h-2.5 w-2.5 animate-[analysis-orbit_3.2s_linear_infinite] rounded-full bg-[#d8b36a]" />
        </div>

        {/* Progress */}
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
                      className={`text-sm font-semibold tracking-[-0.01em] ${
                        isActive ? "text-white" : "text-white/45"
                      }`}
                    >
                      {step.title}
                    </p>
                    <p
                      className={`mt-1 text-xs leading-5 ${
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
    </main>
  );
}
