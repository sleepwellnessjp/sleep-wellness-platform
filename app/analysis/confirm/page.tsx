"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import AnalysisFlow from "@/components/AnalysisFlow";
import AnalysisAccessBanner from "@/components/AnalysisAccessBanner";
import {
  getExtractionDraft,
  mergeMetricsPreferImage,
  setPendingAnalysisRequest,
  type AnalysisMetrics,
  type ExtractionDraft,
  type MetricConflict,
} from "@/lib/analysis-session";
import { graphPanelCount } from "@/lib/soxai-graphs";
import {
  isMetricPresent,
  metricDisplayValue,
  normalizeMetrics,
  setMetricValue,
  SOXAI_METRIC_FIELDS,
  type MetricFieldKey,
} from "@/lib/soxai-metrics";

const inputClass =
  "mt-2.5 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:px-5 sm:py-4 sm:text-base";

const inputReadonlyClass =
  "mt-2.5 w-full rounded-2xl border border-[#315f68]/20 bg-[#f4f7f7] px-4 py-3.5 text-[15px] text-[#071426] sm:px-5 sm:py-4 sm:text-base";

const inputConflictClass =
  "mt-2.5 w-full rounded-2xl border border-amber-300 bg-[#fffbeb] px-4 py-3.5 text-[15px] text-[#071426] outline-none transition duration-300 placeholder:text-slate-400 focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15 sm:px-5 sm:py-4 sm:text-base";

export default function ConfirmExtractionPage() {
  const router = useRouter();
  const initialDraft = useMemo(() => getExtractionDraft(), []);
  const [draft] = useState<ExtractionDraft | null>(() => initialDraft);
  const [metrics, setMetrics] = useState<AnalysisMetrics | null>(() =>
    initialDraft
      ? normalizeMetrics(initialDraft.extractedMetrics)
      : null,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialDraft) {
      router.replace("/analysis/new");
    }
  }, [router, initialDraft]);

  const imageKeySet = useMemo(
    () => new Set(draft?.imageKeys ?? []),
    [draft?.imageKeys],
  );

  const conflictByKey = useMemo(() => {
    const map = new Map<MetricFieldKey, MetricConflict>();
    for (const conflict of draft?.conflicts ?? []) {
      map.set(conflict.key, conflict);
    }
    return map;
  }, [draft?.conflicts]);

  const extractedCount = draft?.imageKeys.length ?? 0;
  const missingCount = SOXAI_METRIC_FIELDS.length - extractedCount;
  const conflictCount = draft?.conflicts?.length ?? 0;
  const graphCount = draft ? graphPanelCount(draft.graphs) : 0;
  const backHref = draft?.lifestyle.clientId
    ? `/analysis/new?clientId=${encodeURIComponent(draft.lifestyle.clientId)}`
    : "/analysis/new";

  const updateField = (key: MetricFieldKey, value: string) => {
    // OCR取得済み（競合なし）は上書き不可
    if (imageKeySet.has(key) && !conflictByKey.has(key)) return;

    setMetrics((current) => {
      if (!current) return current;
      return setMetricValue(current, key, value);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft || !metrics) return;

    setAccessError(null);
    setIsSubmitting(true);

    try {
      const accessResponse = await fetch("/api/platform/analysis-access", {
        cache: "no-store",
      });
      const access = (await accessResponse.json()) as {
        allowed?: boolean;
        message?: string;
      };
      if (!access.allowed) {
        setAccessError(
          access.message ??
            "認定資格の更新が必要です。Sleep Wellness Institute Japan までお問い合わせください。",
        );
        setIsSubmitting(false);
        return;
      }
    } catch {
      // デモ/オフライン時は分析を継続
    }

    // OCR取得値を最優先で固定し、未取得項目のみ手入力を反映
    const locked = mergeMetricsPreferImage(
      draft.extractedMetrics,
      metrics,
    );

    // 競合項目はユーザー選択を優先
    const confirmed = { ...locked };
    for (const conflict of draft.conflicts ?? []) {
      if (isMetricPresent(metrics, conflict.key)) {
        if (conflict.key === "sleepScore") {
          confirmed.sleepScore = metrics.sleepScore;
        } else {
          confirmed[conflict.key] = metrics[conflict.key];
        }
      }
    }

    setPendingAnalysisRequest({
      lifestyle: draft.lifestyle,
      images: draft.images,
      metrics: normalizeMetrics(confirmed),
      graphs: draft.graphs,
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
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/clients"
              className="text-[11px] font-semibold tracking-[0.18em] text-slate-500 transition hover:text-[#071426] sm:text-xs"
            >
              CLIENTS
            </Link>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-[#8a6a2d] sm:text-xs sm:tracking-[0.28em]">
              AI ANALYSIS
            </p>
          </div>
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
            SOXAI画像から読み取った値をすべて表示しています。
            画像から取得できた項目は固定し、未取得の項目のみ手入力できます。
          </p>
        </header>

        <AnalysisAccessBanner />

        {accessError && (
          <p className="mx-auto mt-6 max-w-3xl rounded-2xl border border-[#a33a3a]/25 bg-[#a33a3a]/06 px-4 py-4 text-sm leading-7 text-[#a33a3a]">
            {accessError}
          </p>
        )}

        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-3 sm:mt-10 sm:grid-cols-4">
          <div className="rounded-2xl border border-[#315f68]/15 bg-white px-3 py-4 text-center sm:px-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#315f68] sm:text-[11px]">
              画像から取得
            </p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
              {extractedCount}
              <span className="ml-1 text-sm font-medium text-slate-400">
                / {SOXAI_METRIC_FIELDS.length}
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-3 py-4 text-center sm:px-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-slate-400 sm:text-[11px]">
              手入力が必要
            </p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
              {missingCount}
              <span className="ml-1 text-sm font-medium text-slate-400">項目</span>
            </p>
          </div>
          <div className="rounded-2xl border border-[#315f68]/15 bg-white px-3 py-4 text-center sm:px-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-[#315f68] sm:text-[11px]">
              グラフ解析
            </p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
              {graphCount}
              <span className="ml-1 text-sm font-medium text-slate-400">/ 8</span>
            </p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-[#fffbeb] px-3 py-4 text-center sm:px-4">
            <p className="text-[10px] font-semibold tracking-[0.18em] text-amber-700 sm:text-[11px]">
              値の競合
            </p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[#071426] sm:text-2xl">
              {conflictCount}
              <span className="ml-1 text-sm font-medium text-slate-400">項目</span>
            </p>
          </div>
        </div>

        {conflictCount > 0 && (
          <div className="mx-auto mt-5 max-w-2xl rounded-2xl border border-amber-200 bg-[#fffbeb] px-4 py-4 text-[14px] leading-7 text-amber-950 sm:px-5">
            <p className="font-semibold">複数画像で異なる値が検出されました</p>
            <p className="mt-1 text-[13px] text-amber-900/80">
              仮採用値を表示しています。競合項目のみ修正できます。それ以外のOCR取得値は変更できません。
            </p>
            <ul className="mt-3 space-y-1.5 text-[13px]">
              {(draft.conflicts ?? []).map((conflict) => (
                <li key={conflict.key}>
                  <span className="font-semibold">{conflict.label}</span>
                  {" ：採用 "}
                  <span className="font-medium">{conflict.adopted}</span>
                  {" ／ 他の候補 "}
                  {conflict.alternatives.join("、")}
                </li>
              ))}
            </ul>
          </div>
        )}

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
                「画像から取得」はOCR結果をそのまま反映（編集不可）。空欄のみ手入力してください。
              </p>
            </div>

            <div className="grid gap-4 px-5 py-6 sm:grid-cols-2 sm:gap-5 sm:px-8 sm:py-8 lg:grid-cols-3">
              {SOXAI_METRIC_FIELDS.map((field) => {
                const fromImage = imageKeySet.has(field.key);
                const conflict = conflictByKey.get(field.key);
                const value = metricDisplayValue(metrics, field.key);
                const present = isMetricPresent(metrics, field.key);
                const editable = !fromImage || Boolean(conflict);

                return (
                  <label key={field.key} className="block">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#071426] sm:text-sm">
                        {field.label}
                      </span>
                      {conflict ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-800">
                          競合あり
                        </span>
                      ) : fromImage ? (
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
                    {editable ? (
                      <input
                        type={
                          field.inputType === "number"
                            ? "number"
                            : field.inputType
                        }
                        inputMode={
                          field.inputType === "number" ? "decimal" : undefined
                        }
                        step={field.inputType === "number" ? "1" : undefined}
                        value={value}
                        onChange={(event) =>
                          updateField(field.key, event.target.value)
                        }
                        className={
                          conflict ? inputConflictClass : inputClass
                        }
                        placeholder={field.placeholder}
                      />
                    ) : (
                      <input
                        type="text"
                        readOnly
                        value={present ? value : "—"}
                        className={inputReadonlyClass}
                        tabIndex={-1}
                      />
                    )}
                    {conflict && (
                      <span className="mt-1.5 block text-[11px] leading-5 text-amber-800">
                        候補:{" "}
                        {[conflict.adopted, ...conflict.alternatives].join(
                          " / ",
                        )}
                      </span>
                    )}
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
              {draft.lifestyle.clientId ? " · 既存クライアントに紐づけ" : ""}
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
                この確認データが Medical / Visual / PDF の共通データソースになります。
              </p>

              <div className="mt-7 flex flex-col items-center gap-3 sm:mt-8 sm:flex-row sm:justify-center">
                <Link
                  href={backHref}
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
