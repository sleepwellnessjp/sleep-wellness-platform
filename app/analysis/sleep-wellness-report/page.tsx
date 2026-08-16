"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import SleepWellnessReportView from "@/components/sleep-wellness-report/SleepWellnessReportView";
import { FOCUS_RING, NAVY, PAGE_PADDING } from "@/components/ui/tokens";
import { isUnsafePrintEnvironment } from "@/lib/print-counseling-sheet";
import {
  hydrateAnalysisSession,
  loadAnalysisResult,
} from "@/lib/analysis-session";
import { getAnalysisById } from "@/lib/repositories/client-repository";
import {
  buildDemoSleepWellnessReportBundle,
  buildSleepWellnessReportBundleFromAnalysisResult,
} from "@/lib/sleep-analysis/from-analysis-result";
import type { SleepAnalysisData } from "@/lib/sleep-analysis/sleep-analysis-model";
import type { SleepWellnessReport } from "@/lib/sleep-analysis/sleep-wellness-report";

type LoadState =
  | { status: "loading" }
  | {
      status: "ready";
      report: SleepWellnessReport;
      data: SleepAnalysisData;
      clientName: string | null;
      measurementDate: string | null;
      storageKey: string;
      isDemo: boolean;
    }
  | { status: "error"; message: string };

function SleepWellnessReportPageInner() {
  const params = useSearchParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  const analysisId = params.get("analysisId")?.trim() || "";
  const forceDemo = params.get("demo") === "1";
  const autoPrint = params.get("print") === "1";

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (forceDemo) {
        if (cancelled) return;
        const bundle = buildDemoSleepWellnessReportBundle();
        setState({
          status: "ready",
          report: bundle.report,
          data: bundle.data,
          clientName: "佐藤 美咲",
          measurementDate: "2026-08-07",
          storageKey: "demo:2026-08-07",
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
          const bundle =
            buildSleepWellnessReportBundleFromAnalysisResult(hydrated);
          setState({
            status: "ready",
            report: bundle.report,
            data: bundle.data,
            clientName: hydrated.clientName ?? found.client.name ?? null,
            measurementDate: hydrated.measurementDate ?? null,
            storageKey: `${found.analysis.id}:${found.analysis.analysisDate}`,
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
        const bundle =
          buildSleepWellnessReportBundleFromAnalysisResult(session);
        setState({
          status: "ready",
          report: bundle.report,
          data: bundle.data,
          clientName: session.clientName ?? null,
          measurementDate: session.measurementDate ?? null,
          storageKey: `${session.analysisId || session.clientId || "session"}:${session.measurementDate || "na"}`,
          isDemo: false,
        });
        return;
      }

      if (cancelled) return;
      const demo = buildDemoSleepWellnessReportBundle();
      setState({
        status: "ready",
        report: demo.report,
        data: demo.data,
        clientName: "デモ クライアント",
        measurementDate: "2026-08-05",
        storageKey: "demo:2026-08-05",
        isDemo: true,
      });
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [analysisId, forceDemo]);

  useEffect(() => {
    if (!autoPrint || state.status !== "ready") return;
    if (isUnsafePrintEnvironment()) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [autoPrint, state.status]);

  const backHref = useMemo(() => {
    if (analysisId) {
      return `/analysis/result?analysisId=${encodeURIComponent(analysisId)}`;
    }
    return "/analysis/result";
  }, [analysisId]);

  if (state.status === "loading") {
    return (
      <main className={`min-h-screen bg-[var(--sw-surface)] ${PAGE_PADDING}`}>
        <div className="mx-auto max-w-[720px] animate-pulse space-y-4">
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
        <div className="mx-auto max-w-[720px] rounded-[28px] border border-[rgba(7,20,38,0.1)] bg-white p-6">
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
    <main className="swr-print-root report-print-root min-h-screen overflow-x-hidden bg-[var(--sw-surface)] pt-[max(1rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))] print:bg-white print:pt-0 print:pb-0">
      <div className="no-print mx-auto flex max-w-[640px] flex-wrap items-end justify-between gap-4 px-5 pt-6 sm:px-8">
        <div>
          <Link
            href={backHref}
            className="text-[13px] font-medium text-slate-400 underline-offset-2 transition hover:text-[#071426] hover:underline"
          >
            ← 戻る
          </Link>
          <p
            className="mt-3 text-[10px] font-semibold tracking-[0.22em]"
            style={{ color: "#8a6a2d" }}
          >
            SLEEP WELLNESS REPORT
          </p>
          <p className="mt-1 text-[15px] font-semibold tracking-[-0.02em] text-[#071426]">
            Sleep Wellness Method™
          </p>
          <p className="mt-1 text-[12px] text-slate-500">
            認定講師カウンセリングレポート
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {state.isDemo ? (
            <span className="rounded-full bg-[rgba(138,106,45,0.1)] px-3 py-1 text-[11px] font-semibold tracking-wide text-[#8a6a2d]">
              DEMO
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => {
              if (isUnsafePrintEnvironment()) {
                window.alert(
                  "このブラウザでは印刷ダイアログを開けません。保存したページをChromeまたはSafariで開いてPDFにしてください。",
                );
                return;
              }
              window.print();
            }}
            className={`inline-flex min-h-11 items-center justify-center rounded-full px-5 text-[13px] font-semibold text-white transition active:opacity-90 ${FOCUS_RING}`}
            style={{ background: NAVY }}
          >
            A4印刷（2ページ）
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[640px] px-5 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-10 print:max-w-none print:px-0 print:py-0 print:pb-0 print:pt-0">
        <SleepWellnessReportView
          report={state.report}
          data={state.data}
          clientName={state.clientName}
          measurementDate={state.measurementDate}
          storageKey={state.storageKey}
          clientAge={state.isDemo ? 42 : null}
          clientGender={state.isDemo ? "female" : null}
        />
      </div>
    </main>
  );
}

export default function SleepWellnessReportPage() {
  return (
    <Suspense
      fallback={
        <main className={`min-h-screen bg-[var(--sw-surface)] ${PAGE_PADDING}`}>
          <div className="mx-auto max-w-[720px] animate-pulse space-y-4">
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
