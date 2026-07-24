import type { StoredAnalysis } from "@/lib/client-store";

/**
 * クライアント詳細の PDF レポート履歴 1 件。
 * 共有（shareUrl / sharedAt 等）を後から足しやすいよう、アクションとは分離したデータモデル。
 */
export type ClientPdfReport = {
  id: string;
  analysisId: string;
  /** 表示タイトル（例: Sleep Report） */
  title: string;
  /** 分析日 YYYY-MM-DD */
  reportDate: string;
  createdAt: string;
  /**
   * 共有機能用の拡張スロット（未実装時は undefined）
   * 追加時はここに url / token / sharedAt などを載せる。
   */
  share?: {
    enabled: boolean;
    url?: string | null;
    sharedAt?: string | null;
  };
};

export const DEFAULT_PDF_REPORT_TITLE = "Sleep Report";

/** 分析一覧から PDF レポート履歴を組み立てる（新しい順） */
export function buildClientPdfReports(
  analyses: StoredAnalysis[],
  title = DEFAULT_PDF_REPORT_TITLE,
): ClientPdfReport[] {
  return [...analyses]
    .map((analysis) => ({
      id: `report-${analysis.id}`,
      analysisId: analysis.id,
      title,
      reportDate: analysis.analysisDate,
      createdAt: analysis.createdAt,
    }))
    .sort((a, b) => b.reportDate.localeCompare(a.reportDate));
}

/** 例: 7/22 */
export function formatPdfReportShortDate(value?: string | null): string {
  if (!value?.trim()) return "—";
  const iso = value.trim();
  const dayMatch = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dayMatch) {
    return `${Number(dayMatch[2])}/${Number(dayMatch[3])}`;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return `${parsed.getMonth() + 1}/${parsed.getDate()}`;
}

export function pdfReportResultHref(analysisId: string): string {
  return `/client/analyses/${encodeURIComponent(analysisId)}`;
}

/** 認定講師向けの分析結果画面 */
export function instructorPdfReportResultHref(analysisId: string): string {
  return `/analysis/result?analysisId=${encodeURIComponent(analysisId)}`;
}
