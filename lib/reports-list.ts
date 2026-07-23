/**
 * Report 一覧 — Version 1.0 Beta ダミーデータ。
 * DEMO_CLIENTS と同じクライアント ID で画面遷移する。
 */

import {
  DEMO_CLIENTS,
  DEMO_INSTRUCTOR_NAME,
  type DemoClient,
} from "@/lib/demo-clients";
import {
  generateAiSleepAnalysisSync,
  toReportExcerpt,
  type AiSleepAnalysisInput,
  type ReportAiExcerpt,
} from "@/lib/ai-analysis";

export type ReportStatus = "ready" | "draft" | "pending";

export type ReportListItem = {
  id: string;
  clientId: string;
  clientName: string;
  title: string;
  /** ISO date YYYY-MM-DD */
  createdAt: string;
  sleepScore: number | null;
  status: ReportStatus;
  href: string;
};

export type ReportsPageData = {
  instructorDisplayName: string;
  reports: ReportListItem[];
};

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  ready: "発行済み",
  draft: "下書き",
  pending: "準備中",
};

function reportForClient(client: DemoClient, index: number): ReportListItem | null {
  if (!client.lastAnalysisDate || client.sleepScore == null) {
    return {
      id: `report-${client.id}-pending`,
      clientId: client.id,
      clientName: client.name,
      title: "初回分析レポート",
      createdAt: client.assignedDay ?? "2026-07-23",
      sleepScore: null,
      status: "pending",
      href: `/analysis?clientId=${encodeURIComponent(client.id)}`,
    };
  }

  const status: ReportStatus = index % 5 === 0 ? "draft" : "ready";
  return {
    id: `report-${client.id}-1`,
    clientId: client.id,
    clientName: client.name,
    title: "Sleep Wellness Report",
    createdAt: client.lastAnalysisDate,
    sleepScore: client.sleepScore,
    status,
    href:
      status === "ready"
        ? `/clients/${encodeURIComponent(client.id)}`
        : `/analysis?clientId=${encodeURIComponent(client.id)}`,
  };
}

export function getReportsPageData(): ReportsPageData {
  return {
    instructorDisplayName: DEMO_INSTRUCTOR_NAME,
    reports: DEMO_CLIENTS.map((client, index) =>
      reportForClient(client, index),
    ).filter((item): item is ReportListItem => item != null),
  };
}

export function formatReportDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${Number(match[2])}月${Number(match[3])}日`;
}

/**
 * AI Sleep Analysis Engine から Report 本文抜粋を生成。
 * Analysis Result / Journey / Homework と同じエンジン出力を共有する。
 */
export function buildReportExcerptFromAnalysis(
  input: AiSleepAnalysisInput,
): ReportAiExcerpt {
  return toReportExcerpt(generateAiSleepAnalysisSync(input));
}
