"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import InstructorNav from "@/components/InstructorNav";
import MetricTrendChart from "@/components/MetricTrendChart";
import {
  PRIMARY_COMPARE_KEYS,
  analysisOptionLabel,
  assessmentStyle,
  buildComparison,
  buildMetricTrendSeries,
  trendColor,
  type CompareMetricKey,
  type CompareMetricRow,
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

const TREND_CHARTS: Array<{
  key: CompareMetricKey;
  title: string;
  unitHint: string;
  invertY?: boolean;
}> = [
  { key: "sleepScore", title: "睡眠スコア推移", unitHint: "pt" },
  { key: "deepSleep", title: "深睡眠推移", unitHint: "分" },
  { key: "hrv", title: "HRV推移", unitHint: "ms" },
  { key: "sleepEfficiency", title: "睡眠効率推移", unitHint: "%" },
  { key: "stress", title: "ストレス推移", unitHint: "", invertY: true },
];

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
  const [aiComments, setAiComments] = useState<ComparisonResult["comments"] | null>(
    null,
  );
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

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

  useEffect(() => {
    if (!comparison || !client) {
      setAiComments(null);
      setAiError(null);
      setAiLoading(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();
    setAiLoading(true);
    setAiError(null);

    void (async () => {
      try {
        const response = await fetch("/api/compare-comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            clientName: client.name,
            beforeDate: comparison.before.analysisDate,
            afterDate: comparison.after.analysisDate,
            assessment: comparison.assessment,
            scoreDelta: comparison.scoreDelta,
            metrics: comparison.primaryMetrics.map((row) => ({
              key: row.key,
              label: row.label,
              beforeDisplay: row.beforeDisplay,
              afterDisplay: row.afterDisplay,
              deltaDisplay: row.deltaDisplay,
              trend: row.trend,
            })),
          }),
        });
        const payload = (await response.json()) as {
          error?: string;
          improvements?: string;
          concerns?: string;
          factors?: string;
          nextGuidance?: string;
          aiNarrative?: string;
        };
        if (!response.ok) {
          throw new Error(payload.error || "AIコメントの取得に失敗しました。");
        }
        if (cancelled) return;
        setAiComments({
          improvements:
            payload.improvements?.trim() || comparison.comments.improvements,
          concerns: payload.concerns?.trim() || comparison.comments.concerns,
          factors: payload.factors?.trim() || comparison.comments.factors,
          nextGuidance:
            payload.nextGuidance?.trim() || comparison.comments.nextGuidance,
          aiNarrative:
            payload.aiNarrative?.trim() || comparison.comments.aiNarrative,
        });
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error("[clients/compare] AI comment failed:", error);
        setAiComments(null);
        setAiError(
          error instanceof Error
            ? error.message
            : "AIコメントの取得に失敗しました。",
        );
      } finally {
        if (!cancelled) setAiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [comparison, client]);

  const displayComments = aiComments ?? comparison?.comments ?? null;

  const trendSeries = useMemo(() => {
    return Object.fromEntries(
      PRIMARY_COMPARE_KEYS.map((key) => [
        key,
        buildMetricTrendSeries(analyses, key),
      ]),
    ) as Record<CompareMetricKey, ReturnType<typeof buildMetricTrendSeries>>;
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
              比較分析
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-slate-600 sm:text-base">
            前回との睡眠スコア・深睡眠・HRV・睡眠効率・ストレスの差を確認し、AI改善コメントで次の指導につなげます。
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
                  label="Before（前回）"
                  value={beforeId}
                  analyses={analyses}
                  onChange={setBeforeId}
                  excludeId={afterId}
                />
                <AnalysisSelect
                  label="After（今回）"
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
                <Section eyebrow="DELTA" title="前回との差分">
                  <p className="mb-5 text-[13px] leading-6 text-slate-500">
                    改善は
                    <span className="mx-1 font-semibold text-[#2563eb]">青↑</span>
                    、悪化は
                    <span className="mx-1 font-semibold text-[#dc2626]">赤↓</span>
                    で表示します。
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
                    {comparison.primaryMetrics.map((row) => (
                      <PrimaryDeltaCard key={row.key} row={row} />
                    ))}
                  </div>
                </Section>

                {comparison.metrics.filter(
                  (row) => !PRIMARY_COMPARE_KEYS.includes(row.key),
                ).length > 0 ? (
                  <Section eyebrow="MORE METRICS" title="その他の指標">
                    <div className="compare-summary-grid space-y-3">
                      {comparison.metrics
                        .filter(
                          (row) => !PRIMARY_COMPARE_KEYS.includes(row.key),
                        )
                        .map((row) => (
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
                                <span className="ml-1.5 text-base">
                                  {row.arrow}
                                </span>
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </Section>
                ) : null}

                <Section eyebrow="SUMMARY" title="指標詳細（Before → After）">
                  <div className="compare-summary-grid space-y-3">
                    {comparison.primaryMetrics.map((row) => (
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

                <Section eyebrow="AI INSIGHT" title="AI改善コメント">
                  {aiLoading ? (
                    <p className="mb-4 text-[14px] text-slate-500">
                      AIコメントを生成しています…
                    </p>
                  ) : null}
                  {aiError && !aiComments ? (
                    <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-6 text-amber-900">
                      {aiError}
                      （差分コメントを表示します）
                    </p>
                  ) : null}
                  {displayComments?.aiNarrative ? (
                    <article className="mb-4 rounded-2xl border border-[#2563eb]/15 bg-[#f8fafc] px-4 py-4 sm:px-5">
                      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#2563eb]">
                        AI解説 · 前回比較
                      </p>
                      <p className="mt-2 text-[14px] leading-7 text-slate-600 sm:text-[15px]">
                        {displayComments.aiNarrative}
                      </p>
                    </article>
                  ) : null}
                  {displayComments ? (
                    <div className="compare-comments grid gap-4 sm:grid-cols-2">
                      <CommentBlock
                        title="改善した点"
                        text={displayComments.improvements}
                        tone="improved"
                      />
                      <CommentBlock
                        title="悪化または注意が必要な点"
                        text={displayComments.concerns}
                        tone="worsened"
                      />
                      <CommentBlock
                        title="考えられる要因"
                        text={displayComments.factors}
                      />
                      <CommentBlock
                        title="次の指導提案"
                        text={displayComments.nextGuidance}
                      />
                    </div>
                  ) : null}
                </Section>

                <Section eyebrow="TREND" title="指標の推移（折れ線）">
                  <div className="compare-charts no-print space-y-6">
                    {TREND_CHARTS.map((chart) => (
                      <MetricTrendChart
                        key={chart.key}
                        title={chart.title}
                        unitHint={chart.unitHint}
                        invertY={chart.invertY}
                        points={trendSeries[chart.key] ?? []}
                        highlight={{
                          before: comparison.before.analysisDate,
                          after: comparison.after.analysisDate,
                        }}
                        emptyMessage={`${chart.title}のデータがありません`}
                      />
                    ))}
                  </div>
                  <div className="compare-print-table mt-4 hidden print:block">
                    <table className="w-full border-collapse text-left text-[12px]">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="py-2 pr-3 font-semibold">指標</th>
                          <th className="py-2 pr-3 font-semibold">Before</th>
                          <th className="py-2 pr-3 font-semibold">After</th>
                          <th className="py-2 font-semibold">差分</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.metrics.map((row) => (
                          <tr
                            key={row.key}
                            className="border-b border-slate-100"
                          >
                            <td className="py-2 pr-3">{row.label}</td>
                            <td className="py-2 pr-3">{row.beforeDisplay}</td>
                            <td className="py-2 pr-3">{row.afterDisplay}</td>
                            <td className="py-2">
                              {row.deltaDisplay} {row.arrow}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="compare-chart-note mt-5 text-center text-[12px] text-slate-400 no-print">
                    Before（灰）と After（青）を強調表示しています
                  </p>
                </Section>

                <div className="compare-print-meta hidden print:block">
                  <p className="text-[10px] tracking-[0.16em] text-slate-400">
                    Before: {formatDisplayDate(comparison.before.analysisDate)} ·
                    After: {formatDisplayDate(comparison.after.analysisDate)}
                  </p>
                  <p className="mt-3 text-[11px] leading-5 text-slate-500">
                    本レポートは睡眠ウェルネス指導のための参考情報であり、医療診断・治療を目的としたものではありません。
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

function PrimaryDeltaCard({ row }: { row: CompareMetricRow }) {
  return (
    <article className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-3.5 py-4 sm:px-4 sm:py-5">
      <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400">
        {row.label}
      </p>
      <p
        className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] tabular-nums sm:text-[1.5rem]"
        style={{ color: trendColor(row.trend) }}
      >
        <span aria-hidden="true">{row.arrow}</span>
        <span className="ml-1">{row.deltaDisplay}</span>
      </p>
      <p className="mt-2 text-[11px] leading-5 text-slate-400">
        {row.beforeDisplay}
        <span className="mx-1 text-slate-300">→</span>
        {row.afterDisplay}
      </p>
    </article>
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

function CommentBlock({
  title,
  text,
  tone,
}: {
  title: string;
  text: string;
  tone?: "improved" | "worsened";
}) {
  const accent =
    tone === "improved"
      ? "#2563eb"
      : tone === "worsened"
        ? "#dc2626"
        : NAVY;

  return (
    <article className="compare-comment rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5">
      <h3
        className="text-[13px] font-semibold tracking-[-0.01em]"
        style={{ color: accent }}
      >
        {title}
      </h3>
      <p className="mt-2 text-[14px] leading-7 text-slate-600 sm:text-[15px]">
        {text}
      </p>
    </article>
  );
}
