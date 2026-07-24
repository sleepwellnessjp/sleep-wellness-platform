import type {
  AchievementCode,
  AchievementDefinition,
  JourneyStageCode,
  JourneyStageDefinition,
  JourneyStageId,
} from "./types";

export const JOURNEY_STAGE_IDS = [
  "stage_1",
  "stage_2",
  "stage_3",
  "stage_4",
  "stage_5",
] as const satisfies readonly JourneyStageId[];

export const JOURNEY_STAGE_DEFINITIONS: readonly JourneyStageDefinition[] = [
  {
    id: "stage_1",
    stageNumber: 1,
    code: "sleep_awareness",
    title: "Sleep Awareness",
    subtitle: "自分の睡眠を知る",
    description:
      "初回分析を通じて、いまの睡眠の状態を客観的に把握するステージです。",
    sortOrder: 1,
  },
  {
    id: "stage_2",
    stageNumber: 2,
    code: "sleep_balance",
    title: "Sleep Balance",
    subtitle: "生活リズムを整える",
    description:
      "就寝・起床時刻や日常習慣を整え、体内時計の土台をつくるステージです。",
    sortOrder: 2,
  },
  {
    id: "stage_3",
    stageNumber: 3,
    code: "sleep_recovery",
    title: "Sleep Recovery",
    subtitle: "睡眠効率を高める",
    description:
      "深い休息と回復の質を高め、睡眠効率を安定させるステージです。",
    sortOrder: 3,
  },
  {
    id: "stage_4",
    stageNumber: 4,
    code: "sleep_performance",
    title: "Sleep Performance",
    subtitle: "日中のパフォーマンス向上",
    description:
      "睡眠の質が日中の集中・気分・回復感につながるステージです。",
    sortOrder: 4,
  },
  {
    id: "stage_5",
    stageNumber: 5,
    code: "sleep_wellness",
    title: "Sleep Wellness",
    subtitle: "睡眠が人生の土台になっている状態",
    description:
      "睡眠が日々のウェルネスの土台として定着した、Journey の到達点です。",
    sortOrder: 5,
  },
] as const;

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] = [
  {
    id: "ach_first_analysis",
    code: "first_analysis",
    title: "初回分析",
    description: "初めての睡眠分析を完了しました",
    category: "analysis",
    iconKey: "spark",
    sortOrder: 1,
  },
  {
    id: "ach_streak_7",
    code: "streak_7",
    title: "7日継続",
    description: "宿題や実践を7日連続で続けました",
    category: "streak",
    iconKey: "flame",
    sortOrder: 2,
  },
  {
    id: "ach_streak_30",
    code: "streak_30",
    title: "30日継続",
    description: "宿題や実践を30日連続で続けました",
    category: "streak",
    iconKey: "flame",
    sortOrder: 3,
  },
  {
    id: "ach_efficiency_90",
    code: "efficiency_90",
    title: "睡眠効率90%以上",
    description: "睡眠効率が90%以上に達しました",
    category: "metric",
    iconKey: "moon",
    sortOrder: 4,
  },
  {
    id: "ach_hrv_improved",
    code: "hrv_improved",
    title: "HRV改善",
    description: "HRVが初回より改善しました",
    category: "metric",
    iconKey: "pulse",
    sortOrder: 5,
  },
  {
    id: "ach_stress_improved",
    code: "stress_improved",
    title: "ストレス改善",
    description: "ストレス指標が初回より改善しました",
    category: "metric",
    iconKey: "leaf",
    sortOrder: 6,
  },
  {
    id: "ach_melatonin_yoga",
    code: "melatonin_yoga_streak",
    title: "メラトニンヨガ™継続",
    description: "メラトニンヨガ™を継続して実践しています",
    category: "practice",
    iconKey: "lotus",
    sortOrder: 7,
  },
] as const;

export const ACHIEVEMENT_CODES = ACHIEVEMENT_DEFINITIONS.map(
  (item) => item.code,
) as readonly AchievementCode[];

export function isJourneyStageId(value: string): value is JourneyStageId {
  return (JOURNEY_STAGE_IDS as readonly string[]).includes(value);
}

export function isJourneyStageCode(value: string): value is JourneyStageCode {
  return JOURNEY_STAGE_DEFINITIONS.some((stage) => stage.code === value);
}

export function stageDefinitionById(
  id: JourneyStageId,
): JourneyStageDefinition {
  const found = JOURNEY_STAGE_DEFINITIONS.find((stage) => stage.id === id);
  return found ?? JOURNEY_STAGE_DEFINITIONS[0];
}

export function stageDefinitionByNumber(
  stageNumber: number,
): JourneyStageDefinition {
  const found = JOURNEY_STAGE_DEFINITIONS.find(
    (stage) => stage.stageNumber === stageNumber,
  );
  return found ?? JOURNEY_STAGE_DEFINITIONS[0];
}

export function achievementByCode(
  code: AchievementCode,
): AchievementDefinition {
  const found = ACHIEVEMENT_DEFINITIONS.find((item) => item.code === code);
  return found ?? ACHIEVEMENT_DEFINITIONS[0];
}

export function achievementById(id: string): AchievementDefinition | null {
  return ACHIEVEMENT_DEFINITIONS.find((item) => item.id === id) ?? null;
}
