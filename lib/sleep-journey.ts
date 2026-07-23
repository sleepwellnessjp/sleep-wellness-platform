/**
 * Sleep Journey 画面のデータ契約。
 * Supabase の sleep_journeys と同期する。
 */

import {
  DUMMY_CLIENT_MANAGEMENT_LIST,
  clientInitials,
  formatManagementDate,
} from "@/lib/client-management";
import { getClientDetail, type ClientDetail } from "@/lib/client-detail";
import {
  DataAccessError,
  userMessageFromUnknown,
} from "@/lib/data-access-errors";
import {
  generateAiSleepAnalysisSync,
  toJourneyExcerpt,
  type AiSleepAnalysisInput,
} from "@/lib/ai-analysis";
import {
  listSleepJourneysForClient,
  saveSleepJourneyRecord,
  type SleepJourneyRecord,
} from "@/lib/repositories/sleep-journeys-repository";
import { getInstructorAuth, todayInTokyo } from "@/lib/repositories/v1-beta-auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { isMissingTableError } from "@/lib/supabase/errors";

export type JourneyMilestoneId =
  | "initial"
  | "week1"
  | "week2"
  | "week4"
  | "week8";

export type JourneyMilestone = {
  id: JourneyMilestoneId;
  label: string;
  /** ISO date YYYY-MM-DD */
  recordedAt: string | null;
  sleepScore: number | null;
  instructorComment: string;
  improvementPoints: string[];
  /** 0–100 */
  achievementRate: number;
  status: "completed" | "current" | "upcoming";
};

export type JourneyTrendPoint = {
  /** 表示ラベル（例: 初回 / 1週） */
  label: string;
  sleepScore: number;
  hrv: number;
  stress: number;
};

export type JourneyMission = {
  id: string;
  title: string;
  done: boolean;
};

export type JourneyNextGoal = {
  sleepScore: number;
  sleepHours: number;
  hrv: number;
  stress: number;
};

export type SleepJourneyPageData = {
  clientId: string;
  name: string;
  avatarUrl: string | null;
  sleepScore: number | null;
  /** ISO date — 改善開始日 */
  improvementStartedAt: string | null;
  instructorName: string;
  milestones: JourneyMilestone[];
  trend: JourneyTrendPoint[];
  missions: JourneyMission[];
  instructorMessage: string;
  nextGoal: JourneyNextGoal;
};

const DEFAULT_INSTRUCTOR = "認定講師";

const DEFAULT_MILESTONES: JourneyMilestone[] = [
  {
    id: "initial",
    label: "初回分析",
    recordedAt: "2026-05-28",
    sleepScore: 58,
    instructorComment:
      "入眠の遅れと夜間覚醒が主な課題です。まずは就寝時刻の固定から始めましょう。",
    improvementPoints: ["就寝時刻のばらつき", "夕食が遅い", "入眠前の画面時間"],
    achievementRate: 100,
    status: "completed",
  },
  {
    id: "week1",
    label: "1週間",
    recordedAt: "2026-06-04",
    sleepScore: 63,
    instructorComment:
      "就寝ルーティンが定着し始めています。呼吸法の継続がスコアに表れています。",
    improvementPoints: ["就寝前ルーティン", "カフェインの午後カット"],
    achievementRate: 72,
    status: "completed",
  },
  {
    id: "week2",
    label: "2週間",
    recordedAt: "2026-06-11",
    sleepScore: 68,
    instructorComment:
      "睡眠効率が改善。入浴タイミングを整えるとさらに深睡眠が増えそうです。",
    improvementPoints: ["入浴15分の定着", "室温の安定"],
    achievementRate: 78,
    status: "completed",
  },
  {
    id: "week4",
    label: "4週間",
    recordedAt: "2026-06-25",
    sleepScore: 72,
    instructorComment:
      "中間チェック。ストレス指標も穏やかです。このペースで8週目標へ。",
    improvementPoints: ["ストレスマネジメント", "週末の起床時刻"],
    achievementRate: 84,
    status: "current",
  },
  {
    id: "week8",
    label: "8週間",
    recordedAt: null,
    sleepScore: null,
    instructorComment: "次回レビューで最終評価を行います。",
    improvementPoints: ["目標スコア80", "HRVの安定", "深い眠りの維持"],
    achievementRate: 0,
    status: "upcoming",
  },
];

const DEFAULT_TREND: JourneyTrendPoint[] = [
  { label: "初回", sleepScore: 58, hrv: 28, stress: 62 },
  { label: "1週", sleepScore: 63, hrv: 32, stress: 55 },
  { label: "2週", sleepScore: 68, hrv: 36, stress: 48 },
  { label: "4週", sleepScore: 72, hrv: 41, stress: 42 },
  { label: "現在", sleepScore: 74, hrv: 44, stress: 38 },
];

const DEFAULT_MISSIONS: JourneyMission[] = [
  { id: "mission-bedtime", title: "23:30までに就寝", done: false },
  { id: "mission-dinner", title: "夕食は就寝3時間前まで", done: true },
  { id: "mission-bath", title: "入浴15分", done: false },
  { id: "mission-breath", title: "呼吸法5分", done: false },
];

const DEFAULT_NEXT_GOAL: JourneyNextGoal = {
  sleepScore: 80,
  sleepHours: 7.5,
  hrv: 48,
  stress: 35,
};

const DEFAULT_MESSAGE =
  "4週目までとても良いペースです。今夜は入浴と呼吸法をセットで行い、深い眠りを意識してみてください。小さな積み重ねが、8週後のスコアにつながります。";

/**
 * AI Sleep Analysis Engine から Journey 用の抜粋を生成。
 * Analysis Result / Report / Homework と同じエンジン出力を共有する。
 */
export function buildJourneyAiExcerpt(
  input: AiSleepAnalysisInput,
): ReturnType<typeof toJourneyExcerpt> {
  return toJourneyExcerpt(generateAiSleepAnalysisSync(input));
}

function buildDummyForClient(
  clientId: string,
  detail: ClientDetail | null,
): SleepJourneyPageData {
  const listItem = DUMMY_CLIENT_MANAGEMENT_LIST.find((row) => row.id === clientId);
  const name = detail?.name ?? listItem?.name ?? "クライアント";
  const sleepScore =
    detail?.sleepScore ?? listItem?.sleepScore ?? DEFAULT_TREND[DEFAULT_TREND.length - 1]?.sleepScore ?? null;
  const improvementStartedAt =
    detail?.assignedSince ?? listItem?.assignedDay ?? DEFAULT_MILESTONES[0]?.recordedAt ?? null;
  const instructorName = detail?.instructorName ?? DEFAULT_INSTRUCTOR;
  const avatarUrl = detail?.avatarUrl ?? listItem?.avatarUrl ?? null;

  const engine = generateAiSleepAnalysisSync({
    clientName: name,
    metrics: {
      sleepScore,
      sleepDuration: "6時間42分",
      sleepEfficiency: "87%",
      deepSleep: "1時間10分",
      remSleep: "1時間28分",
      awakenings: "2回",
      hrv: "44ms",
      stress: "40",
      restingHeartRate: "58bpm",
      circadianRhythm: "やや遅れ",
    },
    lifestyle: {
      dinner: "やや遅め",
      alcohol: "なし",
      caffeine: "コーヒー1杯（15:30）",
      exercise: "ウォーキング 30分",
      bathing: "湯船",
      preBedBehavior: "スマホ閲覧 25分",
    },
  });
  const excerpt = toJourneyExcerpt(engine);

  const milestones = DEFAULT_MILESTONES.map((m, index) => {
    if (index === 3 && sleepScore != null) {
      return {
        ...m,
        sleepScore,
        status: "current" as const,
        instructorComment: excerpt.instructorComment,
        improvementPoints: excerpt.improvementPoints,
      };
    }
    return m;
  });

  const trend = DEFAULT_TREND.map((point, index) => {
    if (index === DEFAULT_TREND.length - 1 && sleepScore != null) {
      return { ...point, sleepScore };
    }
    return point;
  });

  const missions: JourneyMission[] = excerpt.missionTitles.map((title, index) => ({
    id: `mission-ai-${index + 1}`,
    title,
    done: index === 1,
  }));

  return {
    clientId,
    name,
    avatarUrl,
    sleepScore,
    improvementStartedAt,
    instructorName,
    milestones,
    trend,
    missions: missions.length > 0 ? missions : DEFAULT_MISSIONS.map((m) => ({ ...m })),
    instructorMessage:
      detail?.notes?.trim() || excerpt.instructorMessage || DEFAULT_MESSAGE,
    nextGoal: {
      ...DEFAULT_NEXT_GOAL,
      sleepScore: Math.min(100, (sleepScore ?? 70) + 6),
    },
  };
}

function recordsToPageData(
  clientId: string,
  detail: ClientDetail,
  records: SleepJourneyRecord[],
): SleepJourneyPageData {
  const engine = generateAiSleepAnalysisSync({
    clientName: detail.name,
    metrics: {
      sleepScore: detail.sleepScore,
      sleepDuration: "—",
      sleepEfficiency: "—",
      deepSleep: "—",
      remSleep: "—",
      awakenings: "—",
      hrv: "—",
      stress: "—",
      restingHeartRate: "—",
      circadianRhythm: "—",
    },
    lifestyle: {
      dinner: "—",
      alcohol: "—",
      caffeine: "—",
      exercise: "—",
      bathing: "—",
      preBedBehavior: "—",
    },
  });
  const excerpt = toJourneyExcerpt(engine);

  if (records.length === 0) {
    return {
      clientId,
      name: detail.name,
      avatarUrl: detail.avatarUrl,
      sleepScore: detail.sleepScore,
      improvementStartedAt: detail.assignedSince,
      instructorName: detail.instructorName,
      milestones: [],
      trend: [],
      missions: excerpt.missionTitles.map((title, index) => ({
        id: `mission-ai-${index + 1}`,
        title,
        done: false,
      })),
      instructorMessage:
        detail.notes?.trim() || excerpt.instructorMessage || DEFAULT_MESSAGE,
      nextGoal: {
        ...DEFAULT_NEXT_GOAL,
        sleepScore: Math.min(100, (detail.sleepScore ?? 70) + 6),
      },
    };
  }

  const milestones: JourneyMilestone[] = records.map((record, index) => {
    const isLast = index === records.length - 1;
    return {
      id: (["initial", "week1", "week2", "week4", "week8"] as JourneyMilestoneId[])[
        Math.min(index, 4)
      ]!,
      label:
        index === 0
          ? "初回"
          : index === records.length - 1
            ? "今回"
            : `${index}回目`,
      recordedAt: record.recordedAt,
      sleepScore: record.sleepScore,
      instructorComment: record.instructorComment || excerpt.instructorComment,
      improvementPoints: excerpt.improvementPoints,
      achievementRate: record.achievementRate ?? 0,
      status: isLast ? "current" : "completed",
    };
  });

  const trend: JourneyTrendPoint[] = records.map((record, index) => ({
    label: index === 0 ? "初回" : `${index}`,
    sleepScore: record.sleepScore ?? 0,
    hrv: record.hrv ?? 0,
    stress: record.stress ?? 0,
  }));

  const latest = records[records.length - 1]!;
  const nextGoal = {
    sleepScore:
      typeof latest.nextGoal.sleepScore === "number"
        ? latest.nextGoal.sleepScore
        : Math.min(100, (latest.sleepScore ?? 70) + 6),
    sleepHours:
      typeof latest.nextGoal.sleepHours === "number"
        ? latest.nextGoal.sleepHours
        : DEFAULT_NEXT_GOAL.sleepHours,
    hrv:
      typeof latest.nextGoal.hrv === "number"
        ? latest.nextGoal.hrv
        : DEFAULT_NEXT_GOAL.hrv,
    stress:
      typeof latest.nextGoal.stress === "number"
        ? latest.nextGoal.stress
        : DEFAULT_NEXT_GOAL.stress,
  };

  return {
    clientId,
    name: detail.name,
    avatarUrl: detail.avatarUrl,
    sleepScore: latest.sleepScore ?? detail.sleepScore,
    improvementStartedAt: records[0]?.recordedAt ?? detail.assignedSince,
    instructorName: detail.instructorName,
    milestones,
    trend,
    missions: excerpt.missionTitles.map((title, index) => ({
      id: `mission-ai-${index + 1}`,
      title,
      done: false,
    })),
    instructorMessage:
      latest.instructorComment ||
      detail.notes?.trim() ||
      excerpt.instructorMessage ||
      DEFAULT_MESSAGE,
    nextGoal,
  };
}

/**
 * Sleep Journey 画面用データを取得。
 * Supabase 接続時は sleep_journeys から読み込む。
 */
export async function getSleepJourney(
  clientId: string | null | undefined,
): Promise<SleepJourneyPageData> {
  const id =
    clientId?.trim() ||
    DUMMY_CLIENT_MANAGEMENT_LIST[0]?.id ||
    "client-demo-1";

  let detail: ClientDetail | null = null;
  try {
    detail = await getClientDetail(id);
  } catch (error) {
    console.error("[sleep-journey] getClientDetail failed:", error);
  }

  if (!isSupabaseConfigured()) {
    return buildDummyForClient(id, detail);
  }

  const auth = await getInstructorAuth();
  if (!auth) {
    throw new DataAccessError(
      "unauthenticated",
      "ログインが必要です。認定講師アカウントでサインインしてください。",
    );
  }

  if (!detail) {
    throw new DataAccessError(
      "not_found",
      "クライアントが見つかりません。一覧から再度選択してください。",
    );
  }

  try {
    const records = await listSleepJourneysForClient(id);
    return recordsToPageData(id, detail, records);
  } catch (error) {
    if (
      isMissingTableError(error) ||
      (error instanceof DataAccessError &&
        error.message.includes("テーブル"))
    ) {
      console.warn("[sleep-journey] sleep_journeys table missing");
      return recordsToPageData(id, detail, []);
    }
    throw error;
  }
}

export async function saveTodayJourneyRecord(params: {
  clientId: string;
  sleepScore: number | null;
  instructorComment: string;
  nextGoal: JourneyNextGoal;
  missions: JourneyMission[];
}): Promise<void> {
  const doneCount = params.missions.filter((m) => m.done).length;
  const achievementRate =
    params.missions.length === 0
      ? 0
      : Math.round((doneCount / params.missions.length) * 100);

  try {
    await saveSleepJourneyRecord({
      clientId: params.clientId,
      recordedAt: todayInTokyo(),
      sleepScore: params.sleepScore,
      achievementRate,
      instructorComment: params.instructorComment,
      nextGoal: {
        sleepScore: params.nextGoal.sleepScore,
        sleepHours: params.nextGoal.sleepHours,
        hrv: params.nextGoal.hrv,
        stress: params.nextGoal.stress,
        missions: params.missions,
      },
    });
  } catch (error) {
    throw new DataAccessError("save_failed", userMessageFromUnknown(error));
  }
}

export function formatJourneyDate(isoDate: string | null | undefined): string {
  if (!isoDate) return "未設定";
  return formatManagementDate(isoDate);
}

export { clientInitials };
