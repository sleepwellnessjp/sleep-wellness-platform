import {
  computeHomeworkAchievement,
  type AnalysisResult,
} from "@/lib/analysis-session";

/** YYYY-MM-DD（ローカル日付） */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dayIndex(dateKey: string, modulo: number): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return modulo > 0 ? hash % modulo : 0;
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const t0 = Date.UTC(ay!, am! - 1, ad!);
  const t1 = Date.UTC(by!, bm! - 1, bd!);
  return Math.round((t1 - t0) / 86_400_000);
}

// ─── ① 今日の睡眠ウェルネスアドバイス ───────────────────────────

const FALLBACK_ADVICE: string[] = [
  "今日は睡眠効率を上げるため、夕食を20時までに済ませ、22:30以降はスマホを控えましょう。",
  "朝起きたらカーテンを開け、5分だけ朝日を浴びましょう。体内時計のリセットに効果的です。",
  "就寝90分前の入浴で深部体温を下げ、入眠をスムーズに整えましょう。",
  "カフェインは午後2時以降を控え、夕方以降はハーブティーや白湯に切り替えましょう。",
  "寝室は少し涼しめ（約18〜20℃）に。深い睡眠の質が上がりやすくなります。",
  "眠気を感じたら無理せずベッドへ。眠気の波を逃さないことが入眠の近道です。",
  "今日はストレッチや軽い歩行で体をほぐし、夜の交感神経の過緊張を和らげましょう。",
];

/**
 * 分析結果があれば todaysRecommendations / improvements から、
 * なければ日付ベースのフォールバックを返す（1日1回で固定）。
 */
export function pickDailyAdvice(
  result: AnalysisResult | null | undefined,
  dateKey = localDateKey(),
): string {
  const fromToday = (result?.todaysRecommendations ?? [])
    .map((item) => item.trim())
    .filter(Boolean);
  if (fromToday.length > 0) {
    return fromToday[dayIndex(dateKey, fromToday.length)]!;
  }

  const fromGoals = (result?.recommendationsUntilNext ?? [])
    .map((item) => item.text?.trim() ?? "")
    .filter(Boolean);
  if (fromGoals.length > 0) {
    return fromGoals[dayIndex(dateKey, fromGoals.length)]!;
  }

  return FALLBACK_ADVICE[dayIndex(dateKey, FALLBACK_ADVICE.length)]!;
}

// ─── ② 今日のメラトニンヨガ™ ───────────────────────────────────

export type DailyVideoCard = {
  id: string;
  title: string;
  subtitle: string;
  durationLabel: string;
  durationMinutes: number;
  thumbnailSrc: string;
  /** ダミー再生URL（将来差し替え） */
  videoUrl: string | null;
};

const MELATONIN_YOGA_LIBRARY: DailyVideoCard[] = [
  {
    id: "my-01",
    title: "入眠のためのメラトニンヨガ™",
    subtitle: "副交感神経を整え、深い休息へ",
    durationLabel: "8分",
    durationMinutes: 8,
    thumbnailSrc: "/melatonin-yoga.jpg",
    videoUrl: null,
  },
  {
    id: "my-02",
    title: "夜のゆるめフロー",
    subtitle: "肩・首・背中をほぐして眠気を迎える",
    durationLabel: "10分",
    durationMinutes: 10,
    thumbnailSrc: "/melatonin-yoga.jpg",
    videoUrl: null,
  },
  {
    id: "my-03",
    title: "ベッドサイド・リラックス",
    subtitle: "寝る直前にできるやさしい動き",
    durationLabel: "5分",
    durationMinutes: 5,
    thumbnailSrc: "/melatonin-yoga.jpg",
    videoUrl: null,
  },
  {
    id: "my-04",
    title: "深呼吸とゆるめのシークエンス",
    subtitle: "交感神経の過緊張をほどく",
    durationLabel: "7分",
    durationMinutes: 7,
    thumbnailSrc: "/melatonin-yoga.jpg",
    videoUrl: null,
  },
];

export function pickDailyMelatoninYoga(
  dateKey = localDateKey(),
): DailyVideoCard {
  return MELATONIN_YOGA_LIBRARY[
    dayIndex(dateKey, MELATONIN_YOGA_LIBRARY.length)
  ]!;
}

// ─── ③ 今日の呼吸法 ───────────────────────────────────────────

export type DailyBreathingCard = {
  id: string;
  title: string;
  method: string;
  description: string;
  durationLabel: string;
  thumbnailSrc: string;
  videoUrl: string | null;
};

const BREATHING_LIBRARY: DailyBreathingCard[] = [
  {
    id: "br-36",
    title: "3:6呼吸",
    method: "3秒吸って、6秒吐く",
    description: "吐く息を長くし、副交感神経を優位にします。",
    durationLabel: "5分",
    thumbnailSrc: "/retreat.jpg",
    videoUrl: null,
  },
  {
    id: "br-478",
    title: "4-7-8呼吸",
    method: "4秒吸う → 7秒止める → 8秒吐く",
    description: "入眠前の定番。心拍を落ち着かせます。",
    durationLabel: "5分",
    thumbnailSrc: "/retreat.jpg",
    videoUrl: null,
  },
  {
    id: "br-box",
    title: "ボックス呼吸",
    method: "4秒×吸・止・吐・止",
    description: "緊張が高まったときに使えるリセット呼吸です。",
    durationLabel: "6分",
    thumbnailSrc: "/yogaworks.jpg",
    videoUrl: null,
  },
  {
    id: "br-alt",
    title: "片鼻呼吸",
    method: "左右の鼻で交互に呼吸",
    description: "左右のバランスを整え、心を静めます。",
    durationLabel: "5分",
    thumbnailSrc: "/yogaworks.jpg",
    videoUrl: null,
  },
];

export function pickDailyBreathing(
  dateKey = localDateKey(),
): DailyBreathingCard {
  return BREATHING_LIBRARY[dayIndex(dateKey, BREATHING_LIBRARY.length)]!;
}

// ─── ④ 今日の豆知識 ───────────────────────────────────────────

export type DailyTriviaCard = {
  id: string;
  category: string;
  title: string;
  body: string;
};

const TRIVIA_LIBRARY: DailyTriviaCard[] = [
  {
    id: "tr-science",
    category: "睡眠科学",
    title: "睡眠サイクルは約90分",
    body: "ノンレムとレムを繰り返す約90分のサイクルが、夜の質を左右します。途中で起きても次のサイクルでリカバリーできます。",
  },
  {
    id: "tr-ma",
    category: "日本文化の「間」",
    title: "余白が回復をつくる",
    body: "日本の「間」は、忙しさのあいだに置く静けさ。就寝前の余白時間は、脳のスイッチを夜モードへ切り替える儀式になります。",
  },
  {
    id: "tr-melatonin",
    category: "メラトニン",
    title: "暗さで分泌が高まる",
    body: "メラトニンは暗い環境で分泌が増えます。就寝1時間前から照明を落とし、ブルーライトを控えると自然な眠気が育ちます。",
  },
  {
    id: "tr-sun",
    category: "朝日",
    title: "朝の光が夜を決める",
    body: "起床後すぐに朝日を浴びると体内時計がリセットされ、夜のメラトニン分泌タイミングが整いやすくなります。",
  },
  {
    id: "tr-ans",
    category: "自律神経",
    title: "交感と副交感のリズム",
    body: "日中は交感神経、夜は副交感神経が主役。夕方以降の激しい刺激を減らし、呼吸と体温で夜モードへ誘導しましょう。",
  },
  {
    id: "tr-temp",
    category: "睡眠科学",
    title: "深部体温の下りが眠気",
    body: "入浴後、深部体温が下がり始めるタイミングで眠気が強まります。就寝90分前の入浴が理にかなっている理由です。",
  },
];

export function pickDailyTrivia(dateKey = localDateKey()): DailyTriviaCard {
  return TRIVIA_LIBRARY[dayIndex(dateKey, TRIVIA_LIBRARY.length)]!;
}

// ─── ⑤ 継続日数 / 宿題達成率 ─────────────────────────────────

const STREAK_STORAGE_PREFIX = "swij-client-streak:";

type StreakStorage = {
  lastVisitDate: string;
  streakDays: number;
};

function streakStorageKey(clientId: string): string {
  return `${STREAK_STORAGE_PREFIX}${clientId}`;
}

/**
 * マイページ訪問で連続日数を更新（同日は据え置き、翌日なら +1、それ以外は 1 にリセット）。
 */
export function touchVisitStreak(clientId: string, today = localDateKey()): number {
  if (typeof window === "undefined" || !clientId) return 1;

  let prev: StreakStorage | null = null;
  try {
    const raw = window.localStorage.getItem(streakStorageKey(clientId));
    if (raw) {
      const parsed = JSON.parse(raw) as StreakStorage;
      if (
        typeof parsed?.lastVisitDate === "string" &&
        typeof parsed?.streakDays === "number"
      ) {
        prev = parsed;
      }
    }
  } catch {
    prev = null;
  }

  let streakDays = 1;
  if (prev) {
    if (prev.lastVisitDate === today) {
      streakDays = Math.max(1, prev.streakDays);
    } else if (daysBetween(prev.lastVisitDate, today) === 1) {
      streakDays = Math.max(1, prev.streakDays) + 1;
    } else {
      streakDays = 1;
    }
  }

  try {
    window.localStorage.setItem(
      streakStorageKey(clientId),
      JSON.stringify({ lastVisitDate: today, streakDays } satisfies StreakStorage),
    );
  } catch {
    // ignore quota / private mode
  }

  return streakDays;
}

export function homeworkRateOf(
  result: AnalysisResult | null | undefined,
): number {
  if (!result) return 0;
  if (
    result.homeworkAchievement &&
    typeof result.homeworkAchievement.rate === "number"
  ) {
    return Math.max(
      0,
      Math.min(100, Math.round(result.homeworkAchievement.rate)),
    );
  }
  return computeHomeworkAchievement(result.recommendationsUntilNext ?? []).rate;
}
