"use client";

import Link from "next/link";
import {
  buildClientPdfReports,
  formatPdfReportShortDate,
  pdfReportResultHref,
  type ClientPdfReport,
} from "@/lib/client-pdf-reports";
import type { StoredAnalysis } from "@/lib/client-store";

const NAVY = "#071426";
const GOLD = "#8a6a2d";

type Props = {
  analyses: StoredAnalysis[];
  /**
   * 共有アクションを有効化するときに渡す。
   * 未指定時は共有ボタンを出さない（UI スロットのみ確保）。
   */
  onShare?: (report: ClientPdfReport) => void;
};

function ReportActions({
  report,
  onShare,
}: {
  report: ClientPdfReport;
  onShare?: (report: ClientPdfReport) => void;
}) {
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <Link
        href={pdfReportResultHref(report.analysisId)}
        className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#071426]/12 bg-white px-4 py-2 text-[13px] font-semibold transition hover:border-[#8a6a2d]/40 hover:bg-[#faf7f1]"
        style={{ color: NAVY }}
      >
        ダウンロード
      </Link>

      {/* 共有機能用スロット：onShare または share.enabled で表示 */}
      {onShare || report.share?.enabled ? (
        <button
          type="button"
          onClick={() => onShare?.(report)}
          disabled={!onShare}
          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[#8a6a2d]/30 bg-[#faf7f1] px-4 py-2 text-[13px] font-semibold transition hover:bg-[#f5efe4] disabled:cursor-not-allowed disabled:opacity-50"
          style={{ color: GOLD }}
        >
          共有
        </button>
      ) : null}
    </div>
  );
}

function ReportCard({
  report,
  onShare,
}: {
  report: ClientPdfReport;
  onShare?: (report: ClientPdfReport) => void;
}) {
  return (
    <li className="rounded-2xl border border-slate-200/90 bg-[#fafaf8] px-4 py-4 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <p
            className="text-[13px] font-semibold tracking-[-0.01em] tabular-nums sm:text-sm"
            style={{ color: GOLD }}
          >
            {formatPdfReportShortDate(report.reportDate)}
          </p>
          <p
            className="mt-1 text-[15px] font-semibold tracking-[-0.02em] sm:text-base"
            style={{ color: NAVY }}
          >
            {report.title}
          </p>
        </div>
        <ReportActions report={report} onShare={onShare} />
      </div>
    </li>
  );
}

export default function ClientPdfReportHistory({ analyses, onShare }: Props) {
  const reports = buildClientPdfReports(analyses);

  if (reports.length === 0) {
    return (
      <div className="flex min-h-[160px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#8a6a2d]/25 bg-[#faf7f1]/50 px-6 py-10 text-center">
        <p
          className="text-[11px] font-semibold tracking-[0.22em]"
          style={{ color: GOLD }}
        >
          PDF HISTORY
        </p>
        <p className="mt-3 text-sm font-semibold" style={{ color: NAVY }}>
          まだPDFレポートがありません
        </p>
        <p className="mt-2 max-w-sm text-[13px] leading-6 text-slate-500">
          分析を作成すると、ここに Sleep Report が一覧表示されます。
        </p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {reports.map((report) => (
        <ReportCard key={report.id} report={report} onShare={onShare} />
      ))}
    </ul>
  );
}
