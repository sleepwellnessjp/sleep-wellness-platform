"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import SleepWellnessReportView from "@/components/sleep-wellness-report/SleepWellnessReportView";
import { PAGE_PADDING } from "@/components/ui/tokens";
import {
  hydrateAnalysisSession,
  loadAnalysisResult,
} from "@/lib/analysis-session";
import { getAnalysisById } from "@/lib/repositories/client-repository";
import {
  buildDemoSleepWellnessReport,
  buildSleepWellnessReportFromAnalysisResult,
} from "@/lib/sleep-analysis/from-analysis-result";
import type { SleepWellnessReport } from "@/lib/sleep-analysis/sleep-wellness-report";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      report: SleepWellnessReport;
      clientName: string | null;
      measurementDate: string | null;
      isDemo: boolean;
    }
  | { status: "error"; message: string };

function SleepWellnessReportPageInner() {
  const params = useSearchParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const analysisId = params.get("analysisId")?.trim() || "";
  const forceDemo = params.get("demo") === "1";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (forceDemo) {
        if (cancelled) return;
        setState({
          status: "ready",
          report: buildDemoSleepWellnessReport(),
          clientName: "デモ クライアント",
          measurementDate: "2026-08-05",
          isDemo: true,
        });
        return;
      }

      if (analysisId) {
        try {
          const found = await getAnalysisById(analysisId);
          if (cancelled) return;
          if (!found?.analysis) {
            setState({
              status: "error",
              message: "指定された分析結果が見つかりませんでした。",
            });
            return;
          }
          const hydrated = hydrateAnalysisSession({
            ...found.analysis.result,
            analysisId: found.analysis.id,
            clientId: found.client.id,
            clientName: found.client.name,
            measurementDate: found.analysis.analysisDate,
            metrics: found.analysis.metrics,
            graphs: found.analysis.result.graphs,
          });
          setState({
            status: "ready",
            report: buildSleepWellnessReportFromAnalysisResult(hydrated),
            clientName: hydrated.clientName ?? found.client.name ?? null,
            measurementDate: hydrated.measurementDate ?? null,
            isDemo: false,
          });
          return;
        } catch {
          if (cancelled) return;
          setState({
            status: "error",
            message: "分析結果の読み込みに失敗しました。",
          });
          return;
        }
      }

      const session = loadAnalysisResult();
      if (session) {
        if (cancelled) return;
        setState({
          status: "ready",
          report: buildSleepWellnessReportFromAnalysisResult(session),
          clientName: session.clientName ?? null,
          measurementDate: session.measurementDate ?? null,
          isDemo: false,
        });
        return;
      }

      if (cancelled) return;
      setState({
        status: "ready",
        report: buildDemoSleepWellnessReport(),
        clientName: "デモ クライアント",
        measurementDate: "2026-08-05",
        isDemo: true,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [analysisId, forceDemo]);

  const backHref = useMemo(() => {
    if (analysisId) {
      return `/analysis/result?analysisId=${encodeURIComponent(analysisId)}`;
    }
    return "/analysis/result";
  }, [analysisId]);

  if (state.status === "loading") {
    return (
      <main className={`min-h-screen bg-[var(--sw-surface)] ${PAGE_PADDING}`}>
        <div className="mx-auto max-w-lg animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-[rgba(7,20,38,0.06)]" />
          <div className="h-56 rounded-[28px] bg-white shadow-sm" />
          <div className="h-40 rounded-[28px] bg-white shadow-sm" />
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className={`min-h-screen bg-[var(--sw-surface)] ${PAGE_PADDING}`}>
        <div className="mx-auto max-w-lg rounded-[28px] border border-[rgba(7,20,38,0.1)] bg-white p-6">
          <p className="text-[15px] text-slate-700">{state.message}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href={backHref}
              className="text-[13px] font-medium text-[#8a6a2d] underline-offset-2 hover:underline"
            >
              分析結果へ戻る
            </Link>
            <Link
              href="/analysis/sleep-wellness-report?demo=1"
              className="text-[13px] font-medium text-[#315f68] underline-offset-2 hover:underline"
            >
              デモを見る
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen bg-[var(--sw-surface)] ${PAGE_PADDING}`}>
      <div className="mx-auto mb-4 flex max-w-lg flex-wrap items-center justify-between gap-3 px-1">
        <Link
          href={backHref}
          className="text-[13px] font-medium text-slate-500 underline-offset-2 hover:text-[#071426] hover:underline"
        >
          ← 分析結果
        </Link>
        {state.isDemo ? (
          <span className="rounded-full bg-[rgba(138,106,45,0.12)] px-2.5 py-1 text-[11px] font-semibold text-[#8a6a2d]">
            DEMO
          </span>
        ) : null}
      </div>

      <SleepWellnessReportView
        report={state.report}
        clientName={state.clientName}
        measurementDate={state.measurementDate}
        instructorMemoDefaultOpen={false}
      />
    </main>
  );
}

export default function SleepWellnessReportPage() {
  return (
    <Suspense
      fallback={
        <main className={`min-h-screen bg-[var(--sw-surface)] ${PAGE_PADDING}`}>
          <div className="mx-auto max-w-lg animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-[rgba(7,20,38,0.06)]" />
            <div className="h-56 rounded-[28px] bg-white shadow-sm" />
          </div>
        </main>
      }
    >
      <SleepWellnessReportPageInner />
    </Suspense>
  );
}
