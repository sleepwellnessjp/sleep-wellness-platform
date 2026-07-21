"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import InstructorNav from "@/components/InstructorNav";
import ClientLongTermTrends from "@/components/ClientLongTermTrends";
import SleepScoreChart from "@/components/SleepScoreChart";
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
    <section className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-6 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-8">
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

function scoreLabel(analysis: StoredAnalysis): number | string {
  return analysis.sleepScore ?? analysis.wellnessScore ?? "—";
}

export default function ClientDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [client, setClient] = useState<StoredClient | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!id) {
      setClient(null);
      setReady(true);
      return;
    }

    const refresh = async () => {
      setClient(await getClientById(id));
    };
    void refresh();
    setReady(true);

    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener("storage", onUpdate);
    window.addEventListener("swij-clients-updated", onUpdate);
    return () => {
      window.removeEventListener("storage", onUpdate);
      window.removeEventListener("swij-clients-updated", onUpdate);
    };
  }, [id]);

  const chartPoints = useMemo(() => {
    if (!client) return [];
    return [...client.analyses]
      .reverse()
      .filter(
        (a) =>
          typeof a.sleepScore === "number" || typeof a.wellnessScore === "number",
      )
      .map((a) => ({
        date: a.analysisDate,
        score: a.sleepScore ?? a.wellnessScore,
      }));
  }, [client]);

  const pdfEntries = useMemo(() => {
    if (!client) return [];
    return client.analyses.flatMap((analysis) =>
      analysis.pdfHistory.map((pdf) => ({
        ...pdf,
        analysisDate: analysis.analysisDate,
        analysisId: analysis.id,
      })),
    );
  }, [client]);

  const commentHistory = useMemo(() => {
    if (!client) return [];
    return client.analyses.map((analysis) => ({
      id: analysis.id,
      date: analysis.analysisDate,
      summary: analysis.result.summary,
      highlights: (
        analysis.result.improvements?.length
          ? analysis.result.improvements
          : analysis.result.goodPoints ?? []
      ).slice(0, 2),
    }));
  }, [client]);

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
            CLIENT
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

  const latest = client.analyses[0];

  return (
    <main className="min-h-screen bg-[#f7f7f5]">
      <InstructorNav eyebrow="CLIENT DETAIL" />

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:space-y-8 sm:px-8 sm:py-14">
        <header className="rounded-[28px] border border-slate-200/90 bg-white px-5 py-7 shadow-[0_20px_60px_-48px_rgba(15,23,42,0.22)] sm:px-8 sm:py-9">
          <p
            className="text-[11px] font-semibold tracking-[0.28em]"
            style={{ color: GOLD }}
          >
            CLIENT PROFILE
          </p>
          <h1
            className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] sm:text-4xl"
            style={{ color: NAVY }}
          >
            {client.name}
          </h1>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-2xl bg-[#fafaf8] px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                登録日
              </p>
              <p className="mt-1 text-base font-semibold" style={{ color: NAVY }}>
                {formatDisplayDate(client.registeredAt)}
              </p>
            </div>
            <div className="rounded-2xl bg-[#fafaf8] px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                分析回数
              </p>
              <p className="mt-1 text-base font-semibold" style={{ color: NAVY }}>
                {client.analyses.length} 回
              </p>
            </div>
            <div className="rounded-2xl bg-[#fafaf8] px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                最新スコア
              </p>
              <p className="mt-1 text-base font-semibold" style={{ color: NAVY }}>
                {latest ? scoreLabel(latest) : "—"}
              </p>
            </div>
            <div className="rounded-2xl bg-[#fafaf8] px-4 py-4">
              <p className="text-[10px] font-semibold tracking-[0.16em] text-slate-400">
                最新分析日
              </p>
              <p className="mt-1 text-base font-semibold" style={{ color: NAVY }}>
                {formatDisplayDate(latest?.analysisDate)}
              </p>
            </div>
          </div>
        </header>

        <Section eyebrow="LATEST" title="最新分析">
          {latest ? (
            <div className="space-y-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">
                    {formatDisplayDate(latest.analysisDate)}
                  </p>
                  <p
                    className="mt-1 text-3xl font-semibold tracking-[-0.05em]"
                    style={{ color: NAVY }}
                  >
                    {scoreLabel(latest)}
                    <span className="ml-2 text-sm font-medium text-slate-400">
                      Sleep Score
                    </span>
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                  <p className="text-sm text-slate-500">
                    Wellness {latest.wellnessScore}
                  </p>
                  <Link
                    href={`/analysis/result?analysisId=${encodeURIComponent(latest.id)}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
                    style={{ backgroundColor: NAVY }}
                  >
                    レポートを開く
                  </Link>
                </div>
              </div>
              <p className="text-[15px] leading-7 text-slate-600 sm:text-base sm:leading-8">
                {latest.result.summary || "—"}
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["睡眠時間", latest.metrics.sleepDuration],
                  ["睡眠効率", latest.metrics.sleepEfficiency],
                  ["HRV", latest.metrics.hrv],
                  ["深い睡眠", latest.metrics.deepSleep],
                  ["ストレス", latest.metrics.stress],
                  ["SpO₂", latest.metrics.spo2],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-3"
                  >
                    <p className="text-[10px] font-semibold tracking-[0.14em] text-slate-400">
                      {label}
                    </p>
                    <p
                      className="mt-1 text-sm font-semibold"
                      style={{ color: NAVY }}
                    >
                      {value?.trim() || "—"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">分析データがありません</p>
          )}
        </Section>

        <Section eyebrow="TREND" title="長期推移">
          <ClientLongTermTrends analyses={client.analyses} />
        </Section>

        <Section eyebrow="SCORE" title="睡眠スコア推移">
          <SleepScoreChart points={chartPoints} />
        </Section>

        <Section eyebrow="HISTORY" title="過去分析一覧">
          {client.analyses.length === 0 ? (
            <p className="text-sm text-slate-400">まだ分析がありません</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {client.analyses.map((analysis) => (
                <li
                  key={analysis.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold" style={{ color: NAVY }}>
                      {formatDisplayDate(analysis.analysisDate)}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-slate-500">
                      {analysis.result.summary || "分析コメントなし"}
                    </p>
                    <p className="mt-2 text-sm text-slate-500 sm:hidden">
                      睡眠スコア{" "}
                      <span className="font-semibold" style={{ color: NAVY }}>
                        {scoreLabel(analysis)}
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-2">
                    <div className="hidden text-right sm:block">
                      <p
                        className="text-2xl font-semibold tracking-[-0.04em]"
                        style={{ color: NAVY }}
                      >
                        {scoreLabel(analysis)}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Wellness {analysis.wellnessScore}
                      </p>
                    </div>
                    <Link
                      href={`/analysis/result?analysisId=${encodeURIComponent(analysis.id)}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-[13px] font-semibold text-white"
                      style={{ backgroundColor: NAVY }}
                    >
                      詳細を見る
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section eyebrow="AI NOTES" title="AIコメント履歴">
          {commentHistory.length === 0 ? (
            <p className="text-sm text-slate-400">コメント履歴がありません</p>
          ) : (
            <div className="space-y-4">
              {commentHistory.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl border border-slate-100 bg-[#fafaf8] px-4 py-4 sm:px-5"
                >
                  <p
                    className="text-[11px] font-semibold tracking-[0.16em]"
                    style={{ color: GOLD }}
                  >
                    {formatDisplayDate(item.date)}
                  </p>
                  <p className="mt-2 text-[15px] leading-7 text-slate-600">
                    {item.summary || "—"}
                  </p>
                  {item.highlights.length > 0 && (
                    <ul className="mt-3 space-y-1">
                      {item.highlights.map((point) => (
                        <li
                          key={point}
                          className="text-[13px] leading-6 text-slate-500"
                        >
                          · {point}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              ))}
            </div>
          )}
        </Section>

        <Section eyebrow="PDF" title="PDFダウンロード履歴">
          {pdfEntries.length === 0 ? (
            <p className="text-sm text-slate-400">PDF履歴がありません</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {pdfEntries.map((pdf) => (
                <li
                  key={pdf.id}
                  className="flex flex-col gap-1 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-sm font-semibold" style={{ color: NAVY }}>
                      {pdf.label}
                    </p>
                    <p className="mt-1 text-[12px] text-slate-400">
                      分析日 {formatDisplayDate(pdf.analysisDate)}
                    </p>
                  </div>
                  <p className="text-[13px] text-slate-500">
                    {formatDisplayDate(pdf.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="flex flex-col gap-3 pb-6 sm:flex-row sm:justify-center">
          {client.analyses.length >= 2 && (
            <Link
              href={`/clients/${client.id}/compare`}
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#315f68]/25 bg-[#f4f7f7] px-8 py-3.5 text-base font-semibold transition hover:bg-[#eef3f3]"
              style={{ color: NAVY }}
            >
              分析を比較する
            </Link>
          )}
          <Link
            href="/clients"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold transition hover:bg-slate-50"
            style={{ color: NAVY }}
          >
            一覧へ戻る
          </Link>
          <Link
            href={`/analysis/new?clientId=${encodeURIComponent(client.id)}`}
            className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3.5 text-base font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: NAVY }}
          >
            新しい分析を作成
          </Link>
        </div>
      </div>
    </main>
  );
}
