"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { runPendingAnalysis } from "@/lib/analysis-session";

const steps = [
  "SOXAI画像を読み取っています",
  "生活習慣との関連を分析しています",
  "Sleep Wellness Report を作成しています",
];

export default function AnalysisLoadingPage() {
  const router = useRouter();
  const [activeStep, setActiveStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % steps.length);
    }, 2200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    runPendingAnalysis()
      .then(() => {
        if (!cancelled) {
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
      <main className="flex min-h-screen items-center justify-center bg-[#fafaf8] px-6 py-16">
        <div className="w-full max-w-xl rounded-[36px] border border-slate-200 bg-white p-10 text-center shadow-[0_30px_90px_-45px_rgba(15,23,42,0.2)]">
          <p className="text-xs font-semibold tracking-[0.32em] text-[#8a6a2d]">
            ANALYSIS ERROR
          </p>

          <h1 className="mt-5 text-3xl font-semibold tracking-[-0.04em] text-[#071426]">
            分析を完了できませんでした
          </h1>

          <p className="mt-6 text-base leading-8 text-slate-600">{error}</p>

          <Link
            href="/analysis/new"
            className="mt-10 inline-flex rounded-full bg-[#071426] px-8 py-4 text-base font-semibold text-white transition hover:-translate-y-1 hover:bg-[#10233c]"
          >
            入力画面に戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#071426] px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.35),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(216,179,106,0.18),transparent_45%)]" />

      <div className="relative z-10 w-full max-w-2xl text-center">
        <p className="text-xs font-semibold tracking-[0.35em] text-[#d8b36a]">
          AI ANALYSIS
        </p>

        <h1 className="mt-6 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
          睡眠データを分析中
        </h1>

        <p className="mx-auto mt-6 max-w-lg text-base leading-8 text-white/70">
          OpenAI API が SOXAI画像と生活習慣をもとに、
          Sleep Wellness Report を作成しています。
        </p>

        <div className="mx-auto mt-12 flex h-16 w-16 items-center justify-center">
          <div className="h-14 w-14 animate-spin rounded-full border-2 border-white/15 border-t-[#d8b36a]" />
        </div>

        <ul className="mx-auto mt-12 max-w-md space-y-4 text-left">
          {steps.map((step, index) => (
            <li
              key={step}
              className={`rounded-2xl px-5 py-4 text-sm transition duration-500 ${
                index === activeStep
                  ? "bg-white/10 text-white"
                  : "text-white/40"
              }`}
            >
              {step}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
