import { ASANA_BY_ID } from "@/lib/data/practice/asana";
import { BATH_BY_ID } from "@/lib/data/practice/bathing";
import {
  BREATHING_BY_ID,
  isNightForbiddenBreathing,
} from "@/lib/data/practice/breathing";
import { SEQUENCE_BY_ID } from "@/lib/data/practice/sequences";
import type {
  ChallengeTypeId,
  Contraindication,
  NonEmptyArray,
  PracticeMetrics,
  PracticePrescription,
  PrescriptionCard,
  SequenceBlock,
} from "@/lib/data/practice/types";

const CHALLENGE_PRIORITY: readonly ChallengeTypeId[] = [
  "onset",
  "midwake",
  "rhythm",
  "recovery",
  "deep",
];

const TYPE_LABEL: Record<ChallengeTypeId, string> = {
  onset: "入眠困難型",
  midwake: "中途覚醒型",
  rhythm: "リズム不規則型",
  recovery: "自律神経回復不足型",
  deep: "深睡眠不足型",
  maintenance: "良好維持型",
};

export const CHALLENGE_TYPE_DESCRIPTION: Partial<
  Record<ChallengeTypeId, string>
> = {
  maintenance: "今の状態が保てています。習慣を維持しましょう",
};

const TYPE_BATH: Record<ChallengeTypeId, string> = {
  onset: "calm-38-20",
  midwake: "basic-40-10",
  rhythm: "basic-40-10",
  recovery: "calm-38-20",
  deep: "basic-40-10",
  maintenance: "basic-40-10",
};

const TYPE_NIGHT_BREATH: Record<ChallengeTypeId, string> = {
  onset: "chandra-bhedana",
  midwake: "chandra-bhedana",
  rhythm: "chandra-bhedana",
  recovery: "exhale-extension",
  deep: "chandra-bhedana",
  maintenance: "chandra-bhedana",
};

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function toCautionLines(
  items: NonEmptyArray<Contraindication>,
): NonEmptyArray<string> {
  const [firstItem, ...restItems] = items;
  const toLine = (item: Contraindication) =>
    item.note ? `${item.condition}：${item.note}` : item.condition;
  return [toLine(firstItem), ...restItems.map(toLine)];
}

export function detectChallengeTypes(metrics: PracticeMetrics): ChallengeTypeId[] {
  const hits: ChallengeTypeId[] = [];

  if (isFiniteNumber(metrics.sleepLatencyMinutes) && metrics.sleepLatencyMinutes >= 30) {
    hits.push("onset");
  }

  const midwakeByEfficiency =
    isFiniteNumber(metrics.sleepEfficiencyPercent) &&
    metrics.sleepEfficiencyPercent < 85;
  const midwakeByWakeMinutes =
    isFiniteNumber(metrics.wakeMinutes) && metrics.wakeMinutes >= 45;
  if (midwakeByEfficiency || midwakeByWakeMinutes) {
    hits.push("midwake");
  }

  if (
    isFiniteNumber(metrics.bedtimeVariabilityMinutes) &&
    metrics.bedtimeVariabilityMinutes >= 60
  ) {
    hits.push("rhythm");
  }

  const lowHrv = isFiniteNumber(metrics.hrvMs) && metrics.hrvMs < 30;
  const highHr = isFiniteNumber(metrics.restingHrBpm) && metrics.restingHrBpm >= 80;
  if (lowHrv || highHr) {
    hits.push("recovery");
  }

  if (
    isFiniteNumber(metrics.deepSleepRatioPercent) &&
    metrics.deepSleepRatioPercent < 13
  ) {
    hits.push("deep");
  }

  return CHALLENGE_PRIORITY.filter((id) => hits.includes(id));
}

function pickChallengeTypes(metrics: PracticeMetrics): NonEmptyArray<ChallengeTypeId> {
  const detected = detectChallengeTypes(metrics).slice(0, 2);
  if (detected.length >= 2) {
    return [detected[0], detected[1]];
  }
  if (detected.length === 1) {
    return [detected[0]];
  }
  return ["maintenance"];
}

function requireBreathing(id: string) {
  const item = BREATHING_BY_ID[id];
  if (!item) {
    throw new Error(`Unknown breathing id: ${id}`);
  }
  return item;
}

function requireBath(id: string) {
  const item = BATH_BY_ID[id];
  if (!item) {
    throw new Error(`Unknown bath protocol id: ${id}`);
  }
  return item;
}

function asanaNames(ids: readonly string[]): string {
  return ids
    .map((id) => ASANA_BY_ID[id]?.nameJa ?? id)
    .join(" → ");
}

function formatSequenceBlock(block: SequenceBlock): string {
  const duration = block.durationHint ? ` ${block.durationHint}` : "";

  if (block.kind === "breathing") {
    const heading = block.title.replace(/（[^）]*）/g, "").trim();
    return `${heading}${duration}`;
  }

  if (block.asanaIds?.length === 1) {
    const asanaName = ASANA_BY_ID[block.asanaIds[0]]?.nameJa ?? block.asanaIds[0];
    if (asanaName.includes(block.title)) {
      return `${asanaName}${duration}`;
    }
  }

  if (block.asanaIds?.length) {
    return `${block.title}${duration}（${asanaNames(block.asanaIds)}）`;
  }

  return `${block.title}${duration}`;
}

function nightBreathCard(
  breathingId: string,
  emphasized: boolean,
): PrescriptionCard {
  if (isNightForbiddenBreathing(breathingId)) {
    throw new Error(`Night prescription must not emit ${breathingId}`);
  }
  const breath = requireBreathing(breathingId);
  return {
    id: "night-breath",
    title: "今夜の呼吸",
    philosophy:
      "夜は活性の呼吸を使わず、吐き終わりの静けさを入口にする。次の吸気を急がないことが、眠りへの切り替えになる。",
    steps: breath.steps,
    dosageBadges: [
      breath.nameJa,
      breath.ratio ?? "呼気を長めに",
      breath.dosage,
    ],
    cautions: toCautionLines(breath.contraindications),
    sourceNote: breath.sourceNote,
    emphasized,
  };
}

function nightMovementCard(
  primary: ChallengeTypeId,
  emphasized: boolean,
): PrescriptionCard {
  const sequence = SEQUENCE_BY_ID["melatonin-yoga-night"];
  const blockLine = sequence.blocks.map(formatSequenceBlock).join(" → ");

  const extra: string[] =
    primary === "midwake"
      ? [
          "中途覚醒型のため、動きは短縮してよい。座位と仰臥位を丁寧に行う。",
          "自律訓練法の重感・温感はそのまま行い、このまま眠る場合は消去動作をせず休みます。",
        ]
      : primary === "deep"
        ? ["深睡眠不足型のため、前半の膝立ち・座位を丁寧に行い、刺激は小さく保つ。"]
        : primary === "recovery"
          ? ["シャヴァーサナは5分まで延長してよい。動きはゆるく保つ。"]
          : [];

  return {
    id: "night-movement",
    title: "今夜の動き",
    philosophy:
      "メラトニンヨガ™は、昼の間のヨガ™から立位を外し、身体を休息モードへ戻すための夜の流れである。",
    steps: [
      `メラトニンヨガ™（夜）を ${sequence.durationHint} で行う。`,
      `順序：${blockLine}`,
      "各ポーズのあいだに静止2〜3呼吸の「間」を入れる。",
      ...extra,
      "呼吸法と締めの呼吸は、上の『今夜の呼吸』のとおりに行う。",
    ],
    dosageBadges: [sequence.nameJa, sequence.durationHint, "座位・仰臥位のみ"],
    cautions: [
      "痛み・めまいが出たら直ちに中止する。",
      "転倒しそうなときは壁や椅子を使う。",
    ],
    emphasized,
  };
}

function dayPracticeCard(
  primary: ChallengeTypeId,
  secondary: ChallengeTypeId | undefined,
  emphasized: boolean,
): PrescriptionCard {
  const sequence = SEQUENCE_BY_ID["ma-no-yoga-day"];
  const standing = asanaNames([
    "trikonasana",
    "parsvakonasana",
    "virabhadrasana-ii",
    "parsvottanasana",
    "virabhadrasana-i",
  ]);

  const extras: string[] = [];
  if (primary === "rhythm" || secondary === "rhythm") {
    extras.push(
      "起床後に日光を浴び、朝の活性シャワー（42℃・5分）のあと、スーリヤベーダナを8〜12呼吸行う。",
    );
  }
  if (primary === "deep" || secondary === "deep") {
    extras.push("日中の活動量を確保する。立位は手順2の順序どおり行う。");
  }
  if (primary === "recovery") {
    extras.push("強度を落とす。立位バランスは壁を使い、戦士のポーズは膝の曲げを浅くする。");
  }
  if (primary === "midwake") {
    extras.push("昼は短時間でもよい。ウォームアップから座位・仰臥位まで一通り行ったら、そのあとの呼吸法・自律訓練法・瞑想は短縮してよい。");
  }

  return {
    id: "day-practice",
    title: "今日の昼",
    philosophy:
      "昼の間のヨガ™で活動モードを十分に立ち上げると、夜の切り替えがしやすくなる。",
    steps: [
      `間のヨガ™（昼）を ${sequence.durationHint} で行う。`,
      `立位は順序を厳守する: ${standing}。`,
      "呼吸法：スーリヤベーダナ（またはウジャイ）。続いて自律訓練法（日中は消去動作を必ず行う）。最後に呼気延長 吸4：吐6。",
      "数息観（吐く息を10まで数える瞑想）3〜5分、シャヴァーサナ 3〜5分。",
      ...(extras.length > 0
        ? extras
        : ["日中に一度、身体を動かしてから夜のルーティンへ入る。"]),
    ],
    dosageBadges: [sequence.nameJa, sequence.durationHint, "立位を含む"],
    cautions: [
      "めまい・膝痛があるときは壁や椅子を使う。",
    ],
    emphasized,
  };
}

function bathCard(
  protocolId: string,
  primary: ChallengeTypeId,
  emphasized: boolean,
): PrescriptionCard {
  const bath = requireBath(protocolId);

  const steps: string[] = [...bath.steps];
  if (primary === "rhythm") {
    steps.push("毎日同じ時刻に入る。時刻をずらさないことが処方の中心である。");
  } else if (primary === "deep") {
    steps.push("就寝2時間前までに入浴を完了させる。");
  }
  if (bath.preYoga.length > 0) {
    steps.push(`お風呂前：${asanaNames(bath.preYoga)}。`);
  }
  if (bath.inBath && bath.inBath.length > 0) {
    steps.push(`お風呂の中：${asanaNames(bath.inBath)}。`);
  }
  if (bath.postYoga.length > 0) {
    steps.push(`お風呂後：${asanaNames(bath.postYoga)}。`);
  }
  steps.push("お風呂のあとは、上の『今夜の呼吸』を行う。");

  const [firstStep, ...restSteps] = steps;
  if (!firstStep) {
    throw new Error(`Bath protocol ${protocolId} has no steps`);
  }

  return {
    id: "bath",
    title: "お風呂",
    philosophy:
      "一度温めてから静かに冷えていく過程が、眠りへの「間」になる。ぬるめの湯を使う。",
    steps: [firstStep, ...restSteps],
    dosageBadges: [bath.nameJa, bath.temperature, bath.duration, bath.timing],
    cautions: bath.cautions,
    sourceNote: bath.sourceNote,
    emphasized,
  };
}

function emphasizedCardId(primary: ChallengeTypeId): PrescriptionCard["id"] {
  switch (primary) {
    case "onset":
    case "recovery":
      return "night-breath";
    case "midwake":
      return "night-movement";
    case "rhythm":
    case "maintenance":
      return "bath";
    case "deep":
      return "day-practice";
  }
}

export function getPrescription(metrics: PracticeMetrics): PracticePrescription {
  const challengeTypes = pickChallengeTypes(metrics);
  const primary = challengeTypes[0];
  const secondary = challengeTypes[1];
  const nightBreathingId = TYPE_NIGHT_BREATH[primary];
  const bathProtocolId = TYPE_BATH[primary];

  if (isNightForbiddenBreathing(nightBreathingId)) {
    throw new Error(`Night prescription must not emit ${nightBreathingId}`);
  }

  const focus = emphasizedCardId(primary);
  const cards = [
    nightBreathCard(nightBreathingId, focus === "night-breath"),
    nightMovementCard(primary, focus === "night-movement"),
    dayPracticeCard(primary, secondary, focus === "day-practice"),
    bathCard(bathProtocolId, primary, focus === "bath"),
  ] as const;

  return {
    challengeTypes,
    nightBreathingId,
    nightSequenceId: "melatonin-yoga-night",
    daySequenceId: "ma-no-yoga-day",
    bathProtocolId,
    cards,
  };
}

export const CHALLENGE_TYPE_LABEL = TYPE_LABEL;
