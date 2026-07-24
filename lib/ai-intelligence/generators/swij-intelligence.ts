import type {
  SwijIntelligenceGenerator,
  SwijIntelligenceReport,
} from "../types";

/**
 * ルールベース SWIJ Intelligence（モック全国集計）。
 * 将来: 匿名集計 API + OpenAI で summary / insight 文を生成する Generator に差し替え。
 */
export function generateRuleBasedSwijIntelligence(): SwijIntelligenceReport {
  return {
    featureId: "swij_intelligence",
    nationalAverages: [
      {
        metric: "睡眠スコア",
        value: 68.4,
        unit: "pt",
        deltaVsPrevMonth: 1.2,
      },
      {
        metric: "睡眠効率",
        value: 84.1,
        unit: "%",
        deltaVsPrevMonth: 0.6,
      },
      {
        metric: "ストレス",
        value: 42.8,
        unit: "pt",
        deltaVsPrevMonth: -1.5,
      },
      {
        metric: "HRV",
        value: 44.2,
        unit: "ms",
        deltaVsPrevMonth: 0.9,
      },
    ],
    ageGroupComparisons: [
      { ageGroup: "20代", sleepScore: 65.2, efficiency: 82.1, stress: 46.5 },
      { ageGroup: "30代", sleepScore: 66.8, efficiency: 83.4, stress: 45.1 },
      { ageGroup: "40代", sleepScore: 69.1, efficiency: 84.8, stress: 41.2 },
      { ageGroup: "50代", sleepScore: 71.4, efficiency: 85.6, stress: 39.8 },
      { ageGroup: "60代+", sleepScore: 72.0, efficiency: 86.1, stress: 38.5 },
    ],
    improvementRankings: [
      { rank: 1, label: "関東Aエリア", value: 18.4, unit: "%" },
      { rank: 2, label: "関西Bエリア", value: 16.9, unit: "%" },
      { rank: 3, label: "中部Cエリア", value: 15.2, unit: "%" },
      { rank: 4, label: "九州Dエリア", value: 14.1, unit: "%" },
      { rank: 5, label: "北海道Eエリア", value: 12.8, unit: "%" },
    ],
    instructorRankings: [
      { rank: 1, label: "佐藤 美咲", value: 22.1, unit: "%" },
      { rank: 2, label: "鈴木 健", value: 19.6, unit: "%" },
      { rank: 3, label: "山田 里奈", value: 18.3, unit: "%" },
      { rank: 4, label: "高橋 翔", value: 17.0, unit: "%" },
      { rank: 5, label: "伊藤 花", value: 15.8, unit: "%" },
    ],
    eventEffects: [
      {
        eventName: "メラトニンヨガ™ 全国デー",
        periodLabel: "2026-06",
        effectSummary: "参加クライアントの入眠潜時が平均短縮",
        deltaPercent: 7.2,
      },
      {
        eventName: "認定講師フォローアップ週間",
        periodLabel: "2026-05",
        effectSummary: "Homework 完了率が上昇し、翌週スコアが改善",
        deltaPercent: 5.4,
      },
      {
        eventName: "企業ウェルネス導入パイロット",
        periodLabel: "2026-04",
        effectSummary: "ストレス指標の低下が顕著",
        deltaPercent: 4.1,
      },
    ],
    seasonalTrends: [
      {
        season: "春",
        sleepScoreAvg: 67.2,
        insight: "生活リズムの変化で中途覚醒が増えやすい時期。",
      },
      {
        season: "夏",
        sleepScoreAvg: 65.8,
        insight: "体温・日照の影響で入眠が遅れやすい。冷却ルーティンが有効。",
      },
      {
        season: "秋",
        sleepScoreAvg: 69.5,
        insight: "改善が乗りやすい。習慣定着の好機。",
      },
      {
        season: "冬",
        sleepScoreAvg: 68.1,
        insight: "日照不足で気分・リズムが乱れやすい。朝光を意識。",
      },
    ],
    summary:
      "全国平均は緩やかに改善傾向。40代以降のスコアが高く、イベント連動の改善効果も確認できます。夏場の低下を見据えた予防的コーチングが有効です。",
    generatedAt: new Date().toISOString(),
    source: "rules",
  };
}

export async function generateSwijIntelligence(
  generator: SwijIntelligenceGenerator = generateRuleBasedSwijIntelligence,
): Promise<SwijIntelligenceReport> {
  return generator();
}
