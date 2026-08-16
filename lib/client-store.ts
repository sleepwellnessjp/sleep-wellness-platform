import {
  computeHomeworkAchievement,
  normalizeMetrics,
  normalizeRecommendationsUntilNext,
  type AnalysisMetrics,
  type AnalysisResult,
  type NextActionGoal,
} from "@/lib/analysis-session";
import { buildClientSearchText } from "@/lib/client-search";
import { normalizeClientTags } from "@/lib/client-tags";
import {
  buildStructuredMetrics,
  type StructuredSleepMetrics,
} from "@/lib/soxai-structured-metrics";

const STORAGE_KEY = "swij-clients-v1";
const SEED_FLAG_KEY = "swij-clients-seeded-v4";
const LAST_SAVE_KEY = "swij-last-saved-analysis";

export type PdfHistoryEntry = {
  id: string;
  label: string;
  createdAt: string;
};

export type StoredAnalysis = {
  id: string;
  analysisDate: string;
  createdAt: string;
  sleepScore: number | null;
  wellnessScore: number;
  /** OCR / 確認済みメトリクス */
  metrics: AnalysisMetrics;
  /** 構造化メトリクス（入眠・起床・皮膚温・ストレス） */
  structured?: StructuredSleepMetrics;
  /** AI分析結果 */
  result: AnalysisResult;
  pdfHistory: PdfHistoryEntry[];
};

export type StoredClient = {
  id: string;
  name: string;
  registeredAt: string;
  nameKana?: string;
  birthDate?: string;
  gender?: string;
  /** 年齢（分析時必須） */
  age?: number;
  /** 身長 cm（推奨） */
  heightCm?: number;
  /** 体重 kg（推奨） */
  weightKg?: number;
  medications?: string;
  drinkingHabit?: string;
  exerciseHabit?: string;
  snoringNasal?: string;
  medicalHistory?: string;
  email?: string;
  phone?: string;
  memo?: string;
  /** Free-form labels for filtering (local / future-ready). */
  tags?: string[];
  /** Version 1.0 Beta: 改善開始日 */
  startDate?: string;
  /** Version 1.0 Beta: 次回フォロー予定 */
  nextFollowUpDate?: string;
  /** Version 1.0 Beta: 直近 Sleep Score */
  currentSleepScore?: number;
  analyses: StoredAnalysis[];
};

export type ClientListItem = {
  id: string;
  name: string;
  registeredAt: string;
  latestSleepScore: number | null;
  latestAnalysisDate: string | null;
  tags: string[];
  /** Precomputed haystack for fast realtime search. */
  searchText: string;
};

export type CreateClientInput = {
  name: string;
  nameKana?: string;
  birthDate?: string;
  gender?: string;
  age?: string | number;
  heightCm?: string | number;
  weightKg?: string | number;
  medications?: string;
  drinkingHabit?: string;
  exerciseHabit?: string;
  snoringNasal?: string;
  medicalHistory?: string;
  email?: string;
  phone?: string;
  registeredAt?: string;
  memo?: string;
  tags?: string[];
};

function parseOptionalInt(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value);
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return Math.round(n);
  }
  return undefined;
}

function parseOptionalFloat(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value.trim());
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

function asOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function asOptionalTags(value: unknown): string[] | undefined {
  const tags = normalizeClientTags(value);
  return tags.length > 0 ? tags : undefined;
}

/** 新しい順（保存日時 createdAt 優先、同日時は測定日） */
function sortAnalyses(analyses: StoredAnalysis[]): StoredAnalysis[] {
  return [...analyses].sort((a, b) => {
    const byCreated = b.createdAt.localeCompare(a.createdAt);
    if (byCreated !== 0) return byCreated;
    return b.analysisDate.localeCompare(a.analysisDate);
  });
}

function readRawClients(): StoredClient[] {
  if (!canUseStorage()) return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const clients = parsed
      .filter(
        (item): item is StoredClient =>
          !!item &&
          typeof item === "object" &&
          typeof (item as StoredClient).id === "string" &&
          typeof (item as StoredClient).name === "string",
      )
      .map((client) => ({
        ...client,
        name: client.name.trim(),
        nameKana: asOptionalString(client.nameKana),
        birthDate: asOptionalString(client.birthDate),
        gender: asOptionalString(client.gender),
        age: parseOptionalInt(client.age),
        heightCm: parseOptionalFloat(client.heightCm),
        weightKg: parseOptionalFloat(client.weightKg),
        medications: asOptionalString(client.medications),
        drinkingHabit: asOptionalString(client.drinkingHabit),
        exerciseHabit: asOptionalString(client.exerciseHabit),
        snoringNasal: asOptionalString(client.snoringNasal),
        medicalHistory: asOptionalString(client.medicalHistory),
        email: asOptionalString(client.email),
        phone: asOptionalString(client.phone),
        memo: asOptionalString(client.memo),
        tags: asOptionalTags(client.tags),
        analyses: Array.isArray(client.analyses)
          ? sortAnalyses(
              client.analyses.map((analysis) => ({
                ...analysis,
                metrics: normalizeMetrics(analysis.metrics),
                result: {
                  ...analysis.result,
                  metrics: normalizeMetrics(
                    analysis.result?.metrics ?? analysis.metrics,
                  ),
                },
                pdfHistory: Array.isArray(analysis.pdfHistory)
                  ? analysis.pdfHistory
                  : [],
              })),
            )
          : [],
      }));

    return patchDemoClientAnalyses(clients);
  } catch {
    return [];
  }
}

/** デモクライアントの分析履歴が不足している場合のみ補完。欠落デモも追加 */
function patchDemoClientAnalyses(clients: StoredClient[]): StoredClient[] {
  const seedClients = buildSeedClients();
  const seedById = new Map(seedClients.map((client) => [client.id, client]));
  const existingIds = new Set(clients.map((client) => client.id));

  const patched = clients.map((client) => {
    const seed = seedById.get(client.id);
    if (!seed) return client;

    // デモ用シードの分析履歴が増えた場合は丸ごと補完
    if (client.analyses.length < seed.analyses.length) {
      return {
        ...client,
        memo: client.memo ?? seed.memo,
        tags: client.tags?.length ? client.tags : seed.tags,
        drinkingHabit: client.drinkingHabit ?? seed.drinkingHabit,
        analyses: sortAnalyses(seed.analyses),
      };
    }

    // 既存デモ分析（analysis-demo-*）はシード内容で同期し、アラート例を最新化
    const seedAnalysisById = new Map(
      seed.analyses.map((analysis) => [analysis.id, analysis]),
    );
    let changed = false;
    const nextAnalyses = client.analyses.map((analysis) => {
      const seedAnalysis = seedAnalysisById.get(analysis.id);
      if (!seedAnalysis || !analysis.id.startsWith("analysis-demo-")) {
        return analysis;
      }
      changed = true;
      return seedAnalysis;
    });

    if (!changed) return client;
    return {
      ...client,
      memo: client.memo ?? seed.memo,
      tags: client.tags?.length ? client.tags : seed.tags,
      drinkingHabit: client.drinkingHabit ?? seed.drinkingHabit,
      analyses: sortAnalyses(nextAnalyses),
    };
  });

  for (const seed of seedClients) {
    if (!existingIds.has(seed.id)) {
      patched.push(seed);
    }
  }

  return patched;
}

function writeClients(clients: StoredClient[]) {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
    window.dispatchEvent(new Event("swij-clients-updated"));
  } catch (error) {
    console.error("Failed to persist clients:", error);
  }
}

function buildSeedClients(): StoredClient[] {
  const now = new Date();
  const isoDaysAgo = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() - days);
    return d.toISOString();
  };
  const dateDaysAgo = (days: number) => isoDaysAgo(days).slice(0, 10);

  const sampleMetrics = (
    score: number,
    overrides: Partial<AnalysisMetrics> = {},
  ): AnalysisMetrics =>
    normalizeMetrics({
      sleepScore: score,
      sleepDuration: "6時間48分",
      bedtime: "23:40",
      wakeTime: "06:28",
      sleepEfficiency: "87%",
      awakenings: "38分",
      awakeningRate: "9%",
      remSleep: "1時間22分",
      remSleepRate: "20%",
      nonRemSleep: "4時間48分",
      nonRemSleepRate: "71%",
      lightSleep: "3時間40分",
      lightSleepRate: "54%",
      deepSleep: "1時間08分",
      deepSleepRate: "17%",
      sleepDebt: "-42分",
      sleepLatency: "14分",
      circadianRhythm: "やや遅れ",
      respiratoryRate: "14回/分",
      spo2: "96%",
      restingHeartRate: "58 bpm",
      hrv: "42 ms",
      skinTemperature: "+0.1℃",
      stress: "28",
      ...overrides,
    });

  const sampleResult = (
    name: string,
    date: string,
    score: number,
    summary: string,
  ): AnalysisResult => ({
    summary,
    karteSummary: summary.slice(0, 200),
    goodPoints: [
      "睡眠の土台はおおむね保たれている可能性があります",
      "深い睡眠が一定量とれています",
      "朝の起床リズムに大きな乱れは見られません",
    ],
    improvements: [
      {
        stars: 5,
        text: "入眠前60分の強い光を控え、切り替え時間をつくる",
      },
      {
        stars: 4,
        text: "就寝前にゆっくりした呼吸で体を休める準備をする",
      },
      {
        stars: 4,
        text: "就寝90〜60分前のぬるめ入浴で体温リズムを整える",
      },
      {
        stars: 3,
        text: "翌朝同じ時刻に起き、朝の光を数分取り入れる",
      },
    ],
    profileRelation:
      "普段の生活傾向と今回の測定をあわせて見ると、入眠前の切り替えが睡眠の連続性に影響している可能性があります。\n当日だけの一時的な習慣と、日頃のリズムは分けて考えると整理しやすいです。",
    scoreComment:
      "今回の睡眠ウェルネススコアは、身体と心のバランスを中心に評価しています。\n生活や環境の軸にも整え余地があり、数日の推移を見ると傾向がよりはっきりします。",
    todaysRecommendations: [
      "今日は21時以降スマホを控える",
      "今日は朝7時30分までに日光を浴びる",
      "今日はアルコール350ml以内にする",
    ],
    nextComparisonPoints: [
      "深い睡眠の割合の変化",
      "入眠前の光・切り替え時間",
      "心拍のゆらぎの推移",
    ],
    recommendationsUntilNext: [
      {
        id: "goal-demo-1",
        text: "今夜は就寝90分前に入浴を終える",
        checked: false,
      },
      {
        id: "goal-demo-2",
        text: "今週は平日の起床時刻を揃える",
        checked: false,
      },
      {
        id: "goal-demo-3",
        text: "午後のカフェインを控える習慣を続ける",
        checked: false,
      },
      {
        id: "goal-demo-4",
        text: "入眠前60分は強い光を控える",
        checked: false,
      },
    ],
    instructorSuggestions: [
      "朝の行動を詳しくヒアリングしてください",
      "飲酒量の変化を次回確認してください",
      "体内時計の改善を重点確認してください",
    ],
    score,
    scoreBreakdown: {
      sleepDuration: 4,
      sleepEfficiency: 4,
      deepSleep: 3,
      hrv: 4,
      stress: 3,
      spo2: 5,
      recovery: 4,
    },
    categoryScores: {
      body: Math.max(0, Math.min(100, score - 2)),
      mind: Math.max(0, Math.min(100, score + 1)),
      lifestyle: Math.max(0, Math.min(100, score - 4)),
      environment: Math.max(0, Math.min(100, score + 3)),
    },
    metrics: sampleMetrics(score),
    caution: "単日データのため、数日の推移も確認しましょう。",
    disclaimer:
      "本レポートは睡眠ウェルネス支援であり、医療診断・治療を代替しません。",
    clientName: name,
    measurementDate: date,
  });

  return [
    {
      id: "client-demo-4",
      name: "伊藤 翔",
      registeredAt: isoDaysAgo(45),
      age: 29,
      gender: "male",
      tags: ["企業契約", "初回"],
      analyses: [],
    },
    {
      id: "client-demo-1",
      name: "佐藤 美咲",
      registeredAt: isoDaysAgo(28),
      tags: ["ホットヨガ", "花粉症"],
      analyses: [
        {
          id: "analysis-demo-1-1",
          analysisDate: dateDaysAgo(5),
          createdAt: isoDaysAgo(5),
          sleepScore: 72,
          wellnessScore: 74,
          metrics: sampleMetrics(72, {
            sleepEfficiency: "87%",
            deepSleepRate: "18%",
          }),
          result: sampleResult(
            "佐藤 美咲",
            dateDaysAgo(5),
            74,
            "深い睡眠と効率が安定し、回復の質が良い夜でした。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-1-1",
              label: "Sleep Wellness Visual Report",
              createdAt: isoDaysAgo(5),
            },
          ],
        },
        {
          id: "analysis-demo-1-2",
          analysisDate: dateDaysAgo(19),
          createdAt: isoDaysAgo(19),
          sleepScore: 81,
          wellnessScore: 83,
          metrics: sampleMetrics(81),
          result: sampleResult(
            "佐藤 美咲",
            dateDaysAgo(19),
            83,
            "全体は安定。入眠潜時に少し整える余地があります。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-1-2",
              label: "Sleep Wellness Medical Report",
              createdAt: isoDaysAgo(19),
            },
          ],
        },
      ],
    },
    {
      id: "client-demo-2",
      name: "鈴木 健太",
      registeredAt: isoDaysAgo(35),
      tags: ["夜勤", "アスリート"],
      analyses: [
        {
          id: "analysis-demo-2-1",
          analysisDate: dateDaysAgo(1),
          createdAt: isoDaysAgo(1),
          sleepScore: 68,
          wellnessScore: 70,
          metrics: sampleMetrics(68, {
            sleepDuration: "6時間05分",
            sleepEfficiency: "84%",
            deepSleep: "58分",
            deepSleepRate: "15%",
            awakenings: "42分",
            awakeningRate: "11%",
            sleepLatency: "16分",
            hrv: "38 ms",
            restingHeartRate: "58 bpm",
            stress: "38",
          }),
          result: {
            ...sampleResult(
              "鈴木 健太",
              dateDaysAgo(1),
              70,
              "前回より睡眠スコアが下がり、夜勤の増加も生活リズムに影響している可能性があります。",
            ),
            karteSummary:
              "■現在の状態\n前回より回復が弱まった可能性があります。\n■原因分析\n夜勤の増加と睡眠時間・効率の変化が重なっていると考えられます。\n■改善戦略\nシフトと睡眠のバランスを次回フォローで確認し、回復機会を優先して整えることが有効と考えられます。",
          },
          pdfHistory: [
            {
              id: "pdf-demo-2-1",
              label: "Sleep Wellness Medical Report",
              createdAt: isoDaysAgo(1),
            },
          ],
        },
        {
          id: "analysis-demo-2-2",
          analysisDate: dateDaysAgo(14),
          createdAt: isoDaysAgo(14),
          sleepScore: 71,
          wellnessScore: 73,
          metrics: sampleMetrics(71, {
            sleepDebt: "-1時間10分",
            stress: "46",
            awakenings: "48分",
            sleepLatency: "18分",
            hrv: "36 ms",
            restingHeartRate: "61 bpm",
          }),
          result: sampleResult(
            "鈴木 健太",
            dateDaysAgo(14),
            73,
            "睡眠負債とストレスがやや高めです。生活リズムの調整余地があります。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-2-2",
              label: "Sleep Wellness Medical Report",
              createdAt: isoDaysAgo(14),
            },
          ],
        },
        {
          id: "analysis-demo-2-3",
          analysisDate: dateDaysAgo(28),
          createdAt: isoDaysAgo(28),
          sleepScore: 65,
          wellnessScore: 67,
          metrics: sampleMetrics(65, {
            sleepDuration: "5時間58分",
            sleepEfficiency: "79%",
            deepSleep: "52分",
            deepSleepRate: "14%",
            awakenings: "1時間02分",
            awakeningRate: "17%",
            sleepLatency: "24分",
            hrv: "31 ms",
            restingHeartRate: "64 bpm",
            stress: "52",
            sleepDebt: "-1時間40分",
          }),
          result: sampleResult(
            "鈴木 健太",
            dateDaysAgo(28),
            67,
            "入眠潜時と中途覚醒が多く、回復が十分に得られにくい夜でした。",
          ),
          pdfHistory: [],
        },
      ],
    },
    {
      id: "client-demo-3",
      name: "田中 あかり",
      nameKana: "たなか あかり",
      registeredAt: isoDaysAgo(60),
      memo: "要フォロー確認用デモ",
      tags: ["高齢者", "高血圧", "睡眠薬"],
      drinkingHabit: "週4〜5回",
      analyses: [
        {
          id: "analysis-demo-3-1",
          analysisDate: dateDaysAgo(7),
          createdAt: isoDaysAgo(7),
          sleepScore: 54,
          wellnessScore: 56,
          metrics: sampleMetrics(54, {
            sleepDuration: "4時間42分",
            sleepEfficiency: "72%",
            awakenings: "1時間24分",
            awakeningRate: "24%",
            spo2: "93%",
            deepSleep: "32分",
            deepSleepRate: "11%",
            sleepLatency: "36分",
            hrv: "26 ms",
            restingHeartRate: "70 bpm",
            stress: "62",
            sleepDebt: "-2時間30分",
          }),
          result: {
            ...sampleResult(
              "田中 あかり",
              dateDaysAgo(7),
              56,
              "前回より睡眠のまとまりが弱まり、飲酒量の増加も見られます。回復の土台づくりを優先すると良いでしょう。",
            ),
            karteSummary:
              "■現在の状態\n3回連続で睡眠スコアが低下している可能性があります。\n■原因分析\n飲酒量の増加と、睡眠時間が5時間を下回る夜が続いており、深睡眠・効率への影響が考えられます。\n■改善戦略\n生活リズムと飲酒終了時刻を次回フォローで確認し、回復機会の確保を優先することが有効と考えられます。",
            improvements: [
              {
                stars: 5,
                text: "飲酒量が増加しているため、就寝3時間前までの終了を意識する",
              },
              {
                stars: 5,
                text: "睡眠時間が短い夜が続く場合は、就寝時刻を30分早めに設定する",
              },
              {
                stars: 4,
                text: "中途覚醒が多いため、入眠前の光と室温を整える",
              },
            ],
          },
          pdfHistory: [],
        },
        {
          id: "analysis-demo-3-2",
          analysisDate: dateDaysAgo(21),
          createdAt: isoDaysAgo(21),
          sleepScore: 61,
          wellnessScore: 63,
          metrics: sampleMetrics(61, {
            sleepDuration: "4時間55分",
            sleepEfficiency: "76%",
            awakenings: "1時間05分",
            awakeningRate: "18%",
            spo2: "94%",
            stress: "52",
            deepSleep: "40分",
            sleepLatency: "28分",
          }),
          result: sampleResult(
            "田中 あかり",
            dateDaysAgo(21),
            63,
            "睡眠時間が短く、前回よりスコアが下がっています。回復の余地があります。",
          ),
          pdfHistory: [],
        },
        {
          id: "analysis-demo-3-3",
          analysisDate: dateDaysAgo(35),
          createdAt: isoDaysAgo(35),
          sleepScore: 68,
          wellnessScore: 70,
          metrics: sampleMetrics(68, {
            sleepDuration: "5時間40分",
            awakenings: "52分",
            awakeningRate: "14%",
            spo2: "95%",
            stress: "44",
          }),
          result: sampleResult(
            "田中 あかり",
            dateDaysAgo(35),
            70,
            "やや改善の兆しはあるものの、回復はまだ安定していません。",
          ),
          pdfHistory: [],
        },
        {
          id: "analysis-demo-3-4",
          analysisDate: dateDaysAgo(49),
          createdAt: isoDaysAgo(49),
          sleepScore: 74,
          wellnessScore: 76,
          metrics: sampleMetrics(74, {
            sleepDuration: "6時間20分",
            awakenings: "38分",
            spo2: "96%",
            stress: "36",
          }),
          result: sampleResult(
            "田中 あかり",
            dateDaysAgo(49),
            76,
            "睡眠の土台は保たれており、深睡眠にも良い兆しがありました。",
          ),
          pdfHistory: [],
        },
      ],
    },
    {
      id: "client-demo-5",
      name: "高橋 恵",
      registeredAt: isoDaysAgo(40),
      age: 51,
      gender: "female",
      tags: ["更年期", "フォロー中"],
      analyses: [
        {
          id: "analysis-demo-5-1",
          analysisDate: dateDaysAgo(14),
          createdAt: isoDaysAgo(14),
          sleepScore: 55,
          wellnessScore: 57,
          metrics: sampleMetrics(55, {
            sleepDuration: "5時間20分",
            awakenings: "58分",
            stress: "48",
          }),
          result: sampleResult(
            "高橋 恵",
            dateDaysAgo(14),
            57,
            "中途覚醒が多く、回復が十分に得られにくい夜が続いています。",
          ),
          pdfHistory: [],
        },
      ],
    },
    {
      id: "client-demo-6",
      name: "渡辺 涼",
      registeredAt: isoDaysAgo(50),
      age: 44,
      gender: "male",
      tags: ["管理職", "出張多め"],
      analyses: [
        {
          id: "analysis-demo-6-1",
          analysisDate: dateDaysAgo(5),
          createdAt: isoDaysAgo(5),
          sleepScore: 69,
          wellnessScore: 71,
          metrics: sampleMetrics(69),
          result: sampleResult(
            "渡辺 涼",
            dateDaysAgo(5),
            71,
            "出張後のリズム乱れはあるものの、土台は保たれています。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-6-1",
              label: "Sleep Wellness Visual Report",
              createdAt: isoDaysAgo(5),
            },
          ],
        },
      ],
    },
    {
      id: "client-demo-7",
      name: "中村 結衣",
      registeredAt: isoDaysAgo(70),
      age: 33,
      gender: "female",
      tags: ["改善良好"],
      analyses: [
        {
          id: "analysis-demo-7-1",
          analysisDate: dateDaysAgo(3),
          createdAt: isoDaysAgo(3),
          sleepScore: 81,
          wellnessScore: 83,
          metrics: sampleMetrics(81, {
            sleepEfficiency: "91%",
            deepSleepRate: "20%",
            stress: "22",
          }),
          result: sampleResult(
            "中村 結衣",
            dateDaysAgo(3),
            83,
            "深睡眠と効率が高く、回復の質が安定しています。",
          ),
          pdfHistory: [],
        },
      ],
    },
    {
      id: "client-demo-8",
      name: "小林 大輔",
      registeredAt: isoDaysAgo(33),
      age: 47,
      gender: "male",
      tags: ["企業契約"],
      analyses: [
        {
          id: "analysis-demo-8-1",
          analysisDate: dateDaysAgo(12),
          createdAt: isoDaysAgo(12),
          sleepScore: 64,
          wellnessScore: 66,
          metrics: sampleMetrics(64),
          result: sampleResult(
            "小林 大輔",
            dateDaysAgo(12),
            66,
            "睡眠負債が残り気味です。起床時刻の固定から整えましょう。",
          ),
          pdfHistory: [],
        },
      ],
    },
    {
      id: "client-demo-9",
      name: "加藤 里奈",
      registeredAt: isoDaysAgo(22),
      age: 36,
      gender: "female",
      tags: ["ホットヨガ"],
      analyses: [
        {
          id: "analysis-demo-9-1",
          analysisDate: dateDaysAgo(7),
          createdAt: isoDaysAgo(7),
          sleepScore: 70,
          wellnessScore: 72,
          metrics: sampleMetrics(70),
          result: sampleResult(
            "加藤 里奈",
            dateDaysAgo(7),
            72,
            "ルーティン定着の兆しあり。入眠前の光環境を整えるとさらに改善しそうです。",
          ),
          pdfHistory: [],
        },
      ],
    },
    {
      id: "client-demo-10",
      name: "吉田 拓也",
      registeredAt: isoDaysAgo(38),
      age: 41,
      gender: "male",
      tags: ["夜型", "要フォロー"],
      analyses: [
        {
          id: "analysis-demo-10-1",
          analysisDate: dateDaysAgo(10),
          createdAt: isoDaysAgo(10),
          sleepScore: 58,
          wellnessScore: 60,
          metrics: sampleMetrics(58, {
            bedtime: "01:10",
            wakeTime: "07:40",
            sleepLatency: "28分",
            stress: "44",
          }),
          result: sampleResult(
            "吉田 拓也",
            dateDaysAgo(10),
            60,
            "就寝時刻の遅れが入眠潜時とストレスに影響している可能性があります。",
          ),
          pdfHistory: [],
        },
      ],
    },
    {
      id: "client-demo-11",
      name: "松本 さくら",
      registeredAt: isoDaysAgo(18),
      age: 28,
      gender: "female",
      tags: ["初回後"],
      analyses: [
        {
          id: "analysis-demo-11-1",
          analysisDate: dateDaysAgo(2),
          createdAt: isoDaysAgo(2),
          sleepScore: 76,
          wellnessScore: 78,
          metrics: sampleMetrics(76),
          result: sampleResult(
            "松本 さくら",
            dateDaysAgo(2),
            78,
            "全体は良好。次回は週末のリズム維持を確認しましょう。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-11-1",
              label: "Sleep Wellness Visual Report",
              createdAt: isoDaysAgo(2),
            },
          ],
        },
      ],
    },
    {
      id: "client-demo-12",
      name: "井上 誠",
      registeredAt: isoDaysAgo(55),
      age: 53,
      gender: "male",
      tags: ["企業契約", "血圧"],
      analyses: [
        {
          id: "analysis-demo-12-1",
          analysisDate: dateDaysAgo(8),
          createdAt: isoDaysAgo(8),
          sleepScore: 66,
          wellnessScore: 68,
          metrics: sampleMetrics(66, {
            restingHeartRate: "62 bpm",
            spo2: "95%",
          }),
          result: sampleResult(
            "井上 誠",
            dateDaysAgo(8),
            68,
            "回復は中程度。入浴と就寝の間隔を整えると深睡眠が増えそうです。",
          ),
          pdfHistory: [],
        },
      ],
    },
  ];
}

/** 初回のみダミークライアントを投入 */
export function ensureClientSeedData(): StoredClient[] {
  const existing = readRawClients();
  if (existing.length > 0) return existing;

  if (!canUseStorage()) return buildSeedClients();

  const alreadySeeded = localStorage.getItem(SEED_FLAG_KEY) === "1";
  if (alreadySeeded) return existing;

  const seeded = buildSeedClients();
  writeClients(seeded);
  localStorage.setItem(SEED_FLAG_KEY, "1");
  return seeded;
}

export function loadClients(): StoredClient[] {
  return ensureClientSeedData();
}

export function getClientById(id: string): StoredClient | null {
  const client = loadClients().find((item) => item.id === id);
  if (!client) return null;
  return {
    ...client,
    analyses: sortAnalyses(client.analyses),
  };
}

export function getClientListItems(): ClientListItem[] {
  return loadClients()
    .map((client) => {
      const latest = sortAnalyses(client.analyses)[0];
      return {
        id: client.id,
        name: client.name,
        registeredAt: client.registeredAt,
        latestSleepScore: latest?.sleepScore ?? latest?.wellnessScore ?? null,
        latestAnalysisDate: latest?.analysisDate ?? null,
        tags: client.tags ?? [],
        searchText: buildClientSearchText(client),
      };
    })
    .sort((a, b) => {
      const aDate = a.latestAnalysisDate ?? a.registeredAt;
      const bDate = b.latestAnalysisDate ?? b.registeredAt;
      return bDate.localeCompare(aDate);
    });
}

/** 2件以上の分析があり比較可能なクライアント */
export function getComparableClients(): StoredClient[] {
  return loadClients()
    .map((client) => ({
      ...client,
      analyses: sortAnalyses(client.analyses),
    }))
    .filter((client) => client.analyses.length >= 2)
    .sort((a, b) => {
      const aDate = a.analyses[0]?.analysisDate ?? a.registeredAt;
      const bDate = b.analyses[0]?.analysisDate ?? b.registeredAt;
      return bDate.localeCompare(aDate);
    });
}

/**
 * 新規クライアント登録。氏名必須。
 * 同名が既にあれば既存を返す（分析は上書きしない）。
 */
export function createClient(input: CreateClientInput): StoredClient {
  const name = input.name.trim();
  if (!name) {
    throw new Error("氏名は必須です。");
  }

  const clients = loadClients();
  const existing = clients.find(
    (item) => normalizeName(item.name) === normalizeName(name),
  );
  if (existing) {
    return {
      ...existing,
      analyses: sortAnalyses(existing.analyses),
    };
  }

  const registeredAt =
    asOptionalString(input.registeredAt) || new Date().toISOString().slice(0, 10);

  const client: StoredClient = {
    id: createId("client"),
    name,
    registeredAt,
    nameKana: asOptionalString(input.nameKana),
    birthDate: asOptionalString(input.birthDate),
    gender: asOptionalString(input.gender),
    age: parseOptionalInt(input.age),
    heightCm: parseOptionalFloat(input.heightCm),
    weightKg: parseOptionalFloat(input.weightKg),
    medications: asOptionalString(input.medications),
    drinkingHabit: asOptionalString(input.drinkingHabit),
    exerciseHabit: asOptionalString(input.exerciseHabit),
    snoringNasal: asOptionalString(input.snoringNasal),
    medicalHistory: asOptionalString(input.medicalHistory),
    email: asOptionalString(input.email),
    phone: asOptionalString(input.phone),
    memo: asOptionalString(input.memo),
    tags: asOptionalTags(input.tags),
    analyses: [],
  };

  clients.push(client);
  writeClients(clients);
  return client;
}

/** クライアントを削除（ローカル）。紐づく分析履歴もまとめて消える。 */
export function deleteClient(clientId: string): boolean {
  const clients = loadClients();
  const next = clients.filter((item) => item.id !== clientId);
  if (next.length === clients.length) return false;
  writeClients(next);
  return true;
}

/** 既存クライアントの基本情報を更新（ローカル） */
export function updateClientProfile(
  clientId: string,
  input: Partial<CreateClientInput>,
): StoredClient | null {
  const clients = loadClients();
  const index = clients.findIndex((item) => item.id === clientId);
  if (index < 0) return null;

  const current = clients[index];
  const next: StoredClient = {
    ...current,
    name:
      input.name !== undefined && input.name.trim()
        ? input.name.trim()
        : current.name,
    nameKana:
      input.nameKana !== undefined
        ? asOptionalString(input.nameKana)
        : current.nameKana,
    birthDate:
      input.birthDate !== undefined
        ? asOptionalString(input.birthDate)
        : current.birthDate,
    gender:
      input.gender !== undefined
        ? asOptionalString(input.gender)
        : current.gender,
    age: input.age !== undefined ? parseOptionalInt(input.age) : current.age,
    heightCm:
      input.heightCm !== undefined
        ? parseOptionalFloat(input.heightCm)
        : current.heightCm,
    weightKg:
      input.weightKg !== undefined
        ? parseOptionalFloat(input.weightKg)
        : current.weightKg,
    medications:
      input.medications !== undefined
        ? asOptionalString(input.medications)
        : current.medications,
    drinkingHabit:
      input.drinkingHabit !== undefined
        ? asOptionalString(input.drinkingHabit)
        : current.drinkingHabit,
    exerciseHabit:
      input.exerciseHabit !== undefined
        ? asOptionalString(input.exerciseHabit)
        : current.exerciseHabit,
    snoringNasal:
      input.snoringNasal !== undefined
        ? asOptionalString(input.snoringNasal)
        : current.snoringNasal,
    medicalHistory:
      input.medicalHistory !== undefined
        ? asOptionalString(input.medicalHistory)
        : current.medicalHistory,
    email:
      input.email !== undefined ? asOptionalString(input.email) : current.email,
    phone:
      input.phone !== undefined ? asOptionalString(input.phone) : current.phone,
    memo: input.memo !== undefined ? asOptionalString(input.memo) : current.memo,
    tags:
      input.tags !== undefined ? asOptionalTags(input.tags) : current.tags,
  };

  clients[index] = next;
  writeClients(clients);
  return next;
}

export function analysisSleepScore(analysis: StoredAnalysis): number | null {
  if (typeof analysis.sleepScore === "number" && Number.isFinite(analysis.sleepScore)) {
    return analysis.sleepScore;
  }
  if (
    typeof analysis.wellnessScore === "number" &&
    Number.isFinite(analysis.wellnessScore)
  ) {
    return analysis.wellnessScore;
  }
  return null;
}

export type SaveAnalysisPayload = {
  result: AnalysisResult;
};

export type SavedAnalysisRef = {
  clientId: string;
  analysisId: string;
};

/**
 * 分析完了時にクライアントへ保存。
 * clientId があればそのクライアントへ紐づけ、なければ同名検索→新規登録。
 */
export function saveAnalysisToClientStore(
  result: AnalysisResult,
): SavedAnalysisRef | null {
  if (!canUseStorage()) return null;

  const clients = loadClients();
  const existingAnalysisId = result.analysisId?.trim();
  if (existingAnalysisId) {
    for (const client of clients) {
      const existing = client.analyses.find(
        (analysis) => analysis.id === existingAnalysisId,
      );
      if (existing) {
        const ref: SavedAnalysisRef = {
          clientId: client.id,
          analysisId: existing.id,
        };
        rememberLastSavedAnalysisRef(ref);
        return ref;
      }
    }
  }

  const name = result.clientName?.trim() || "未設定";
  const analysisDate =
    result.measurementDate?.trim() || new Date().toISOString().slice(0, 10);
  const createdAt = new Date().toISOString();
  const metrics = normalizeMetrics(result.metrics);
  const sleepScore =
    typeof metrics.sleepScore === "number" && Number.isFinite(metrics.sleepScore)
      ? metrics.sleepScore
      : null;

  let client =
    (result.clientId
      ? clients.find((item) => item.id === result.clientId)
      : undefined) ??
    clients.find((item) => normalizeName(item.name) === normalizeName(name));

  if (!client) {
    client = {
      id: result.clientId?.trim() || createId("client"),
      name,
      registeredAt: createdAt,
      analyses: [],
    };
    clients.push(client);
  }

  // 分析時に入力した基本情報をクライアントへ反映
  client.age = parseOptionalInt(result.age) ?? client.age;
  client.gender = asOptionalString(result.gender) ?? client.gender;
  client.heightCm = parseOptionalFloat(result.heightCm) ?? client.heightCm;
  client.weightKg = parseOptionalFloat(result.weightKg) ?? client.weightKg;
  client.medications =
    asOptionalString(result.medications) ?? client.medications;
  client.drinkingHabit =
    asOptionalString(result.drinkingHabit) ?? client.drinkingHabit;
  client.exerciseHabit =
    asOptionalString(result.exerciseHabit) ?? client.exerciseHabit;
  client.snoringNasal =
    asOptionalString(result.snoringNasal) ?? client.snoringNasal;
  client.medicalHistory =
    asOptionalString(result.medicalHistory) ?? client.medicalHistory;

  const analysisId = createId("analysis");
  const analysis: StoredAnalysis = {
    id: analysisId,
    analysisDate,
    createdAt,
    sleepScore,
    wellnessScore: result.score,
    metrics,
    structured: buildStructuredMetrics(metrics, result.graphs),
    result: {
      ...result,
      metrics,
      clientId: client.id,
      clientName: name,
      measurementDate: analysisDate,
      analysisId,
    },
    pdfHistory: [
      {
        id: createId("pdf"),
        label: "Sleep Wellness Medical Report",
        createdAt,
      },
      {
        id: createId("pdf"),
        label: "Sleep Wellness Visual Report",
        createdAt,
      },
    ],
  };

  client.analyses = sortAnalyses([analysis, ...client.analyses]);
  writeClients(clients);

  const ref: SavedAnalysisRef = {
    clientId: client.id,
    analysisId,
  };
  rememberLastSavedAnalysisRef(ref);

  return ref;
}

export function rememberLastSavedAnalysisRef(ref: SavedAnalysisRef): void {
  if (!canUseStorage()) return;
  try {
    sessionStorage.setItem(LAST_SAVE_KEY, JSON.stringify(ref));
  } catch {
    // ignore quota / private mode
  }
}

export function loadLastSavedAnalysisRef(): SavedAnalysisRef | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(LAST_SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedAnalysisRef;
    if (
      typeof parsed?.clientId === "string" &&
      typeof parsed?.analysisId === "string"
    ) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function recordPdfDownload(
  clientId: string,
  analysisId: string,
  label = "PDFダウンロード",
): void {
  if (!canUseStorage()) return;

  const clients = loadClients();
  const client = clients.find((item) => item.id === clientId);
  if (!client) return;

  const analysis = client.analyses.find((item) => item.id === analysisId);
  if (!analysis) return;

  analysis.pdfHistory = [
    {
      id: createId("pdf"),
      label,
      createdAt: new Date().toISOString(),
    },
    ...analysis.pdfHistory,
  ];

  writeClients(clients);
}

/** ローカル保存の分析結果に「AI宿題」を反映（達成率も保存） */
export function updateAnalysisRecommendationsUntilNext(
  analysisId: string,
  goals: NextActionGoal[],
): boolean {
  if (!canUseStorage()) return false;

  const clients = loadClients();
  const normalized = normalizeRecommendationsUntilNext(goals);
  const homeworkAchievement = computeHomeworkAchievement(normalized);
  let found = false;

  for (const client of clients) {
    const analysis = client.analyses.find((item) => item.id === analysisId);
    if (!analysis) continue;
    analysis.result = {
      ...analysis.result,
      recommendationsUntilNext: normalized,
      homeworkAchievement,
      analysisId,
      clientId: client.id,
    };
    found = true;
    break;
  }

  if (!found) return false;
  writeClients(clients);
  return true;
}

export function formatDisplayDate(value?: string | null): string {
  if (!value?.trim()) return "—";
  const iso = value.trim();
  const dayMatch = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dayMatch) {
    return `${dayMatch[1]}.${dayMatch[2]}.${dayMatch[3]}`;
  }
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, "0");
  const d = String(parsed.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}
