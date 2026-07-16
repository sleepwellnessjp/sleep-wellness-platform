"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AnalysisFlow from "@/components/AnalysisFlow";
import {
  getExtractionDraft,
  setPendingAnalysisRequest,
  type AnalysisMetrics,
  type ExtractionDraft,
} from "@/lib/analysis-session";
import {
  metricDisplayValue,
  setMetricValue,
  SOXAI_METRIC_FIELDS,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";

const inputClass =
  "mt-2.5 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

export default function ConfirmExtractionPage() {
  const router = useRouter();
  const initialDraft = useMemo(() => getExtractionDraft(), []);
  const [draft] = useState<ExtractionDraft | null>(() => initialDraft);
  const [metrics, setMetrics] = useState<AnalysisMetrics | null>(
    () => initialDraft?.extractedMetrics ?? null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initialDraft) {
      router.replace("/analysis/new");
      return;
    }
  }, [router, initialDraft]);

  const imageKeySet = useMemo(
    () => new Set(draft?.imageKeys ?? []),
    [draft?.imageKeys],
  );

  const extractedCount = draft?.imageKeys.length ?? 0;
  const missingCount = SOXAI_METRIC_FIELDS.length - extractedCount;

  const updateField = (key: MetricFieldKey, value: string) => {
    setMetrics((current) => {
      if (!current) return current;
      return setMetricValue(current, key, value);
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || !metrics) return;

    setIsSubmitting(true);
    setPendingAnalysisRequest({
      lifestyle: draft.lifestyle,
      images: draft.images,
      metrics,
    });
    router.push("/analysis/loading");
  };

  if (!draft || !metrics) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm text-slate-500">抽出結果を読み込み中...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <div className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3">
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

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12 lg:py-14">
        <div className="mb-8 sm:mb-10">
          <AnalysisFlow current={2} />
        </div>

        <header className="mx-auto max-w-2xl text-center">
          <p className="text-[11px] font-semibold tracking-[0.28em] text-[#8a6a2d]">
            SOXAI EXTRACTION
          </p>
          <h1 className="mt-4 text-[1.85rem] font-semibold tracking-[-0.05em] text-[#071426] sm:mt-5 sm:text-4xl">
            抽出結果の確認
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-slate-600 sm:mt-5 sm:text-base sm:leading-8">
            SOXAI画像から読み取った値を確認してください。
            取得できた項目は画像データを優先し、未取得の項目のみ手入力できます。
          </p>
        </header>

        <div className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:mt-10">
          <div className="rounded-2xl border border-[#315f68]/15 bg-white px-4 py-4 text-center">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-[#315f68]">
              画像から取得
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#071426]">
              {extractedCount}
              <span className="ml-1 text-sm font-medium text-slate-400">
                / {SOXAI_METRIC_FIELDS.length}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-center">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-slate-400">
              手入力が必要
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-[#071426]">
              {missingCount}
              <span className="ml-1 text-sm font-medium text-slate-400">項目</span>
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-8 sm:mt-10">
          <section className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.28)]">
            <div className="border-b border-slate-100 px-5 py-6 sm:px-8 sm:py-8">
              <p className="text-[11px] font-semibold tracking-[0.26em] text-[#8a6a2d]">
                CONFIRMED METRICS
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
                睡眠データ
              </h2>
              <p className="mt-2 max-w-xl text-[15px] leading-7 text-slate-500 sm:text-sm">
                画像から取得した値を優先しますが、必要に応じてすべて修正できます。
              </p>
            </div>

            <div className="grid gap-4 px-5 py-6 sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-8 lg:grid-cols-3">
              {SOXAI_METRIC_FIELDS.map((field) => {
                const fromImage = imageKeySet.has(field.key);
                const value = metricDisplayValue(metrics, field.key);

                return (
                  <label key={field.key} className="block">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#071426] sm:text-sm">
                        {field.label}
                      </span>
                      {fromImage ? (
                        <span className="rounded-full bg-[#315f68]/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[#315f68]">
                          画像から取得
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-slate-500">
                          手入力可
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      {field.hint}
                    </span>
                    <input
                      type={field.inputType === "number" ? "number" : field.inputType}
                      inputMode={field.inputType === "number" ? "decimal" : undefined}
                      step={field.inputType === "number" ? "1" : undefined}
                      value={value}
                      onChange={(event) =>
                        updateField(field.key, event.target.value)
                      }
                      className={inputClass}
                      placeholder={field.placeholder}
                    />
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-5 sm:px-8">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-[#8a6a2d]">
              SUBJECT
            </p>
            <p className="mt-2 text-base font-semibold text-[#071426]">
              {draft.lifestyle.clientName}
              <span className="ml-3 text-sm font-medium text-slate-400">
                {draft.lifestyle.measurementDate}
              </span>
            </p>
            <p className="mt-1 text-sm text-slate-500">
              SOXAI画像 {draft.images.length} 枚 · 生活習慣データ付き
            </p>
          </section>

          <section className="relative overflow-hidden rounded-[28px] bg-[#071426] px-5 py-8 text-center shadow-[0_30px_90px_-40px_rgba(7,20,38,0.55)] sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(49,95,104,0.35),transparent_55%)]" />
            <div className="relative z-10">
              <p className="text-[11px] font-semibold tracking-[0.28em] text-[#d8b36a]">
                READY TO ANALYZE
              </p>
              <h2 className="mt-3 text-xl font-semibold tracking-[-0.03em] text-white sm:text-2xl">
                抽出結果を確認して分析する
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] leading-7 text-white/60 sm:text-sm">
                内容に問題なければ、Sleep Wellness Report の作成を開始します。
              </p>

              <div className="mt-7 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center">
                <Link
                  href="/analysis/new"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/25 px-8 py-3.5 text-base font-semibold text-white/85 transition hover:bg-white/10 sm:w-auto"
                >
                  入力に戻る
                </Link>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="group inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-full bg-white px-10 py-4 text-base font-semibold text-[#071426] shadow-[0_18px_50px_-20px_rgba(255,255,255,0.55)] transition duration-500 hover:-translate-y-1 hover:bg-[#f4f4f4] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto sm:px-12 sm:text-lg"
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
