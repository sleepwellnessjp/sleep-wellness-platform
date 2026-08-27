/**
 * 結果画面レイアウト確認用のダミー分析結果。
 * OCR・入力・分析ロジックには接続しない。
 */

import {
  hydrateAnalysisSession,
  normalizeAnalysisResult,
  type AnalysisResult,
} from "@/lib/analysis-session";
import { emptyGraphBundle } from "@/lib/soxai-graphs";
import type { LifestyleSnapshot } from "@/lib/wellness-client-report";

export const DEMO_LIFESTYLE_SNAPSHOT: LifestyleSnapshot = {
  alcohol: "あり / 種類:ビール / 量:350ml / 度数:5% / 終了時刻:22:30",
  alcoholDrank: "yes",
  caffeine: "あり / 種類:コーヒー / 量:1杯 / 時刻:15:00",
  caffeineDone: "yes",
  bathing: "湯船に入った / 時刻:22:00 / 入浴時間:15分 / 温度:40℃",
  yoga: "実施 / 60分 / 開始:20:30",
  yogaDone: "yes",
  pilates: "なし",
  pilatesDone: "none",
  meals:
    "朝食: 食べた / 08:00；昼食: 食べた / 12:30；夕食: 食べた / 21:00",
  otherExerciseDone: "yes",
  exercise: "ウォーキング 30分",
  dinnerTime: "21:00",
  stress: "普通",
};

export function buildDemoAnalysisResult(): AnalysisResult {
  const normalized = normalizeAnalysisResult({
    contentStatus: "ready",
    summary:
      "睡眠時間は十分確保できています。\n一方で飲酒により睡眠の質が低下している可能性があります。",
    karteSummary: [
      "■最重要課題",
      "深い睡眠の確保と、就寝前の飲酒・光刺激の見直しが最優先です。",
      "■判断根拠",
      "睡眠時間は確保できている一方で、深い睡眠率とHRVに改善余地があります。飲酒終了時刻が就寝に近いことも影響している可能性があります。",
      "■最も改善効果が高い行動",
      "就寝2時間前までの飲酒終了と、39〜40℃・15分の入浴を今夜から実践してください。",
    ].join("\n"),
    goodPoints: [
      "睡眠時間が十分",
      "睡眠効率が高い",
      "HRVが良好",
      "体内時計が大きく乱れていない",
    ],
    improvements: [
      {
        stars: 5,
        text: "飲酒タイミング",
        whyNow:
          "飲酒は入眠を早めても中途覚醒や深い睡眠の減少につながりやすいです。就寝の2時間前までに終えると、睡眠の質が安定しやすくなります。",
      },
      {
        stars: 4,
        text: "カフェイン摂取",
        whyNow:
          "午後のカフェインが残っている可能性があります。15時以降を控えると入眠がスムーズになります。",
      },
      {
        stars: 4,
        text: "就寝前のスマホ",
        whyNow:
          "強い光刺激はメラトニン分泌を遅らせます。寝る30分前から画面を見ない時間をつくりましょう。",
      },
    ],
    profileRelation:
      "普段の生活傾向と今回の測定をあわせると、就寝前の切り替えが睡眠の連続性に影響している可能性があります。",
    scoreComment:
      "今回の Sleep Wellness Score は、身体と生活のバランスを中心に評価しています。\n良い点を維持しつつ、飲酒と就寝前ルーティンを整えると回復感が上がりやすい状態です。",
    categoryScoreRationales: {
      body: "睡眠時間と効率は良好ですが、深い睡眠に伸ばし余地があります。",
      mind: "ストレスは低め、HRVも一定水準を維持しています。",
      lifestyle: "飲酒・カフェインのタイミングが生活軸の点数に影響しています。",
      environment: "大きな環境要因の乱れは見当たりません。",
    },
    todaysRecommendations: [
      "39〜40℃で15分入浴する",
      "就寝2時間前までに飲酒を終える",
      "寝る30分前からスマホを見ない",
    ],
    nextComparisonPoints: [
      "深い睡眠の割合の変化",
      "飲酒終了時刻と睡眠効率の関係",
      "HRVの推移",
    ],
    recommendationsUntilNext: [
      {
        id: "demo-goal-1",
        text: "今夜は就寝2時間前までに飲酒を終える",
        checked: false,
      },
      {
        id: "demo-goal-2",
        text: "今週は平日の起床時刻を揃える",
        checked: false,
      },
      {
        id: "demo-goal-3",
        text: "午後のカフェインを控える習慣を続ける",
        checked: false,
      },
      {
        id: "demo-goal-4",
        text: "就寝前にメラトニンヨガ™ Phase2 を実施する",
        checked: false,
      },
    ],
    instructorSuggestions: [
      "良好な点：睡眠時間と効率が安定している点をまず伝えてください",
      "改善が必要な点：飲酒終了時刻を具体的に確認してください",
      "考えられる要因：就寝前の画面時間も合わせて観察してください",
      "質問候補：昨夜の入浴時間とお湯の温度はどのくらいでしたか？",
    ],
    instructorCounseling: {
      goodPoints: [
        "睡眠時間が十分に確保できている",
        "睡眠効率が高く、就床時間を活かせている",
      ],
      needsImprovement: [
        "飲酒の終了時刻が就寝に近い",
        "午後以降のカフェイン習慣",
      ],
      possibleFactors: [
        "就寝前のリラックス不足",
        "夕食〜就寝までの間隔が短めの可能性",
      ],
      questionCandidates: [
        "昨夜の最後の飲酒は何時頃でしたか？",
        "入浴は湯船・シャワーのどちらでしたか？",
      ],
    },
    melatoninYogaPlan: {
      recommendedPhase: "Phase2（整える）",
      breathing: "腹式呼吸 5分",
      bathing: "39〜40℃で15分の湯船",
      morningAction: "起床後すぐ Curtain Open＋軽いストレッチ",
    },
    score: 72,
    scoreBreakdown: {
      sleepDuration: 4,
      sleepEfficiency: 4,
      deepSleep: 3,
      hrv: 4,
      stress: 4,
      spo2: 5,
      recovery: 3,
    },
    categoryScores: {
      body: 70,
      mind: 74,
      lifestyle: 66,
      environment: 78,
    },
    metrics: {
      sleepScore: 68,
      qol: "62",
      yesterdayQol: "58",
      conditionScore: "71",
      bedtime: "23:40",
      wakeTime: "06:50",
      sleepDuration: "6時間40分",
      sleepEfficiency: "89%",
      awakenings: "0:28",
      awakeningRate: "8%",
      remSleep: "1:22",
      remSleepRate: "20%",
      nonRemSleep: "4:48",
      nonRemSleepRate: "72%",
      lightSleep: "3:20",
      lightSleepRate: "50%",
      deepSleep: "1:28",
      deepSleepRate: "22%",
      sleepDebt: "-35分",
      sleepLatency: "18分",
      circadianRhythm: "0:12",
      respiratoryRate: "13.2 rpm",
      spo2: "96%",
      restingHeartRate: "58 bpm",
      restingHeartRateMin: "52 bpm",
      restingHeartRateMax: "74 bpm",
      averageHeartRate: "58 bpm",
      hrv: "48 ms",
      hrvMax: "92 ms",
      hrvMin: "28 ms",
      skinTemperature: "-0.2℃",
      stress: "32",
      breathingDisturbances: "",
      previousDayActivity: "",
    },
    graphs: emptyGraphBundle(),
    caution: "単日データのため、数日の推移もあわせて確認してください。",
    disclaimer:
      "本レポートは睡眠ウェルネス支援であり、医療診断・治療を代替しません。",
    clientName: "デモ 太郎",
    measurementDate: "2026-08-01",
    age: "42",
    gender: "male",
    drinkingHabit: "週2回程度",
    exerciseHabit: "ウォーキング週3回",
    analysisId: "demo-layout-analysis",
    clientId: "demo-layout-client",
  });

  return hydrateAnalysisSession(normalized);
}
