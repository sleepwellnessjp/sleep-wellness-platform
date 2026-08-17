/**
 * 実践提案（処方）の単一情報源（SSOT）型。
 * 分析結果ページ・A4・将来のLPは、この型とカタログだけを参照する。
 * 既存の解析エンジン・公式処方 Ver.1 の計算は変更しない。
 */

export type TimeOfDay = "morning" | "daytime" | "evening" | "night";

export type NonEmptyArray<T> = readonly [T, ...T[]];

export type ContraindicationSeverity = "avoid" | "caution";

export type Contraindication = {
  condition: string;
  severity: ContraindicationSeverity;
  note?: string;
};

export type BreathingSource = "hatha-yoga-pradipika" | "traditional-later" | "modern";

export type KumbhakaPolicy = "none" | "natural";

export type AsanaCategory =
  | "supine"
  | "kneeling"
  | "balance"
  | "standing"
  | "seated"
  | "chair"
  | "in-bath";

export type BreathingTechnique = {
  id: string;
  nameJa: string;
  nameSa?: string;
  bookName?: string;
  source: BreathingSource;
  sourceNote: string;
  effect: string;
  timeOfDay: NonEmptyArray<TimeOfDay>;
  steps: NonEmptyArray<string>;
  dosage: string;
  ratio?: string;
  kumbhaka: KumbhakaPolicy;
  contraindications: NonEmptyArray<Contraindication>;
  maNote: string;
};

export type Asana = {
  id: string;
  nameJa: string;
  nameSa: string;
  category: AsanaCategory;
  hold: string;
  maPause: string;
  cues: NonEmptyArray<string>;
  modifications: NonEmptyArray<string>;
  contraindications: NonEmptyArray<Contraindication>;
};

export type BathProtocol = {
  id: string;
  nameJa: string;
  purpose: string;
  temperature: string;
  duration: string;
  style: string;
  timing: string;
  steps: NonEmptyArray<string>;
  preYoga: readonly string[];
  inBath?: readonly string[];
  postYoga: readonly string[];
  postBreathing: NonEmptyArray<string>;
  cautions: NonEmptyArray<string>;
  sourceNote: string;
  maNote: string;
  options?: {
    aroma?: string;
  };
};

export type SequenceBlockKind =
  | "asana"
  | "breathing"
  | "autogenic"
  | "meditation"
  | "savasana"
  | "pause";

export type SequenceBlock = {
  id: string;
  letter: string;
  title: string;
  kind: SequenceBlockKind;
  durationHint?: string;
  asanaIds?: readonly string[];
  breathingIds?: readonly string[];
  meditationId?: string;
  note?: string;
};

export type PracticeSequence = {
  id: "ma-no-yoga-day" | "melatonin-yoga-night";
  nameJa: string;
  timeOfDay: TimeOfDay;
  durationHint: string;
  blocks: NonEmptyArray<SequenceBlock>;
  forbiddenBreathingIds: readonly string[];
};

export type AutogenicScript = {
  id: string;
  nameJa: string;
  timeOfDay: NonEmptyArray<TimeOfDay>;
  steps: NonEmptyArray<string>;
  dosage: string;
  cautions: NonEmptyArray<string>;
  maNote: string;
};

export type MeditationPractice = {
  id: string;
  nameJa: string;
  duration: string;
  timeOfDay: NonEmptyArray<TimeOfDay>;
  steps: NonEmptyArray<string>;
  cautions: NonEmptyArray<string>;
  sourceNote?: string;
  maNote: string;
};

/** 身体の訴えによる入浴上書きキー。今フェーズの自動選択では使わない。 */
export type BathComplaintKey =
  | "lowback"
  | "shoulder"
  | "legs"
  | "no_tub"
  | "no_time";

export type ChallengeTypeId =
  | "onset" // A 入眠困難型
  | "midwake" // B 中途覚醒型
  | "rhythm" // C リズム不規則型
  | "recovery" // D 自律神経回復不足型
  | "deep" // E 深睡眠不足型
  | "maintenance"; // 良好維持型

/** 接続前の入力。数値は分・％・回数など正規化済みを想定。 */
export type PracticeMetrics = {
  bedtimeVariabilityMinutes?: number | null;
  sleepEfficiencyPercent?: number | null;
  deepSleepRatioPercent?: number | null;
  remRatioPercent?: number | null;
  /** 覚醒時間（分）。回数ではない */
  wakeMinutes?: number | null;
  sleepLatencyMinutes?: number | null;
  restingHrBpm?: number | null;
  hrvMs?: number | null;
  respiratoryRate?: number | null;
};

export type PrescriptionCardId = "night-breath" | "night-movement" | "day-practice" | "bath";

export type PrescriptionCard = {
  id: PrescriptionCardId;
  title: string;
  philosophy: string;
  steps: NonEmptyArray<string>;
  dosageBadges: NonEmptyArray<string>;
  cautions: NonEmptyArray<string>;
  sourceNote?: string;
  emphasized: boolean;
};

export type PracticePrescription = {
  challengeTypes: NonEmptyArray<ChallengeTypeId>;
  nightBreathingId: string;
  nightSequenceId: "melatonin-yoga-night";
  daySequenceId: "ma-no-yoga-day";
  bathProtocolId: string;
  cards: readonly [
    PrescriptionCard,
    PrescriptionCard,
    PrescriptionCard,
    PrescriptionCard,
  ];
};
