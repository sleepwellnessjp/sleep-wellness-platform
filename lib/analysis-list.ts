/**
 * 睡眠分析一覧 — Version 1.0 Beta。
 * 担当クライアントの analyses を横断集約し、日付 / スコア / 改善率で並べ替え可能にする。
 */

import { computeImprovementRate } from "@/lib/client-portal/helpers";
import type { StoredClient } from "@/lib/client-store";
import { DEMO_CLIENTS, DEMO_INSTRUCTOR_NAME } from "@/lib/demo-clients";
import {
  DataAccessError,
  userMessageFromUnknown,
} from "@/lib/data-access-errors";
import {
  analysisSleepScore,
  loadClients,
} from "@/lib/repositories/client-repository";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getInstructorAuth } from "@/lib/repositories/v1-beta-auth";

export type AnalysisListSort = "date" | "score" | "improvement";

export type AnalysisListItem = {
  id: string;
  clientId: string;
  clientName: string;
  /** ISO date YYYY-MM-DD */
  analysisDate: string;
  sleepScore: number | null;
  /** 初回→最新の改善率（0–100）。比較不可は null */
  improvementRate: number | null;
  href: string;
};

export type AnalysisListPageData = {
  instructorDisplayName: string;
  analyses: AnalysisListItem[];
};

function demoAnalyses(): AnalysisListItem[] {
  return DEMO_CLIENTS.filter(
    (client) => client.lastAnalysisDate && client.sleepScore != null,
  ).map((client, index) => ({
    id: `analysis-demo-${client.id}`,
    clientId: client.id,
    clientName: client.name,
    analysisDate: client.lastAnalysisDate!,
    sleepScore: client.sleepScore,
    improvementRate: Math.max(0, Math.min(100, 8 + ((index * 7) % 40))),
    href: `/clients/${encodeURIComponent(client.id)}`,
  }));
}

function buildItemsFromClients(clients: StoredClient[]): AnalysisListItem[] {
  const items: AnalysisListItem[] = [];
  for (const client of clients) {
    const improvementRate = computeImprovementRate(client.analyses);
    for (const analysis of client.analyses) {
      const analysisDate =
        analysis.analysisDate?.trim() ||
        (analysis.createdAt ? analysis.createdAt.slice(0, 10) : "");
      if (!analysisDate) continue;
      items.push({
        id: analysis.id,
        clientId: client.id,
        clientName: client.name,
        analysisDate,
        sleepScore: analysisSleepScore(analysis),
        improvementRate,
        href: `/analysis/result?analysisId=${encodeURIComponent(analysis.id)}`,
      });
    }
  }
  return items;
}

export function sortAnalysisListItems(
  items: AnalysisListItem[],
  sort: AnalysisListSort,
): AnalysisListItem[] {
  const next = [...items];
  if (sort === "score") {
    next.sort((a, b) => {
      const aScore = a.sleepScore ?? -1;
      const bScore = b.sleepScore ?? -1;
      if (bScore !== aScore) return bScore - aScore;
      return b.analysisDate.localeCompare(a.analysisDate);
    });
    return next;
  }
  if (sort === "improvement") {
    next.sort((a, b) => {
      const aRate = a.improvementRate ?? -1;
      const bRate = b.improvementRate ?? -1;
      if (bRate !== aRate) return bRate - aRate;
      return b.analysisDate.localeCompare(a.analysisDate);
    });
    return next;
  }
  next.sort((a, b) => b.analysisDate.localeCompare(a.analysisDate));
  return next;
}

export async function getAnalysisListPageData(): Promise<AnalysisListPageData> {
  if (!isSupabaseConfigured()) {
    return {
      instructorDisplayName: DEMO_INSTRUCTOR_NAME,
      analyses: sortAnalysisListItems(
        demoAnalyses().map((item) => ({
          ...item,
          href: item.id.startsWith("analysis-demo-")
            ? `/clients/${encodeURIComponent(item.clientId)}`
            : item.href,
        })),
        "date",
      ),
    };
  }

  const auth = await getInstructorAuth();
  if (!auth) {
    throw new DataAccessError(
      "unauthenticated",
      "ログインが必要です。認定講師アカウントでサインインしてください。",
    );
  }

  let instructorDisplayName = "認定講師";
  try {
    const supabase = createBrowserClient();
    if (supabase) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", auth.userId)
        .maybeSingle();
      const name = (profile as { display_name?: string | null } | null)
        ?.display_name;
      if (name?.trim()) instructorDisplayName = name.trim();
    }
  } catch {
    // ignore
  }

  try {
    const clients = await loadClients();
    return {
      instructorDisplayName,
      analyses: sortAnalysisListItems(buildItemsFromClients(clients), "date"),
    };
  } catch (error) {
    throw new DataAccessError("load_failed", userMessageFromUnknown(error));
  }
}

export function formatAnalysisDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${Number(match[2])}月${Number(match[3])}日`;
}

export function formatImprovementRate(rate: number | null): string {
  if (rate == null || !Number.isFinite(rate)) return "—";
  return `${rate}%`;
}
