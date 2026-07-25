/**
 * クライアント管理一覧 — 表示用データ契約。
 * clients / client_profiles / analyses / appointments / programs を集約する。
 */

import type { StoredClient } from "@/lib/client-store";
import { DEMO_CLIENTS } from "@/lib/demo-clients";
import {
  analysisSleepScore,
  loadClients,
} from "@/lib/repositories/client-repository";
import { getNextClientAppointment } from "@/lib/repositories/client-appointments-repository";
import { getProgramDetail } from "@/lib/repositories/program-repository";
import { createBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type ClientGender = "female" | "male" | "other" | "unspecified";

export type ClientManagementItem = {
  id: string;
  name: string;
  email: string;
  instructorName: string;
  age: number | null;
  gender: ClientGender;
  /** 画像 URL。null のときはイニシャルアバター */
  avatarUrl: string | null;
  sleepScore: number | null;
  /** ISO date YYYY-MM-DD */
  lastAnalysisDate: string | null;
  /** ISO date YYYY-MM-DD */
  nextFollowUpDate: string | null;
  /** 担当日（次回セッション等）ISO date YYYY-MM-DD */
  assignedDay: string | null;
  /** Sleep Journey 進捗 0–100 */
  journeyProgress: number;
};

export type ClientManagementListResult = {
  clients: ClientManagementItem[];
  totalCount: number;
};

export const GENDER_LABELS: Record<ClientGender, string> = {
  female: "女性",
  male: "男性",
  other: "その他",
  unspecified: "未設定",
};

/** 1ページあたり件数 */
export const CLIENT_MANAGEMENT_PAGE_SIZE = 6;

/** 開発・デモ用ダミー（Supabase 未設定かつローカルデータなしのときのみ） */
export const DUMMY_CLIENT_MANAGEMENT_LIST: ClientManagementItem[] =
  DEMO_CLIENTS.map((client, index) => ({
    id: client.id,
    name: client.name,
    email: `${client.id.replace(/^client-demo-/, "client")}@example.com`,
    instructorName:
      index % 5 === 0 ? "佐藤 認定講師" : client.instructorName,
    age: client.age,
    gender: client.gender,
    avatarUrl: null,
    sleepScore: client.sleepScore,
    lastAnalysisDate: client.lastAnalysisDate,
    nextFollowUpDate: client.nextFollowUpDate,
    assignedDay: client.assignedDay,
    journeyProgress: client.journeyProgress,
  }));

export function mapGender(value: string | null | undefined): ClientGender {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "unspecified";
  if (
    raw === "female" ||
    raw === "f" ||
    raw === "女" ||
    raw === "女性" ||
    raw.includes("female")
  ) {
    return "female";
  }
  if (
    raw === "male" ||
    raw === "m" ||
    raw === "男" ||
    raw === "男性" ||
    raw.includes("male")
  ) {
    return "male";
  }
  if (raw === "other" || raw === "その他") return "other";
  return "unspecified";
}

function journeyProgressFromProgram(menuChecked: number, menuTotal: number): number {
  if (menuTotal <= 0) return 0;
  return Math.round((menuChecked / menuTotal) * 100);
}

async function resolveCurrentInstructorName(): Promise<string> {
  if (!isSupabaseConfigured()) return "認定講師";
  const supabase = createBrowserClient();
  if (!supabase) return "認定講師";
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return "認定講師";
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const name =
      data &&
      typeof (data as { display_name?: string | null }).display_name === "string"
        ? (data as { display_name: string }).display_name.trim()
        : "";
    return name || "認定講師";
  } catch {
    return "認定講師";
  }
}

async function toManagementItem(
  client: StoredClient,
  instructorName: string,
): Promise<ClientManagementItem> {
  const latest = client.analyses[0] ?? null;
  let nextFollowUpDate: string | null = client.nextFollowUpDate ?? null;
  let journeyProgress = 0;

  try {
    const next = await getNextClientAppointment(client.id);
    if (!nextFollowUpDate) {
      nextFollowUpDate = next?.startDate ?? null;
    }
  } catch {
    // ignore
  }

  try {
    const program = await getProgramDetail(client.id);
    if (!nextFollowUpDate) {
      nextFollowUpDate = program?.nextFollowUpDate ?? null;
    }
    if (program?.menuItems?.length) {
      const checked = program.menuItems.filter((item) => item.checked).length;
      journeyProgress = journeyProgressFromProgram(
        checked,
        program.menuItems.length,
      );
    }
  } catch {
    // ignore
  }

  const sleepScore =
    latest
      ? analysisSleepScore(latest)
      : typeof client.currentSleepScore === "number"
        ? client.currentSleepScore
        : null;

  return {
    id: client.id,
    name: client.name,
    email: (client.email ?? "").trim(),
    instructorName,
    age: typeof client.age === "number" ? client.age : null,
    gender: mapGender(client.gender),
    avatarUrl: null,
    sleepScore,
    lastAnalysisDate: latest?.analysisDate ?? null,
    nextFollowUpDate,
    assignedDay: nextFollowUpDate,
    journeyProgress,
  };
}

/**
 * クライアント管理一覧取得。
 */
export async function getClientManagementList(): Promise<ClientManagementListResult> {
  let clients: StoredClient[] = [];
  try {
    clients = await loadClients();
  } catch (error) {
    console.error("[client-management] loadClients failed:", error);
    // デモ未設定時のみ空扱い。本番では呼び出し側でエラー表示する
    if (isSupabaseConfigured()) {
      throw error;
    }
  }

  if (!isSupabaseConfigured() && clients.length === 0) {
    return {
      clients: DUMMY_CLIENT_MANAGEMENT_LIST,
      totalCount: DUMMY_CLIENT_MANAGEMENT_LIST.length,
    };
  }

  const instructorName = await resolveCurrentInstructorName();
  const items = await Promise.all(
    clients.map((client) => toManagementItem(client, instructorName)),
  );
  items.sort((a, b) => {
    const aDate = a.lastAnalysisDate ?? a.assignedDay ?? "";
    const bDate = b.lastAnalysisDate ?? b.assignedDay ?? "";
    return bDate.localeCompare(aDate);
  });

  return {
    clients: items,
    totalCount: items.length,
  };
}

export function formatManagementDate(isoDate: string | null): string {
  if (!isoDate) return "未設定";
  const d = new Date(`${isoDate}T12:00:00+09:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(d);
}

export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 1);
  return `${parts[0]!.slice(0, 1)}${parts[1]!.slice(0, 1)}`;
}

export type ClientManagementFilters = {
  nameQuery: string;
  emailQuery: string;
  instructorQuery: string;
  sleepScoreQuery: string;
  assignedDayQuery: string;
};

export function listInstructorFilterOptions(
  clients: ClientManagementItem[],
): string[] {
  const names = new Set<string>();
  for (const client of clients) {
    const name = client.instructorName.trim();
    if (name) names.add(name);
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "ja"));
}

export function filterClientManagementItems(
  clients: ClientManagementItem[],
  filters: ClientManagementFilters,
): ClientManagementItem[] {
  const nameQ = filters.nameQuery.trim().toLowerCase();
  const emailQ = filters.emailQuery.trim().toLowerCase();
  const instructorQ = filters.instructorQuery.trim().toLowerCase();
  const scoreQ = filters.sleepScoreQuery.trim();
  const dayQ = filters.assignedDayQuery.trim();

  return clients.filter((client) => {
    if (nameQ && !client.name.toLowerCase().includes(nameQ)) {
      return false;
    }

    if (emailQ && !client.email.toLowerCase().includes(emailQ)) {
      return false;
    }

    if (
      instructorQ &&
      instructorQ !== "all" &&
      !client.instructorName.toLowerCase().includes(instructorQ)
    ) {
      return false;
    }

    if (scoreQ) {
      if (client.sleepScore == null) return false;
      const scoreStr = String(client.sleepScore);
      if (!scoreStr.includes(scoreQ)) return false;
    }

    if (dayQ) {
      if (!client.assignedDay) return false;
      if (!client.assignedDay.includes(dayQ)) return false;
    }

    return true;
  });
}
