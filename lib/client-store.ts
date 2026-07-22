import {
  normalizeMetrics,
  type AnalysisMetrics,
  type AnalysisResult,
} from "@/lib/analysis-session";
import {
  buildStructuredMetrics,
  type StructuredSleepMetrics,
} from "@/lib/soxai-structured-metrics";

const STORAGE_KEY = "swij-clients-v1";
const SEED_FLAG_KEY = "swij-clients-seeded-v1";
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
  analyses: StoredAnalysis[];
};

export type ClientListItem = {
  id: string;
  name: string;
  registeredAt: string;
  latestSleepScore: number | null;
  latestAnalysisDate: string | null;
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
    if (!seed || client.analyses.length >= 2) return client;
    return {
      ...client,
      analyses: sortAnalyses(seed.analyses),
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
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
  window.dispatchEvent(new Event("swij-clients-updated"));
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
    sleepAnalysis:
      "今回確認できた睡眠時間と睡眠効率、深い睡眠・REM・覚醒のバランスを関連づけると、睡眠の連続性に整える余地がある可能性があります。HRVや安静時心拍、SpO₂、体内時計もあわせて見ると、回復の土台は保たれつつ、入眠前後の切り替えが睡眠負債や覚醒に影響している可能性があります。単日のため、数日の推移確認が大切です。",
    autonomicAssessment:
      "HRV・安静時心拍・測定ストレスをあわせて見ると、今回は交感神経寄りに傾いている可能性と、休息側への切り替え余地が同時に見えます。単独指標での断定はせず、生活リズムとあわせた推移確認が有用です。",
    recoveryAssessment:
      "睡眠の質・身体回復・疲労回復の観点では、深い睡眠と効率の数値が回復の土台を支えている一方、覚醒や睡眠負債がある場合は翌日の疲労感につながりやすい可能性があります。単日評価のため、回復の傾向は連続データで確かめましょう。",
    improvements: [
      "優先1：入眠前60分の光刺激を抑え、切り替え時間をつくる",
      "優先2：3:6呼吸で副交感神経側への切り替えを促す",
      "優先3：就寝90〜60分前のぬるめ入浴で体温リズムを整える",
      "優先4：翌朝同じ時刻に起き、朝の光を数分取り入れる",
    ],
    melatoninYoga:
      "メラトニンヨガ™の視点では、今回は光・呼吸・入浴の整えが中心になります。就寝前は強い光を控え、3:6呼吸で神経系の切り替えを促し、必要に応じてぬるめの入浴と短い瞑想を組み合わせます。無理に眠ろうとせず、身体感覚を整えることを目的とします。",
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
    metrics: sampleMetrics(score),
    caution: "単日データのため、数日の推移も確認しましょう。",
    disclaimer:
      "本レポートは睡眠ウェルネス支援であり、医療診断・治療を代替しません。",
    clientName: name,
    measurementDate: date,
  });

  return [
    {
      id: "client-demo-yamada",
      name: "山田 太郎",
      registeredAt: isoDaysAgo(45),
      analyses: [
        {
          id: "analysis-demo-yamada-1",
          analysisDate: dateDaysAgo(3),
          createdAt: isoDaysAgo(3),
          sleepScore: 82,
          wellnessScore: 84,
          metrics: sampleMetrics(82),
          result: sampleResult(
            "山田 太郎",
            dateDaysAgo(3),
            84,
            "今回のデータでは、回復指標が安定し、全体として良い夜でした。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-yamada-1",
              label: "Sleep Wellness Medical Report",
              createdAt: isoDaysAgo(3),
            },
          ],
        },
        {
          id: "analysis-demo-yamada-2",
          analysisDate: dateDaysAgo(17),
          createdAt: isoDaysAgo(17),
          sleepScore: 74,
          wellnessScore: 76,
          metrics: sampleMetrics(74, { stress: "41", hrv: "34 ms" }),
          result: sampleResult(
            "山田 太郎",
            dateDaysAgo(17),
            76,
            "やや緊張の残る夜でしたが、睡眠時間自体は確保できています。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-yamada-2",
              label: "Sleep Wellness Medical Report",
              createdAt: isoDaysAgo(17),
            },
          ],
        },
        {
          id: "analysis-demo-yamada-3",
          analysisDate: dateDaysAgo(31),
          createdAt: isoDaysAgo(31),
          sleepScore: 79,
          wellnessScore: 80,
          metrics: sampleMetrics(79),
          result: sampleResult(
            "山田 太郎",
            dateDaysAgo(31),
            80,
            "ステージバランスは整い始めており、前向きな推移です。",
          ),
          pdfHistory: [],
        },
      ],
    },
    {
      id: "client-demo-sato",
      name: "佐藤 美咲",
      registeredAt: isoDaysAgo(28),
      analyses: [
        {
          id: "analysis-demo-sato-1",
          analysisDate: dateDaysAgo(5),
          createdAt: isoDaysAgo(5),
          sleepScore: 88,
          wellnessScore: 90,
          metrics: sampleMetrics(88, {
            sleepEfficiency: "91%",
            deepSleepRate: "21%",
          }),
          result: sampleResult(
            "佐藤 美咲",
            dateDaysAgo(5),
            90,
            "深い睡眠と効率が高く、回復の質が良い夜でした。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-sato-1",
              label: "Sleep Wellness Visual Report",
              createdAt: isoDaysAgo(5),
            },
          ],
        },
        {
          id: "analysis-demo-sato-2",
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
              id: "pdf-demo-sato-2",
              label: "Sleep Wellness Medical Report",
              createdAt: isoDaysAgo(19),
            },
          ],
        },
      ],
    },
    {
      id: "client-demo-suzuki",
      name: "鈴木 健",
      registeredAt: isoDaysAgo(35),
      analyses: [
        {
          id: "analysis-demo-suzuki-1",
          analysisDate: dateDaysAgo(1),
          createdAt: isoDaysAgo(1),
          sleepScore: 82,
          wellnessScore: 84,
          metrics: sampleMetrics(82, {
            sleepDuration: "7時間12分",
            sleepEfficiency: "90%",
            deepSleep: "1時間22分",
            deepSleepRate: "20%",
            awakenings: "22分",
            awakeningRate: "5%",
            sleepLatency: "9分",
            hrv: "48 ms",
            restingHeartRate: "54 bpm",
            stress: "24",
          }),
          result: sampleResult(
            "鈴木 健",
            dateDaysAgo(1),
            84,
            "睡眠スコアと深睡眠が改善し、回復の質が高い夜でした。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-suzuki-1",
              label: "Sleep Wellness Medical Report",
              createdAt: isoDaysAgo(1),
            },
          ],
        },
        {
          id: "analysis-demo-suzuki-2",
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
            "鈴木 健",
            dateDaysAgo(14),
            73,
            "睡眠負債とストレスがやや高めです。生活リズムの調整余地があります。",
          ),
          pdfHistory: [
            {
              id: "pdf-demo-suzuki-2",
              label: "Sleep Wellness Medical Report",
              createdAt: isoDaysAgo(14),
            },
          ],
        },
        {
          id: "analysis-demo-suzuki-3",
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
            "鈴木 健",
            dateDaysAgo(28),
            67,
            "入眠潜時と中途覚醒が多く、回復が十分に得られにくい夜でした。",
          ),
          pdfHistory: [],
        },
      ],
    },
    {
      id: "client-demo-tanaka",
      name: "田中 優子",
      nameKana: "たなか ゆうこ",
      registeredAt: isoDaysAgo(60),
      memo: "要フォロー確認用デモ",
      analyses: [
        {
          id: "analysis-demo-tanaka-1",
          analysisDate: dateDaysAgo(35),
          createdAt: isoDaysAgo(35),
          sleepScore: 55,
          wellnessScore: 58,
          metrics: sampleMetrics(55, {
            sleepDuration: "5時間20分",
            sleepEfficiency: "74%",
            awakenings: "1時間18分",
            awakeningRate: "22%",
            spo2: "93%",
            deepSleep: "38分",
            deepSleepRate: "12%",
            sleepLatency: "32分",
            hrv: "28 ms",
            restingHeartRate: "68 bpm",
            stress: "58",
            sleepDebt: "-2時間10分",
          }),
          result: sampleResult(
            "田中 優子",
            dateDaysAgo(35),
            58,
            "睡眠スコアとSpO₂、中途覚醒にフォローの余地があります。",
          ),
          pdfHistory: [],
        },
        {
          id: "analysis-demo-tanaka-2",
          analysisDate: dateDaysAgo(48),
          createdAt: isoDaysAgo(48),
          sleepScore: 62,
          wellnessScore: 64,
          metrics: sampleMetrics(62, {
            awakenings: "52分",
            awakeningRate: "14%",
            spo2: "95%",
            stress: "44",
          }),
          result: sampleResult(
            "田中 優子",
            dateDaysAgo(48),
            64,
            "やや改善の兆しはあるものの、回復はまだ安定していません。",
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
    analyses: [],
  };

  clients.push(client);
  writeClients(clients);
  return client;
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
