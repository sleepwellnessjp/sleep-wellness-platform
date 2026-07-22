"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ClientHomeAiComment,
  ClientHomeGoals,
} from "@/components/ClientHomeStatusPanels";
import ClientNav from "@/components/ClientNav";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SoftSkeleton } from "@/components/ui/Skeleton";
import { GOLD, NAVY } from "@/components/ui/tokens";
import { getMyAnalysisById } from "@/lib/repositories/client-mypage-repository";
import {
  formatDisplayDate,
  type StoredAnalysis,
} from "@/lib/repositories/client-repository";
import type { AnalysisResult } from "@/lib/analysis-session";

function wellnessScoreOf(analysis: StoredAnalysis | null | undefined): number | null {
  if (!analysis) return null;
  if (
    typeof analysis.wellnessScore === "number" &&
    Number.isFinite(analysis.wellnessScore)
  ) {
    return analysis.wellnessScore;
  }
  if (
    typeof analysis.result?.score === "number" &&
    Number.isFinite(analysis.result.score)
  ) {
    return analysis.result.score;
  }
  return null;
}

export default function ClientAnalysisDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [analysis, setAnalysis] = useState<StoredAnalysis | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    if (!id) {
      setReady(true);
      setError("分析IDが指定されていません。");
      return;
    }

    setReady(false);
    setError(null);

    try {
      const data = await getMyAnalysisById(id);
      setAnalysis(data?.analysis ?? null);
      const next = data?.analysis?.result
        ? {
            ...data.analysis.result,
            analysisId:
              data.analysis.result.analysisId?.trim() || data.analysis.id,
          }
        : null;
      setResult(next);
    } catch (err: unknown) {
      console.error("[client/analyses] load failed:", err);
      setAnalysis(null);
      setResult(null);
      setError(
        err instanceof Error
          ? err.message
          : "分析の読み込みに失敗しました。",
      );
    } finally {
      setReady(true);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load, reloadKey]);

  if (!ready) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <ClientNav />
        <SoftSkeleton variant="page" />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <ClientNav />
        <div className="mx-auto max-w-md px-5 py-16">
          <ErrorState
            message={error}
            onRetry={() => setReloadKey((k) => k + 1)}
          />
          <div className="mt-6 text-center">
            <Link
              href="/client"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-[14px] font-semibold transition hover:bg-slate-50"
              style={{ color: NAVY }}
            >
              マイページへ戻る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!analysis || !result) {
    return (
      <main className="min-h-screen bg-[#f7f7f5]">
        <ClientNav />
        <div className="mx-auto max-w-md px-5 py-16">
          <EmptyState
            illustration="analysis"
            eyebrow="ANALYSIS"
            title="分析が見つかりません"
            description="この分析は削除されたか、アクセス権限がありません。"
            primaryAction={{ label: "マイページへ戻る", href: "/client" }}
          />
        </div>
      </main>
    );
  }

  const score = wellnessScoreOf(analysis);

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <ClientNav />
      <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="text-center">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            ANALYSIS DETAIL
          </p>
          <h1
            className="mt-4 text-[1.65rem] font-semibold tracking-[-0.04em] sm:text-3xl"
            style={{ color: NAVY }}
          >
            {formatDisplayDate(analysis.analysisDate)}
          </h1>
          {score != null ? (
            <p className="mt-3 text-[15px] text-slate-500">
              Sleep Wellness Score{" "}
              <span
                className="font-semibold tabular-nums"
                style={{ color: NAVY }}
              >
                {score}
              </span>
            </p>
          ) : null}
        </header>

        <div className="mt-10 space-y-6">
          <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 sm:px-7 sm:py-8">
            <p
              className="text-[10px] font-semibold tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              AI COMMENT
            </p>
            <div className="mt-4">
              <ClientHomeAiComment result={result} />
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 sm:px-7 sm:py-8">
            <p
              className="text-[10px] font-semibold tracking-[0.18em]"
              style={{ color: GOLD }}
            >
              AI宿題
            </p>
            <p className="mt-2 text-[13px] leading-6 text-slate-500">
              分析結果に基づくおすすめ行動です。認定講師が設定した宿題とは別です。
            </p>
            <div className="mt-4">
              <ClientHomeGoals result={result} />
            </div>
          </section>
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/client"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-6 text-[14px] font-semibold transition hover:bg-slate-50"
            style={{ color: NAVY }}
          >
            マイページへ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
