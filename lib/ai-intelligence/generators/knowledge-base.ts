import { KNOWLEDGE_CATEGORY_LABELS } from "../constants";
import type {
  KnowledgeBaseAnswer,
  KnowledgeBaseContext,
  KnowledgeBaseGenerator,
  KnowledgeDocument,
  KnowledgeSearchHit,
} from "../types";

/** Sleep Wellness ナレッジのシード（モック）。将来はベクトルDB / CMS に置換。 */
export const KNOWLEDGE_DOCUMENTS: readonly KnowledgeDocument[] = [
  {
    id: "kw-method-01",
    title: "Sleep Wellness Method 概要",
    category: "sleep_wellness_method",
    body: "Sleep Wellness Method は、測定・解釈・習慣設計・フォローの循環で睡眠の質を高めるSWIJ独自の実践体系です。医療行為ではなく、生活改善と教育を中心とします。",
    tags: ["method", "swij", "循環", "習慣"],
  },
  {
    id: "kw-method-02",
    title: "5ステージ・ジャーニーとの接続",
    category: "sleep_wellness_method",
    body: "Sleep Awareness から Sleep Wellness までの5ステージは、Method の理解度と習慣定着度に対応します。各ステージでHomeworkの難度と評価指標を変えます。",
    tags: ["journey", "ステージ", "homework"],
  },
  {
    id: "kw-yoga-01",
    title: "メラトニンヨガ™ 基本原則",
    category: "melatonin_yoga",
    body: "メラトニンヨガ™は、夕方以降の実践で副交感神経を優位にし、入眠準備を整えるシークエンスです。無理な柔軟性より呼吸と体温の下りを重視します。",
    tags: ["ヨガ", "メラトニン", "入眠", "呼吸"],
  },
  {
    id: "kw-yoga-02",
    title: "メラトニンヨガ™ 実践タイミング",
    category: "melatonin_yoga",
    body: "推奨は就寝90〜120分前。強い光・激しい運動の直後は避け、部屋を暗めにして行います。所要は8〜20分を目安に段階的に延ばします。",
    tags: ["タイミング", "就寝", "実践"],
  },
  {
    id: "kw-science-01",
    title: "睡眠効率と中途覚醒",
    category: "sleep_science",
    body: "睡眠効率は床上時間に対する実睡眠の割合です。85%未満が続く場合、就床時刻のずれやカフェイン、ストレスによる中途覚醒を優先的に確認します。",
    tags: ["睡眠効率", "中途覚醒", "指標"],
  },
  {
    id: "kw-science-02",
    title: "HRV と回復余力",
    category: "sleep_science",
    body: "HRV（心拍変動）は自律神経の余力の参考指標です。低下が続く場合はトレーニング負荷・睡眠負債・心理的緊張を見直し、医療が必要な兆候は医療機関へ案内します。",
    tags: ["hrv", "回復", "自律神経"],
  },
  {
    id: "kw-cert-01",
    title: "認定講師カウンセリングの基本",
    category: "certification_text",
    body: "認定テキストでは、まず良かった点の承認、次に数値の非診断的解釈、最後に1〜3個のHomework合意を推奨します。クライアントの自己効力感を損なわない言葉選びが重要です。",
    tags: ["認定", "カウンセリング", "homework"],
  },
  {
    id: "kw-cert-02",
    title: "リスク時のエスカレーション",
    category: "certification_text",
    body: "抑うつ・睡眠時無呼吸の強い疑い・急激な体調変化がある場合は、Sleep Wellness の範囲を超え、医療機関への相談を促すのが認定講師の責務です。",
    tags: ["リスク", "医療", "エスカレーション"],
  },
  {
    id: "kw-paper-01",
    title: "習慣継続と睡眠指標（内部レビュー要約）",
    category: "research_paper",
    body: "匿名集計の内部レビューでは、14日以上の継続群で睡眠効率の改善傾向が観察されました。因果は断定できず、脱落バイアスに留意が必要です。",
    tags: ["研究", "継続", "睡眠効率"],
  },
  {
    id: "kw-paper-02",
    title: "季節変動とコーチング介入",
    category: "research_paper",
    body: "夏季は全体スコアが低下しやすい一方、朝の光曝露と冷却ルーティンを組み合わせた介入群では低下幅が小さい傾向が報告されています。",
    tags: ["季節", "夏", "介入"],
  },
] as const;

function tokenize(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[\s　、。・,/]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 1);
}

function scoreDocument(doc: KnowledgeDocument, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  const hay = `${doc.title} ${doc.body} ${doc.tags.join(" ")} ${KNOWLEDGE_CATEGORY_LABELS[doc.category]}`.toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (hay.includes(token)) hits += 1;
  }
  return hits / tokens.length;
}

function snippetOf(body: string, max = 110): string {
  const trimmed = body.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

function buildAnswer(
  query: string,
  hits: KnowledgeSearchHit[],
  docs: KnowledgeDocument[],
): string {
  if (hits.length === 0) {
    return `「${query}」に直接一致するナレッジは見つかりませんでした。Sleep Wellness Method・メラトニンヨガ™・睡眠科学・認定テキスト・研究論文のいずれかのキーワードで再検索してください。`;
  }
  const top = docs.find((d) => d.id === hits[0]?.id);
  if (!top) {
    return "関連ナレッジの要約を生成できませんでした。";
  }
  return `「${query}」について：${top.body} （出典: ${top.title} / ${KNOWLEDGE_CATEGORY_LABELS[top.category]}）`;
}

/**
 * ルールベース Knowledge Base（キーワード検索 + 要約文）。
 * 将来: Embeddings + OpenAI で回答生成する Generator に差し替え。
 */
export function generateRuleBasedKnowledgeBase(
  ctx: KnowledgeBaseContext,
): KnowledgeBaseAnswer {
  const query = ctx.query.trim() || "Sleep Wellness Method";
  const limit = ctx.limit ?? 5;
  const tokens = tokenize(query);

  const ranked = KNOWLEDGE_DOCUMENTS.map((doc) => ({
    doc,
    relevance: scoreDocument(doc, tokens),
  }))
    .filter((row) => (tokens.length === 0 ? true : row.relevance > 0))
    .sort((a, b) => b.relevance - a.relevance);

  const fallback =
    ranked.length > 0
      ? ranked
      : KNOWLEDGE_DOCUMENTS.map((doc) => ({ doc, relevance: 0.15 }));

  const results: KnowledgeSearchHit[] = fallback.slice(0, limit).map((row) => ({
    id: row.doc.id,
    title: row.doc.title,
    category: row.doc.category,
    snippet: snippetOf(row.doc.body),
    relevance: Math.round(row.relevance * 100) / 100,
  }));

  return {
    featureId: "knowledge_base",
    query,
    answer: buildAnswer(
      query,
      results,
      fallback.map((r) => r.doc),
    ),
    results,
    citedSources: results.map((r) => r.title),
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generateKnowledgeBase(
  ctx: KnowledgeBaseContext,
  generator: KnowledgeBaseGenerator = generateRuleBasedKnowledgeBase,
): Promise<KnowledgeBaseAnswer> {
  return generator(ctx);
}
