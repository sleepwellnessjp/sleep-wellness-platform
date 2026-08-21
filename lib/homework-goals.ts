import {
  normalizeRecommendationsUntilNext,
  type AnalysisResult,
  type NextActionGoal,
} from "@/lib/analysis-session";
import { REPORT_SECTIONS } from "@/lib/report-sections";

/** ⑤ priorityImprovements から宿題文を作るときの最小形 */
export type PriorityHomeworkSource = {
  tier: "highest" | "next" | "optional";
  title: string;
  action: string;
};

export type HomeworkSeedSource = "priority" | "today" | "ai";

export type HomeworkSeed = {
  text: string;
  source: HomeworkSeedSource;
};

/** 内容重複判定用カテゴリ（同カテゴリは⑤由来を優先） */
export type HomeworkCategory =
  | "bedtime"
  | "wake_light"
  | "alcohol"
  | "bathing"
  | "caffeine"
  | "breathing"
  | "bedroom"
  | "exercise"
  | "other";

const TIER_ORDER = ["highest", "next", "optional"] as const;

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

/**
 * クライアント向け宿題・アクション文言の現実化。
 * AI が「朝8時以降のカフェイン」等を出した既存保存データも表示時に直す。
 */
export function sanitizeHomeworkClientText(text: string): string {
  return text
    .replace(/朝\s*\d{1,2}\s*時\s*以降のカフェイン/g, "14時以降のカフェイン")
    .replace(/午前中からのカフェイン/g, "14時以降のカフェイン")
    .replace(/朝からカフェインを控える/g, "14時以降のカフェインを控える");
}

/** キーワードベースの重複カテゴリ */
export function detectHomeworkCategory(text: string): HomeworkCategory {
  const t = text.replace(/\s+/g, "");
  if (/飲酒|アルコール|お酒|缶チューハイ|ビール|ワイン/.test(t)) {
    return "alcohol";
  }
  if (/カフェイン|コーヒー|紅茶|緑茶|エナジードリンク/.test(t)) {
    return "caffeine";
  }
  if (/入浴|湯船|シャワー|半身浴/.test(t)) return "bathing";
  if (/鼻呼吸|側臥|側臥位|姿勢を試|呼吸が安定/.test(t)) return "breathing";
  if (/寝室|温度と湿度|湿度|騒音|暗くする|照明を落/.test(t)) {
    return "bedroom";
  }
  if (/運動|ヨガ|ストレッチ|散歩|有酸素|ピラティス/.test(t)) {
    return "exercise";
  }
  if (
    /光浴|日光|朝日|カーテンを開け|起床時刻|起床時間|起床を固定|朝\d{1,2}\s*時までに日光|朝の光/.test(
      t,
    )
  ) {
    return "wake_light";
  }
  if (
    /就寝|早めに床|前倒し|睡眠機会|睡眠時間を|早く床|就寝時間|今夜は.*早/.test(t)
  ) {
    return "bedtime";
  }
  return "other";
}

/**
 * ⑤の説明調 action をチェックリスト用の行動文（終止形）に正規化する。
 * AI 変換は使わない（⑤と⑦のズレ防止）。
 */
export function normalizePriorityActionToChecklist(raw: string): string {
  let text = raw.trim().replace(/[。．！？]+$/u, "");
  if (!text) return "";

  // 「〜すると／すれば、結果説明」→ 行為部分だけ残す
  text = text.replace(
    /と(?:、)?(?:回復の土台が)?整いやすくなります$/u,
    "",
  );
  text = text.replace(/と(?:、)?[^、。]{0,40}(?:やすくなります|なります)$/u, "");
  text = text.replace(/ば(?:、)?[^、。]{0,40}(?:やすくなります|なります)$/u, "");

  // 文末の評価・期待フレーズを除去（長いものから）
  const trailingRemovals = [
    /することが有効です$/u,
    /することが期待できます$/u,
    /することが望ましいです$/u,
    /することが大切です$/u,
    /することが重要です$/u,
    /ことが有効です$/u,
    /ことが期待できます$/u,
    /ことが望ましいです$/u,
    /ことが大切です$/u,
    /ことが重要です$/u,
    /と良いでしょう$/u,
    /とよいでしょう$/u,
    /と良いです$/u,
    /とよいです$/u,
    /が有効です$/u,
    /が期待できます$/u,
    /が望ましいです$/u,
    /が大切です$/u,
    /が重要です$/u,
    /でしょう$/u,
  ];
  for (const pattern of trailingRemovals) {
    text = text.replace(pattern, "");
  }

  text = text.replace(/少なくとも/g, "");
  text = text.replace(/\s+/g, " ").trim();

  // 「起床時刻の固定と朝の光浴でリズムを整える」→「起床時刻を固定し、朝の光浴を行う」
  text = text.replace(
    /(.+?)の固定と(.+?)(?:でリズムを整える|で整える)$/u,
    "$1を固定し、$2を行う",
  );
  text = text.replace(/(.+?)の固定と(.+?)光浴$/u, "$1を固定し、$2光浴を行う");
  text = text.replace(/(.+?)の固定$/u, "$1を固定する");

  // 「〜でリズムを整える」が残っていれば行動に寄せる
  text = text.replace(/光浴でリズムを整える$/u, "光浴を行う");
  text = text.replace(/朝の光でリズムを整える$/u, "朝の光浴を行う");

  text = text.replace(/[。．]+$/u, "").trim();

  // 終止形へ寄せる（説明調の残り）
  if (/してください$/u.test(text)) {
    text = text.replace(/してください$/u, "する");
  }

  // 名詞止め・連用止めで終わっている場合の最低限の終止化
  if (text && !/(する|試す|行う|控える|終える|そろえる|取り入れる|整える|浴びる|確保する|固定する|早める|進める|置く|見る|入る)$/u.test(text)) {
    if (/を確保$/u.test(text)) text = `${text}する`;
    else if (/を試$/u.test(text)) text = `${text}す`;
    else if (/に取り組む$/u.test(text)) {
      /* keep */
    } else if (/を行う$/u.test(text) || /を固定し、/.test(text)) {
      /* keep */
    }
  }

  return sanitizeHomeworkClientText(text);
}

/**
 * 正規化後も説明調・名詞止めのまま残った場合に true。
 * （ルールで変換しきれないケースの検知用）
 */
export function isUnresolvedChecklistStyle(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (/(有効です|期待できます|望ましいです|でしょう|やすくなります|なります)$/u.test(t)) {
    return true;
  }
  if (/の固定と/.test(t) && /整える$/.test(t)) return true;
  return false;
}

function pushUniqueSeed(seeds: string[], text: string): void {
  const trimmed = sanitizeHomeworkClientText(text.trim());
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
}

function pushUniqueTagged(
  seeds: HomeworkSeed[],
  text: string,
  source: HomeworkSeedSource,
): void {
  const trimmed = sanitizeHomeworkClientText(text.trim());
  if (!trimmed) return;
  if (
    seeds.some(
      (item) =>
        similarHomeworkText(item.text, trimmed) ||
        item.text.includes(trimmed.slice(0, 10)) ||
        trimmed.includes(item.text.slice(0, 10)),
    )
  ) {
    return;
  }
  seeds.push({ text: trimmed, source });
}

/** action が空のとき title から行動文を作る（⑤ AI 分割で action が空になり得る） */
export function homeworkTextFromPriorityItem(item: {
  title: string;
  action: string;
}): string {
  const action = item.action.trim();
  if (action) {
    return normalizePriorityActionToChecklist(action);
  }

  const title = item.title.trim().replace(/[。．]+$/u, "");
  if (!title) return "";

  if (
    /(する|してください|試す|控える|終える|そろえる|取り入れる|整える|確認する)$/u.test(
      title,
    )
  ) {
    return normalizePriorityActionToChecklist(title);
  }

  return normalizePriorityActionToChecklist(`${title}に取り組む`);
}

/**
 * ⑤改善優先順位から宿題・今日やることの先頭候補を決定的に生成する。
 * tier 順（highest → next → optional）を厳守。最大3件。
 */
export function buildHomeworkFromPriorities(
  priorityImprovements: PriorityHomeworkSource[] | null | undefined,
): string[] {
  if (!priorityImprovements?.length) return [];

  const seeds: string[] = [];
  for (const tier of TIER_ORDER) {
    const item = priorityImprovements.find((entry) => entry.tier === tier);
    if (!item) continue;
    const text = homeworkTextFromPriorityItem(item);
    if (!text) continue;
    pushUniqueSeed(seeds, text);
  }
  return seeds.slice(0, 3);
}

/** 今日のアクション等を宿題リストへ統合する種（重複除外） */
export function buildHomeworkSeedActions(options: {
  todaysActions: string[];
  todaysRecommendations: string[];
  melatoninPhase: string;
}): string[] {
  const seeds: string[] = [];
  for (const action of options.todaysActions) pushUniqueSeed(seeds, action);
  for (const action of options.todaysRecommendations) {
    pushUniqueSeed(seeds, action);
  }
  // ⑥非表示時は説明のない Phase 用語を出さない。フラグ復帰で復活。
  if (REPORT_SECTIONS.melatoninYoga && options.melatoninPhase.trim()) {
    pushUniqueSeed(
      seeds,
      `就寝前にメラトニンヨガ™ ${options.melatoninPhase.trim()} を実施する`,
    );
  }
  return seeds;
}

/**
 * ⑦表示用シード（ソース付き）。
 * ⑤があるとき: ⑤由来 → 今日 →（merge 先で）AI宿題。
 * ⑤が空のとき: 従来どおり 今日（＋⑥フラグ時 Phase）→ AI宿題。
 */
export function buildHomeworkDisplaySeedActions(options: {
  priorityImprovements: PriorityHomeworkSource[] | null | undefined;
  todaysActions: string[];
  todaysRecommendations: string[];
  melatoninPhase: string;
}): HomeworkSeed[] {
  const fromPriority = buildHomeworkFromPriorities(options.priorityImprovements);
  const fromToday = buildHomeworkSeedActions({
    todaysActions: options.todaysActions,
    todaysRecommendations: options.todaysRecommendations,
    melatoninPhase: options.melatoninPhase,
  });

  if (fromPriority.length === 0) {
    const seeds: HomeworkSeed[] = [];
    for (const text of fromToday) pushUniqueTagged(seeds, text, "today");
    return seeds;
  }

  const seeds: HomeworkSeed[] = [];
  for (const text of fromPriority) pushUniqueTagged(seeds, text, "priority");
  for (const text of fromToday) pushUniqueTagged(seeds, text, "today");
  return seeds;
}

function normalizeSeedList(
  seeds: Array<string | HomeworkSeed> | undefined,
): HomeworkSeed[] {
  if (!seeds?.length) return [];
  return seeds.map((entry) =>
    typeof entry === "string"
      ? { text: sanitizeHomeworkClientText(entry), source: "today" as const }
      : {
          text: sanitizeHomeworkClientText(entry.text),
          source: entry.source,
        },
  );
}

/**
 * 分析結果ページの宿題リスト結合。
 * 順序: ⑤シード → 今日シード → AI宿題。
 * 同カテゴリ重複は⑤を残し、今日/AI側を落とす。上限6。不足時は AI 残りで補充。
 */
export function mergeHomeworkDisplayGoals(
  existing: NextActionGoal[] | unknown,
  seeds: Array<string | HomeworkSeed> | undefined,
): NextActionGoal[] {
  const current = normalizeRecommendationsUntilNext(existing).map((item) => ({
    ...item,
    text: sanitizeHomeworkClientText(item.text),
  }));
  const seedList = normalizeSeedList(seeds);

  const usedIds = new Set<string>();
  const seenCategories = new Set<Exclude<HomeworkCategory, "other">>();
  const out: NextActionGoal[] = [];
  let droppedByCategory = 0;
  let filledFromAi = 0;

  const conflictsExisting = (text: string) =>
    out.some((item) => similarHomeworkText(item.text, text));

  const categoryBlocked = (text: string, source: HomeworkSeedSource) => {
    const category = detectHomeworkCategory(text);
    if (category === "other") return false;
    if (!seenCategories.has(category)) return false;
    // ⑤由来は先に入る想定。後続の今日/AIのみ落とす
    return source !== "priority";
  };

  const tryPush = (
    goal: NextActionGoal,
    source: HomeworkSeedSource,
  ): boolean => {
    if (out.length >= 6) return false;
    if (conflictsExisting(goal.text)) return false;
    if (categoryBlocked(goal.text, source)) {
      droppedByCategory += 1;
      return false;
    }
    const category = detectHomeworkCategory(goal.text);
    if (category !== "other") seenCategories.add(category);
    out.push(goal);
    usedIds.add(goal.id);
    if (source === "ai") filledFromAi += 1;
    return true;
  };

  // 1) シード（⑤ → 今日の順で渡ってくる）
  for (const seed of seedList) {
    const text = seed.text.trim();
    if (!text) continue;
    const matched = current.find(
      (item) => !usedIds.has(item.id) && similarHomeworkText(item.text, text),
    );
    if (matched) {
      tryPush(matched, seed.source);
    } else {
      tryPush({ id: createGoalId(), text, checked: false }, seed.source);
    }
  }

  // 2) AI宿題の残り（カテゴリ重複はスキップ）
  const skippedAi: NextActionGoal[] = [];
  for (const item of current) {
    if (usedIds.has(item.id)) continue;
    if (out.length >= 6) break;
    const before = out.length;
    tryPush(item, "ai");
    if (out.length === before) {
      skippedAi.push(item);
    }
  }

  // 3) 6件未満なら、カテゴリ重複で落とした AI のうち other 扱いへはできないが、
  //    まだ未使用でカテゴリが空いているものだけ再走査（通常は 2 で尽きる）。
  //    それでも不足なら「other」以外で未使用カテゴリの AI を追加済みなので、
  //    最後の補充はカテゴリ未設定相当の残りを許可しない（⑤優先を崩さない）。
  //    ただし user: 「AI宿題の残りから補充してよい」→ カテゴリ衝突しない残りを優先し、
  //    それでも足りない場合のみ衝突しない other を追加（既に other は複数可）。
  if (out.length < 6) {
    for (const item of skippedAi) {
      if (out.length >= 6) break;
      if (usedIds.has(item.id)) continue;
      if (conflictsExisting(item.text)) continue;
      const category = detectHomeworkCategory(item.text);
      if (category !== "other" && seenCategories.has(category)) continue;
      const before = out.length;
      tryPush(item, "ai");
      if (out.length > before) {
        // filledFromAi already incremented in tryPush
      }
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.debug("[homework-merge]", {
      aiHomeworkIn: current.length,
      seedsIn: seedList.length,
      seedsBySource: {
        priority: seedList.filter((s) => s.source === "priority").length,
        today: seedList.filter((s) => s.source === "today").length,
      },
      droppedByCategory,
      filledFromAi,
      outCount: Math.min(out.length, 6),
      categories: [...seenCategories],
      texts: out.slice(0, 6).map((g) => g.text),
    });
  }

  return out.slice(0, 6);
}

export function homeworkGoalsFromResult(
  result: AnalysisResult,
  seedActions: Array<string | HomeworkSeed>,
): NextActionGoal[] {
  return mergeHomeworkDisplayGoals(
    result.recommendationsUntilNext,
    seedActions,
  );
}
