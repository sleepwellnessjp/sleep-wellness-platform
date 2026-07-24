"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import InstructorNav from "@/components/InstructorNav";
import SleepScoreChart from "@/components/SleepScoreChart";
import {
  analysisOptionLabel,
  assessmentStyle,
  buildComparison,
  trendColor,
  type ComparisonResult,
  type OverallAssessment,
} from "@/lib/comparison-engine";
import {
  formatDisplayDate,
  getClientById,
  type StoredAnalysis,
  type StoredClient,
} from "@/lib/repositories/client-repository";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="compare-section rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8">
      <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-slate-100 pb-4">
        <h2
          className="text-lg font-semibold tracking-[-0.03em] sm:text-xl"
          style={{ color: NAVY }}
        >
          {title}
        </h2>
        <p
          className="text-[10px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          {eyebrow}
        </p>
      </div>
      {children}
    </section>
  );
}

function selectClassName() {
  return "mt-2.5 w-full rounded-2xl border border-slate-200 bg-[#fafaf8] px-4 py-3.5 text-[16px] text-[#071426] outline-none transition duration-300 focus:border-[#315f68] focus:bg-white focus:ring-4 focus:ring-[#315f68]/10 sm:text-base";
}

export default function ClientComparePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [client, setClient] = useState<StoredClient | null>(null);
  const [ready, setReady] = useState(false);
  const [beforeId, setBeforeId] = useState("");
  const [afterId, setAfterId] = useState("");

  useEffect(() => {
    let cancelled = false;

    if (!id) {
      setClient(null);
      setReady(true);
      return;
    }

    setReady(false);

    const refresh = async () => {
      try {
        const next = await getClientById(id);
        if (!cancelled) setClient(next);
      } catch (error) {
        console.error("[clients/compare] refresh failed:", error);
        if (!cancelled) setClient(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    };
    void refresh();

    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
    };
  }, [id]);

  const analyses = useMemo(() => client?.analyses ?? [], [client]);
  const canCompare = analyses.length >= 2;

  useEffect(() => {
    if (!canCompare) return;
    setAfterId((current) => current || analyses[0]?.id || "");
    setBeforeId((current) => current || analyses[1]?.id || "");
  }, [analyses, canCompare]);

  const beforeAnalysis = useMemo(
    () => analyses.find((item) => item.id === beforeId) ?? null,
    [analyses, beforeId],
  );
  const afterAnalysis = useMemo(
    () => analyses.find((item) => item.id === afterId) ?? null,
    [analyses, afterId],
  );

  const comparison: ComparisonResult | null = useMemo(() => {
    if (!beforeAnalysis || !afterAnalysis) return null;
    if (beforeAnalysis.id === afterAnalysis.id) return null;
    return buildComparison(beforeAnalysis, afterAnalysis);
  }, [beforeAnalysis, afterAnalysis]);

  const chartPoints = useMemo(() => {
    return [...analyses]
      .reverse()
      .filter(
        (a) =>
          typeof a.sleepScore === "number" ||
          typeof a.wellnessScore === "number",
      )
      .map((a) => ({
        date: a.analysisDate,
        score: a.sleepScore ?? a.wellnessScore,
      }));
  }, [analyses]);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5]">
        <p className="text-sm text-slate-400">読み込み中...</p>
      </main>
    );
  }

  if (!client) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5">
        <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 text-center sm:p-10">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            COMPARE
          </p>
          <h1
            className="mt-4 text-2xl font-semibold tracking-[-0.04em]"
            style={{ color: NAVY }}
          >
            クライアントが見つかりません
          </h1>
          <Link
            href="/clients"
            className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white"
            style={{ backgroundColor: NAVY }}
          >
            一覧へ戻る
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="compare-print-root min-h-screen bg-[#f7f7f5] print:bg-white">
      <div className="no-print">
        <InstructorNav eyebrow="COMPARE" />
      </div>

      <div className="compare-sheet mx-auto max-w-6xl space-y-6 px-5 py-10 sm:space-y-8 sm:px-8 sm:py-14">
        <header className="compare-header rounded-[28px] border border-slate-200/90 bg-white px-5 py-7 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-9">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            BEFORE / AFTER COMPARISON
          </p>
          <h1
            className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
            style={{ color: NAVY }}
          >
            {client.name}
            <span className="mt-2 block text-lg font-medium text-slate-500 sm:mt-0 sm:ml-3 sm:inline sm:text-xl">
              分析比較
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
            2回分の睡眠分析を比較し、メラトニンヨガ™や生活改善による変化を確認できます。
          </p>

          {comparison && (
            <AssessmentBadge assessment={comparison.assessment} />
          )}
        </header>

        {!canCompare ? (
          <Section eyebrow="NOTICE" title="比較できません">
            <p className="text-[15px] leading-7 text-slate-600">
              比較には2件以上の分析記録が必要です。
            </p>
            <Link
              href={`/analysis/new?clientId=${encodeURIComponent(client.id)}`}
              className="no-print mt-6 inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: NAVY }}
            >
              新しい分析を作成
            </Link>
          </Section>
        ) : (
          <>
            <section className="no-print compare-selectors rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8">
              <p
                className="text-[11px] font-semibold tracking-[0.26em]"
                style={{ color: GOLD }}
              >
                SELECT ANALYSES
              </p>
              <h2
                className="mt-2 text-xl font-semibold tracking-[-0.03em]"
                style={{ color: NAVY }}
              >
                比較する分析を選択
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <AnalysisSelect
                  label="Before"
                  value={beforeId}
                  analyses={analyses}
                  onChange={setBeforeId}
                  excludeId={afterId}
                />
                <AnalysisSelect
                  label="After"
                  value={afterId}
                  analyses={analyses}
                  onChange={setAfterId}
                  excludeId={beforeId}
                />
              </div>
              {beforeId && afterId && beforeId === afterId && (
                <p className="mt-4 text-sm font-medium text-rose-600">
                  Before と After には異なる分析を選択してください。
                </p>
              )}
            </section>

            {comparison && (
              <>
                <Section eyebrow="SUMMARY" title="比較サマリー">
                  <div className="compare-summary-grid space-y-3">
                    {comparison.metrics.map((row) => (
                      <div
                        key={row.key}
                        className="compare-summary-row grid grid-cols-1 gap-3 rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-center sm:gap-4 sm:px-5"
                      >
                        <div>
                          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                            Before
                          </p>
                          <p
                            className="mt-1 text-base font-semibold tracking-[-0.02em]"
                            style={{ color: NAVY }}
                          >
                            {row.beforeDisplay}
                          </p>
                        </div>

                        <div className="hidden text-center text-slate-300 sm:block">
                          →
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                            After
                          </p>
                          <p
                            className="mt-1 text-base font-semibold tracking-[-0.02em]"
                            style={{ color: NAVY }}
                          >
                            {row.afterDisplay}
                          </p>
                        </div>

                        <div className="sm:text-right">
                          <p
                            className="text-[13px] font-semibold tracking-[-0.01em]"
                            style={{ color: NAVY }}
                          >
                            {row.label}
                          </p>
                          <p
                            className="mt-1 text-lg font-semibold tracking-[-0.03em]"
                            style={{ color: trendColor(row.trend) }}
                          >
                            {row.deltaDisplay}
                            <span className="ml-1.5 text-base">{row.arrow}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section eyebrow="AI INSIGHT" title="変化コメント">
                  <div className="compare-comments grid gap-4 sm:grid-cols-2">
                    <CommentBlock
                      title="改善した点"
                      text={comparison.comments.improvements}
                    />
                    <CommentBlock
                      title="悪化または注意が必要な点"
                      text={comparison.comments.concerns}
                    />
                    <CommentBlock
                      title="考えられる要因"
                      text={comparison.comments.factors}
                    />
                    <CommentBlock
                      title="次の指導提案"
                      text={comparison.comments.nextGuidance}
                    />
                  </div>
                </Section>

                <Section eyebrow="TREND" title="睡眠スコア推移">
                  <SleepScoreChart
                    points={chartPoints}
                    highlight={{
                      before: comparison.before.analysisDate,
                      after: comparison.after.analysisDate,
                    }}
                  />
                  <p className="compare-chart-note mt-4 text-center text-[12px] text-slate-400">
                    Before（灰）と After（金）を強調表示しています
                  </p>
                </Section>

                <div className="compare-print-meta hidden print:block">
                  <p className="text-[10px] tracking-[0.16em] text-slate-400">
                    Before: {formatDisplayDate(comparison.before.analysisDate)} ·
                    After: {formatDisplayDate(comparison.after.analysisDate)}
                  </p>
                </div>
              </>
            )}
          </>
        )}

        <div className="no-print flex flex-col gap-3 pb-6 sm:flex-row sm:justify-center">
          {canCompare && comparison && (
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: NAVY }}
            >
              比較レポートをPDF保存
            </button>
          )}
          <Link
            href={`/clients/${client.id}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition hover:bg-slate-50"
            style={{ color: NAVY }}
          >
            詳細へ戻る
          </Link>
          <Link
            href="/clients"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition hover:bg-slate-50"
            style={{ color: NAVY }}
          >
            一覧へ戻る
          </Link>
        </div>
      </div>
    </main>
  );
}

function AssessmentBadge({
  assessment,
}: {
  assessment: OverallAssessment;
}) {
  const style = assessmentStyle(assessment);
  return (
    <div
      className="compare-assessment mt-6 inline-flex rounded-2xl border px-6 py-4 sm:mt-8 sm:px-8 sm:py-5"
      style={{
        backgroundColor: style.bg,
        borderColor: style.border,
        color: style.color,
      }}
    >
      <div>
        <p className="text-[10px] font-semibold tracking-[0.22em] opacity-80">
          OVERALL
        </p>
        <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] sm:text-3xl">
          {assessment}
        </p>
      </div>
    </div>
  );
}

function AnalysisSelect({
  label,
  value,
  analyses,
  onChange,
  excludeId,
}: {
  label: string;
  value: string;
  analyses: StoredAnalysis[];
  onChange: (value: string) => void;
  excludeId: string;
}) {
  return (
    <label className="block">
      <span
        className="text-[15px] font-semibold sm:text-sm"
        style={{ color: NAVY }}
      >
        {label}
      </span>
      <select
        className={selectClassName()}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">選択してください</option>
        {analyses.map((analysis) => (
          <option
            key={analysis.id}
            value={analysis.id}
            disabled={analysis.id === excludeId}
          >
            {analysisOptionLabel(analysis)}
          </option>
        ))}
      </select>
    </label>
  );
}

function CommentBlock({ title, text }: { title: string; text: string }) {
  return (
    <article className="compare-comment rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5">
      <h3
        className="text-[13px] font-semibold tracking-[-0.01em]"
        style={{ color: NAVY }}
      >
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-7 text-slate-600 sm:text-[15px]">
        {text}
      </p>
    </article>
  );
}
