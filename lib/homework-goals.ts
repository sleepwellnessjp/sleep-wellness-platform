import {
  normalizeRecommendationsUntilNext,
  type AnalysisResult,
  type NextActionGoal,
} from "@/lib/analysis-session";

function createGoalId(): string {
  try {
    return `goal-${crypto.randomUUID()}`;
  } catch {
    return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}

function similarHomeworkText(a: string, b: string): boolean {
  const compact = (value: string) => value.replace(/\s+/g, "").slice(0, 12);
  const left = compact(a);
  const right = compact(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

/** 今日のアクション等を宿題リストへ統合する種（重複除外） */
export function buildHomeworkSeedActions(options: {
  todaysActions: string[];
  todaysRecommendations: string[];
  melatoninPhase: string;
}): string[] {
  const seeds: string[] = [];
  const push = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (
      seeds.some(
        (item) =>
          item.includes(trimmed.slice(0, 10)) ||
          trimmed.includes(item.slice(0, 10)),
      )
    ) {
      return;
    }
    seeds.push(trimmed);
  };
  for (const action of options.todaysActions) push(action);
  for (const action of options.todaysRecommendations) push(action);
  if (options.melatoninPhase.trim()) {
    push(`就寝前にメラトニンヨガ™ ${options.melatoninPhase.trim()} を実施する`);
  }
  return seeds;
}

/**
 * 分析結果ページの宿題リストと同じ結合ルール。
 * 既存の保存済み宿題を優先しつつ、種アクションを先頭に統合する。
 */
export function mergeHomeworkDisplayGoals(
  existing: NextActionGoal[] | unknown,
  seeds: string[] | undefined,
): NextActionGoal[] {
  const current = normalizeRecommendationsUntilNext(existing);
  if (!seeds?.length) return current;
  const usedIds = new Set<string>();
  const fromSeeds: NextActionGoal[] = [];
  for (const seed of seeds) {
    const text = seed.trim();
    if (!text) continue;
    if (fromSeeds.some((item) => similarHomeworkText(item.text, text))) continue;
    const matched = current.find(
      (item) => !usedIds.has(item.id) && similarHomeworkText(item.text, text),
    );
    if (matched) {
      usedIds.add(matched.id);
      fromSeeds.push(matched);
    } else {
      fromSeeds.push({ id: createGoalId(), text, checked: false });
    }
  }
  const rest = current.filter((item) => !usedIds.has(item.id));
  return [...fromSeeds, ...rest].slice(0, 6);
}

export function homeworkGoalsFromResult(
  result: AnalysisResult,
  seedActions: string[],
): NextActionGoal[] {
  return mergeHomeworkDisplayGoals(
    result.recommendationsUntilNext,
    seedActions,
  );
}
