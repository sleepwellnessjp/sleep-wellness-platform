/**
 * Homework / Follow-up 画面のデータ契約。
 * 現状はダミー＋クライアント詳細の合成。将来 Supabase の
 * client_homeworks / follow_up_records テーブルへ差し替えやすい形。
 */

import {
  DUMMY_CLIENT_MANAGEMENT_LIST,
  clientInitials,
  formatManagementDate,
} from "@/lib/client-management";
import { getClientDetail, type ClientDetail } from "@/lib/client-detail";
import {
  generateAiSleepAnalysisSync,
  toHomeworkDrafts,
  type AiSleepAnalysisInput,
  type HomeworkAiDraft,
} from "@/lib/ai-analysis";

export type HomeworkPriority = "high" | "medium" | "low";

export type HomeworkItemStatus =
  | "completed"
  | "active"
  | "not_started"
  | "overdue";

export type HomeworkFrequency =
  | "daily"
  | "weekdays"
  | "weekly"
  | "as_needed";

export type HomeworkItem = {
  id: string;
  clientId: string;
  title: string;
  description: string;
  /** ISO date YYYY-MM-DD */
  startDate: string;
  /** ISO date YYYY-MM-DD */
  dueDate: string;
  frequency: HomeworkFrequency;
  /** 0–100 */
  progressRate: number;
  status: HomeworkItemStatus;
  instructorComment: string;
  priority: HomeworkPriority;
  clientMessage: string;
};

export type FollowUpMethod =
  | "in_person"
  | "online"
  | "phone"
  | "message";

export type FollowUpRecord = {
  id: string;
  clientId: string;
  /** ISO date YYYY-MM-DD */
  conductedAt: string;
  method: FollowUpMethod;
  sleepScore: number | null;
  clientChange: string;
  instructorFinding: string;
  nextAction: string;
};

export type HomeworkProgressSummary = {
  completedCount: number;
  activeCount: number;
  notStartedCount: number;
  /** 0–100 */
  averageAchievementRate: number;
};

export type HomeworkFollowUpPageData = {
  clientId: string;
  name: string;
  avatarUrl: string | null;
  sleepScore: number | null;
  instructorName: string;
  /** ISO date YYYY-MM-DD */
  nextFollowUpDate: string | null;
  homeworks: HomeworkItem[];
  followUps: FollowUpRecord[];
  summary: HomeworkProgressSummary;
};

export type NewHomeworkDraft = {
  title: string;
  description: string;
  startDate: string;
  dueDate: string;
  frequency: HomeworkFrequency;
  priority: HomeworkPriority;
  clientMessage: string;
};

export type NewFollowUpDraft = {
  conductedAt: string;
  method: FollowUpMethod;
  sleepScore: string;
  clientChange: string;
  instructorFinding: string;
  nextAction: string;
};

export const HOMEWORK_FREQUENCY_LABELS: Record<HomeworkFrequency, string> = {
  daily: "毎日",
  weekdays: "平日",
  weekly: "週1回",
  as_needed: "必要時",
};

export const HOMEWORK_STATUS_LABELS: Record<HomeworkItemStatus, string> = {
  completed: "完了",
  active: "継続中",
  not_started: "未実施",
  overdue: "期限超過",
};

export const HOMEWORK_PRIORITY_LABELS: Record<HomeworkPriority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const FOLLOW_UP_METHOD_LABELS: Record<FollowUpMethod, string> = {
  in_person: "対面",
  online: "オンライン",
  phone: "電話",
  message: "メッセージ",
};

const DEFAULT_INSTRUCTOR = "認定講師";

function todayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function addDaysIso(base: string, days: number): string {
  const date = new Date(`${base}T12:00:00+09:00`);
  date.setDate(date.getDate() + days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function emptyHomeworkDraft(): NewHomeworkDraft {
  const start = todayIso();
  return {
    title: "",
    description: "",
    startDate: start,
    dueDate: addDaysIso(start, 14),
    frequency: "daily",
    priority: "medium",
    clientMessage: "",
  };
}

/**
 * AI Sleep Analysis Engine から宿題ドラフトを生成。
 * Analysis Result / Journey / Report と同じエンジン出力を共有する。
 */
export function buildHomeworkDraftsFromAnalysis(
  input: AiSleepAnalysisInput,
): HomeworkAiDraft[] {
  return toHomeworkDrafts(generateAiSleepAnalysisSync(input));
}

export function homeworkDraftFromAi(
  draft: HomeworkAiDraft,
): NewHomeworkDraft {
  const start = todayIso();
  return {
    title: draft.title,
    description: draft.description,
    startDate: start,
    dueDate: addDaysIso(start, 14),
    frequency: "daily",
    priority: draft.priority,
    clientMessage: draft.clientMessage,
  };
}

export function emptyFollowUpDraft(
  sleepScore: number | null = null,
): NewFollowUpDraft {
  return {
    conductedAt: todayIso(),
    method: "online",
    sleepScore: sleepScore != null ? String(sleepScore) : "",
    clientChange: "",
    instructorFinding: "",
    nextAction: "",
  };
}

function defaultHomeworks(clientId: string, clientName = "クライアント"): HomeworkItem[] {
  const start = "2026-07-10";
  const aiDrafts = buildHomeworkDraftsFromAnalysis({
    clientName,
    metrics: {
      sleepScore: 72,
      sleepDuration: "6時間30分",
      sleepEfficiency: "84%",
      deepSleep: "1時間5分",
      remSleep: "1時間20分",
      awakenings: "3回",
      hrv: "38ms",
      stress: "48",
      restingHeartRate: "62bpm",
      circadianRhythm: "やや遅れ",
    },
    lifestyle: {
      dinner: "遅め・炭水化物多め",
      alcohol: "ビール500ml",
      caffeine: "コーヒー2杯（うち1杯は17:00）",
      exercise: "なし",
      bathing: "シャワー",
      preBedBehavior: "スマホ40分",
    },
  });

  const fromEngine: HomeworkItem[] = aiDrafts.slice(0, 3).map((draft, index) => ({
    id: `hw-ai-${index + 1}`,
    clientId,
    title: draft.title,
    description: draft.description,
    startDate: start,
    dueDate: "2026-08-07",
    frequency: "daily" as const,
    progressRate: index === 0 ? 40 : index === 1 ? 65 : 20,
    status: (index === 2 ? "not_started" : "active") as HomeworkItemStatus,
    instructorComment: draft.instructorComment,
    priority: draft.priority,
    clientMessage: draft.clientMessage,
  }));

  return [
    ...fromEngine,
    {
      id: "hw-bath",
      clientId,
      title: "入浴15分",
      description: "38–40℃のぬるめのお湯で15分。深部体温の上昇を促す。",
      startDate: start,
      dueDate: "2026-07-31",
      frequency: "daily",
      progressRate: 100,
      status: "completed",
      instructorComment: "習慣化できました。このまま継続を。",
      priority: "medium",
      clientMessage: "入浴後はスマホを見ない時間をつくりましょう。",
    },
  ];
}

function defaultFollowUps(clientId: string): FollowUpRecord[] {
  return [
    {
      id: "fu-1",
      clientId,
      conductedAt: "2026-07-18",
      method: "online",
      sleepScore: 72,
      clientChange:
        "就寝時刻が安定し始め、夜間覚醒の回数が減ったと自覚がある。",
      instructorFinding:
        "夕食タイミングと入浴の定着がスコア改善に寄与している。呼吸法は継続課題。",
      nextAction: "3:6呼吸の実施率を上げ、メラトニンヨガを週3回から開始。",
    },
    {
      id: "fu-2",
      clientId,
      conductedAt: "2026-07-04",
      method: "in_person",
      sleepScore: 68,
      clientChange: "入眠までの時間が短縮。仕事のストレスは依然として高い。",
      instructorFinding:
        "就寝ルーティンの土台はできている。週末のリズム崩れに注意。",
      nextAction: "次回はストレス指標とHRVの推移をあわせて確認。",
    },
  ];
}

export function computeProgressSummary(
  homeworks: HomeworkItem[],
): HomeworkProgressSummary {
  const completedCount = homeworks.filter((h) => h.status === "completed").length;
  const activeCount = homeworks.filter(
    (h) => h.status === "active" || h.status === "overdue",
  ).length;
  const notStartedCount = homeworks.filter(
    (h) => h.status === "not_started",
  ).length;
  const averageAchievementRate =
    homeworks.length === 0
      ? 0
      : Math.round(
          homeworks.reduce((sum, h) => sum + h.progressRate, 0) /
            homeworks.length,
        );

  return {
    completedCount,
    activeCount,
    notStartedCount,
    averageAchievementRate,
  };
}

function buildDummyForClient(
  clientId: string,
  detail: ClientDetail | null,
): HomeworkFollowUpPageData {
  const listItem = DUMMY_CLIENT_MANAGEMENT_LIST.find((row) => row.id === clientId);
  const name = detail?.name ?? listItem?.name ?? "クライアント";
  const sleepScore = detail?.sleepScore ?? listItem?.sleepScore ?? 72;
  const instructorName = detail?.instructorName ?? DEFAULT_INSTRUCTOR;
  const avatarUrl = detail?.avatarUrl ?? listItem?.avatarUrl ?? null;
  const nextFollowUpDate = listItem?.nextFollowUpDate ?? "2026-07-25";

  const homeworks = defaultHomeworks(clientId, name);
  const followUps = defaultFollowUps(clientId);

  return {
    clientId,
    name,
    avatarUrl,
    sleepScore,
    instructorName,
    nextFollowUpDate,
    homeworks,
    followUps,
    summary: computeProgressSummary(homeworks),
  };
}

/**
 * Homework / Follow-up 画面用データを取得。
 * Supabase 未接続時・未取得時はダミーでフォールバック。
 */
export async function getHomeworkFollowUp(
  clientId: string | null | undefined,
): Promise<HomeworkFollowUpPageData> {
  const id =
    clientId?.trim() ||
    DUMMY_CLIENT_MANAGEMENT_LIST[0]?.id ||
    "client-demo-1";

  let detail: ClientDetail | null = null;
  try {
    detail = await getClientDetail(id);
  } catch (error) {
    console.error("[homework-followup] getClientDetail failed:", error);
  }

  // TODO: Supabase client_homeworks / follow_up_records から取得して合成する
  return buildDummyForClient(id, detail);
}

export function createHomeworkId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `hw-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createFollowUpId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `fu-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function draftToHomeworkItem(
  clientId: string,
  draft: NewHomeworkDraft,
): HomeworkItem {
  return {
    id: createHomeworkId(),
    clientId,
    title: draft.title.trim(),
    description: draft.description.trim(),
    startDate: draft.startDate,
    dueDate: draft.dueDate,
    frequency: draft.frequency,
    progressRate: 0,
    status: "not_started",
    instructorComment: "",
    priority: draft.priority,
    clientMessage: draft.clientMessage.trim(),
  };
}

export function draftToFollowUpRecord(
  clientId: string,
  draft: NewFollowUpDraft,
): FollowUpRecord {
  const scoreRaw = draft.sleepScore.trim();
  const parsed = scoreRaw === "" ? null : Number(scoreRaw);
  return {
    id: createFollowUpId(),
    clientId,
    conductedAt: draft.conductedAt,
    method: draft.method,
    sleepScore:
      parsed != null && Number.isFinite(parsed)
        ? Math.min(100, Math.max(0, Math.round(parsed)))
        : null,
    clientChange: draft.clientChange.trim(),
    instructorFinding: draft.instructorFinding.trim(),
    nextAction: draft.nextAction.trim(),
  };
}

export function formatHomeworkDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "未設定";
  return formatManagementDate(isoDate);
}

export { clientInitials };
