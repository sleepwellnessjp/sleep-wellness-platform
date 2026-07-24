import type {
  ResearchAiContext,
  ResearchAiGenerator,
  ResearchAiReport,
} from "../types";

/**
 * ルールベース Research AI（匿名モックレポート）。
 * 将来: 匿名集計データ + OpenAI で章立てレポートを生成する Generator に差し替え。
 */
export function generateRuleBasedResearchAi(
  ctx: ResearchAiContext = {},
): ResearchAiReport {
  const topic = ctx.topic?.trim() || "Sleep Wellness Method 継続による睡眠効率の変化";
  const periodLabel = ctx.periodLabel?.trim() || "2025 Q4 – 2026 Q2";

  return {
    featureId: "research_ai",
    title: `匿名集計レポート：${topic}`,
    abstract:
      "Sleep Wellness Institute Japan プラットフォーム上の匿名化データを用い、認定プログラム継続と主要睡眠指標の関連を記述統計として整理した。個人特定情報は含まない。",
    sections: [
      {
        heading: "1. 目的",
        body: "Sleep Wellness Method およびメラトニンヨガ™の継続実践が、睡眠効率・ストレス・HRVに与える傾向を、匿名集計から把握する。",
      },
      {
        heading: "2. 方法",
        body: "分析回数2回以上の匿名クライアントを対象に、初回と最新の指標差分を集計。年齢帯・季節で層別化した。医療診断・因果推論は行わない。",
      },
      {
        heading: "3. 結果（要約）",
        body: "継続14日以上の群では、睡眠効率の中央値が約+4.8pt、ストレス指標が約−6.1ptの方向を示した。夏期は全体スコアが低下しやすい一方、朝の光・冷却ルーティン併用群では低下幅が小さかった。",
      },
      {
        heading: "4. 考察",
        body: "習慣継続と講師フォローが重なるクライアントで改善幅が大きい傾向がある。イベント参加後2週間のHomework完了率上昇が、短期スコア改善と併存していた。",
      },
      {
        heading: "5. 限界",
        body: "観察データであり因果は断定できない。デバイス・自己報告のノイズ、脱落バイアスを含む。臨床判断には用いない。",
      },
    ],
    sampleSize: 1284,
    periodLabel,
    keyFindings: [
      "継続14日以上で睡眠効率の改善傾向が強い",
      "講師フォロー + Homework完了が高い群でストレス低下が顕著",
      "夏季は全体スコアが下がるが、朝光習慣で低下が緩和",
      "メラトニンヨガ™週3以上で入眠関連の主観改善が報告されやすい",
    ],
    anonymized: true,
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generateResearchAi(
  ctx: ResearchAiContext = {},
  generator: ResearchAiGenerator = generateRuleBasedResearchAi,
): Promise<ResearchAiReport> {
  return generator(ctx);
}
